"""
seed_customers.py
-----------------
Inserts 5 realistic sample customers into AdminDash Pro.

TWO ways to run this:
  1. Via the REST API (recommended — works from any machine):
         python seed_customers.py --via-api
         # uses: BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD  (see CONFIG below)

  2. Directly against the database (run inside Docker or with DB access):
         python seed_customers.py
         # uses: DATABASE_URL  (see CONFIG below)
"""

import argparse
import sys

# ─── CONFIG — adjust these before running ─────────────────────────────────────
BASE_URL       = "http://localhost:8000"        # your FastAPI base URL
ADMIN_EMAIL    = "admin@mail.com"
ADMIN_PASSWORD = "admin1234"

DATABASE_URL   = (                              # only used for direct DB mode
    "postgresql://admin:adminpass123@localhost:5432/admindb"
)
# ──────────────────────────────────────────────────────────────────────────────

SAMPLE_CUSTOMERS = [
    {
        "first_name": "Priya",
        "last_name":  "Sharma",
        "email":      "priya.sharma@example.com",
        "phone":      "+91 98765 43210",
        "dob":        "1992-04-15",
        "city":       "Mumbai",
        "state":      "Maharashtra",
        "country":    "India",
        "tags":       ["vip", "repeat-buyer"],
        "notes":      "Prefers express delivery. Birthday in April — send coupon.",
    },
    {
        "first_name": "Arjun",
        "last_name":  "Mehta",
        "email":      "arjun.mehta@example.com",
        "phone":      "+91 91234 56789",
        "dob":        "1988-11-30",
        "city":       "Bangalore",
        "state":      "Karnataka",
        "country":    "India",
        "tags":       ["wholesale", "b2b"],
        "notes":      "Bulk buyer — negotiated 10% standing discount on orders > ₹50k.",
    },
    {
        "first_name": "Sara",
        "last_name":  "Khan",
        "email":      "sara.khan@example.com",
        "phone":      "+91 99887 76655",
        "dob":        "1995-07-22",
        "city":       "Delhi",
        "state":      "Delhi",
        "country":    "India",
        "tags":       ["new"],
        "notes":      None,
    },
    {
        "first_name": "Rohan",
        "last_name":  "Nair",
        "email":      "rohan.nair@example.com",
        "phone":      "+91 88001 23456",
        "dob":        "1990-02-08",
        "city":       "Kochi",
        "state":      "Kerala",
        "country":    "India",
        "tags":       ["returner", "vip"],
        "notes":      "Had a return in Dec 2024 (sizing). Follow up on next order.",
    },
    {
        "first_name": "Divya",
        "last_name":  "Patel",
        "email":      "divya.patel@example.com",
        "phone":      "+91 70001 99988",
        "dob":        "1997-09-14",
        "city":       "Ahmedabad",
        "state":      "Gujarat",
        "country":    "India",
        "tags":       ["influencer", "gifted"],
        "notes":      "Social media collab — track gifted orders separately.",
    },
]


# ─── MODE 1: REST API ──────────────────────────────────────────────────────────

def seed_via_api():
    try:
        import requests
    except ImportError:
        sys.exit("requests library not found. Run: pip install requests")

    session = requests.Session()

    # Login
    print(f"Logging in as {ADMIN_EMAIL} …")
    resp = session.post(
        f"{BASE_URL}/api/v1/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=10,
    )
    if resp.status_code not in (200, 204):
        sys.exit(f"Login failed ({resp.status_code}): {resp.text}")
    
    token = resp.json().get("access_token")
    if not token:
        sys.exit("Login failed: access_token not found in response.")
    session.headers.update({"Authorization": f"Bearer {token}"})

    print("  + Logged in\n")

    ok, skip, fail = 0, 0, 0
    for c in SAMPLE_CUSTOMERS:
        name = f"{c['first_name']} {c['last_name']}"
        r = session.post(
            f"{BASE_URL}/api/v1/customers/",
            json=c,
            timeout=10,
        )
        if r.status_code == 201:
            cid = r.json().get("id", "?")
            print(f"  +  Created  [{cid:>3}]  {name}")
            ok += 1
        elif r.status_code == 409:
            print(f"  -  Skipped        {name}  (already exists)")
            skip += 1
        else:
            print(f"  x  Failed         {name}  ({r.status_code}: {r.text[:120]})")
            fail += 1

    print(f"\nDone — {ok} created, {skip} skipped, {fail} failed.")


# ─── MODE 2: Direct DB ────────────────────────────────────────────────────────

def seed_direct():
    try:
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
    except ImportError:
        sys.exit("sqlalchemy not installed. Run: pip install sqlalchemy psycopg2-binary")

    try:
        from datetime import date
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        Session = sessionmaker(bind=engine)
        db = Session()
    except Exception as e:
        sys.exit(f"DB connection failed: {e}")

    # Import model dynamically so we don't need the full app on PATH
    import importlib, sys as _sys
    import os
    backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "backend"))
    if backend_path not in _sys.path:
        _sys.path.insert(0, backend_path)

    from app.models.customer import Customer  # noqa

    def _tags_str(tags):
        if not tags:
            return None
        return ",".join(sorted({t.strip().lower() for t in tags if t.strip()}))

    ok, skip, fail = 0, 0, 0
    for c in SAMPLE_CUSTOMERS:
        name = f"{c['first_name']} {c['last_name']}"
        exists = db.query(Customer).filter(Customer.email == c["email"].lower()).first()
        if exists:
            print(f"  -  Skipped  [{exists.id:>3}]  {name}  (already exists)")
            skip += 1
            continue
        try:
            dob = date.fromisoformat(c["dob"]) if c.get("dob") else None
            customer = Customer(
                first_name=c["first_name"].strip(),
                last_name=c["last_name"].strip(),
                email=c["email"].lower(),
                phone=c.get("phone"),
                dob=dob,
                city=c.get("city"),
                state=c.get("state"),
                country=c.get("country"),
                tags=_tags_str(c.get("tags")),
                notes=c.get("notes"),
                is_active=True,
                password_hash="",
            )
            db.add(customer)
            db.commit()
            db.refresh(customer)
            print(f"  +  Created  [{customer.id:>3}]  {name}")
            ok += 1
        except Exception as e:
            db.rollback()
            print(f"  x  Failed         {name}  ({e})")
            fail += 1

    db.close()
    print(f"\nDone — {ok} created, {skip} skipped, {fail} failed.")


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed 5 sample customers into AdminDash Pro")
    parser.add_argument(
        "--via-api",
        action="store_true",
        help="Use the REST API (default: direct DB insert)",
    )
    args = parser.parse_args()

    if args.via_api:
        print("=== Seeding via REST API ===\n")
        seed_via_api()
    else:
        print("=== Seeding directly into DB ===\n")
        seed_direct()