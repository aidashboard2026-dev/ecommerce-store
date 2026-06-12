"""
Fix Orders: Remove invalid seed records and insert 6 valid orders.
Run inside the backend Docker container or with direct DB access.

Usage:
  docker compose exec backend python /app/../fix_orders_seed.py
  — or —
  Copy into backend container and run with python.
"""

import sys
import os

# ── Bootstrap the backend package so we can reuse its DB session ──────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine, text

# Build the database URL from environment (matches docker-compose)
DB_USER = os.getenv("POSTGRES_USER", "admin")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "admin123")
DB_HOST = os.getenv("POSTGRES_SERVER", "localhost")
DB_NAME = os.getenv("POSTGRES_DB", "admindb")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL)

# ── Step 1: Delete invalid orders ─────────────────────────────────────────────
with engine.begin() as conn:
    result = conn.execute(text(
        "DELETE FROM orders WHERE customer_name IS NULL OR product_name IS NULL"
    ))
    deleted_count = result.rowcount
    print(f"[1/3] Deleted {deleted_count} invalid order(s) with NULL customer_name or product_name.")

# ── Step 2: Insert 6 valid orders ─────────────────────────────────────────────
now = datetime.now(timezone.utc)

orders = [
    # Order 1 — PAID / DELIVERED
    {
        "order_number": "ORD-20260610-001",
        "ordered_at": now - timedelta(days=7),
        "customer_name": "Karthik Sundaram",
        "customer_email": "karthik.sundaram@gmail.com",
        "customer_phone": "9876543210",
        "address_line1": "12, North Mada Street, Mylapore",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "country": "India",
        "pincode": "600004",
        "product_name": "Classic Black T-Shirt",
        "product_image": "",
        "size": "L",
        "color": "Black",
        "quantity": 2,
        "price": 799.0,
        "total_amount": 1598.0,  # 2 × 799
        "payment_method": "UPI",
        "payment_status": "PAID",
        "tracking_status": "DELIVERED",
        "tracking_note": "Delivered to customer doorstep",
        "delivery_days": 3,
        "expected_delivery_date": (now - timedelta(days=7)) + timedelta(days=3),
    },
    # Order 2 — PAID / SHIPPED
    {
        "order_number": "ORD-20260611-002",
        "ordered_at": now - timedelta(days=3),
        "customer_name": "Priya Natarajan",
        "customer_email": "priya.natarajan@yahoo.com",
        "customer_phone": "9845012345",
        "address_line1": "45, Avinashi Road, Peelamedu",
        "city": "Coimbatore",
        "state": "Tamil Nadu",
        "country": "India",
        "pincode": "641004",
        "product_name": "Oversized White Hoodie",
        "product_image": "",
        "size": "XL",
        "color": "White",
        "quantity": 1,
        "price": 1499.0,
        "total_amount": 1499.0,  # 1 × 1499
        "payment_method": "Credit Card",
        "payment_status": "PAID",
        "tracking_status": "SHIPPED",
        "tracking_note": "In transit via BlueDart — AWB #BD987654321",
        "delivery_days": 4,
        "expected_delivery_date": (now - timedelta(days=3)) + timedelta(days=4),
    },
    # Order 3 — PENDING / PROCESSING
    {
        "order_number": "ORD-20260612-003",
        "ordered_at": now - timedelta(days=1),
        "customer_name": "Muthu Krishnan",
        "customer_email": "muthu.k@outlook.com",
        "customer_phone": "9790123456",
        "address_line1": "78, Sathyamangalam Road",
        "city": "Erode",
        "state": "Tamil Nadu",
        "country": "India",
        "pincode": "638001",
        "product_name": "Navy Polo T-Shirt",
        "product_image": "",
        "size": "M",
        "color": "Navy Blue",
        "quantity": 3,
        "price": 899.0,
        "total_amount": 2697.0,  # 3 × 899
        "payment_method": "COD",
        "payment_status": "PENDING",
        "tracking_status": "PROCESSING",
        "tracking_note": "Order is being prepared for dispatch",
        "delivery_days": 4,
        "expected_delivery_date": (now - timedelta(days=1)) + timedelta(days=4),
    },
    # Order 4 — PAID / OUT_FOR_DELIVERY
    {
        "order_number": "ORD-20260611-004",
        "ordered_at": now - timedelta(days=4),
        "customer_name": "Lakshmi Venkatesh",
        "customer_email": "lakshmi.v@gmail.com",
        "customer_phone": "9443012789",
        "address_line1": "33, Teppakulam, East Main Street",
        "city": "Madurai",
        "state": "Tamil Nadu",
        "country": "India",
        "pincode": "625001",
        "product_name": "Graphic Print Crew Neck",
        "product_image": "",
        "size": "S",
        "color": "Charcoal Grey",
        "quantity": 1,
        "price": 1199.0,
        "total_amount": 1199.0,  # 1 × 1199
        "payment_method": "Debit Card",
        "payment_status": "PAID",
        "tracking_status": "OUT_FOR_DELIVERY",
        "tracking_note": "Out for delivery — expected by evening",
        "delivery_days": 6,
        "expected_delivery_date": (now - timedelta(days=4)) + timedelta(days=6),
    },
    # Order 5 — FAILED / PLACED
    {
        "order_number": "ORD-20260612-005",
        "ordered_at": now,
        "customer_name": "Rajesh Babu",
        "customer_email": "rajesh.babu@gmail.com",
        "customer_phone": "9362045678",
        "address_line1": "102, Bharathiar Street, Cantonment",
        "city": "Trichy",
        "state": "Tamil Nadu",
        "country": "India",
        "pincode": "620001",
        "product_name": "Striped Casual Shirt",
        "product_image": "",
        "size": "L",
        "color": "Blue Stripe",
        "quantity": 2,
        "price": 999.0,
        "total_amount": 1998.0,  # 2 × 999
        "payment_method": "UPI",
        "payment_status": "FAILED",
        "tracking_status": "PLACED",
        "tracking_note": "Payment failed — awaiting retry",
        "delivery_days": 4,
        "expected_delivery_date": now + timedelta(days=4),
    },
    # Order 6 — PAID / CANCELLED
    {
        "order_number": "ORD-20260610-006",
        "ordered_at": now - timedelta(days=5),
        "customer_name": "Deepa Ramalingam",
        "customer_email": "deepa.r@hotmail.com",
        "customer_phone": "9865034567",
        "address_line1": "56, Anna Nagar, 2nd Cross Street",
        "city": "Salem",
        "state": "Tamil Nadu",
        "country": "India",
        "pincode": "636004",
        "product_name": "Acid Wash Denim Jacket",
        "product_image": "",
        "size": "M",
        "color": "Indigo",
        "quantity": 1,
        "price": 2499.0,
        "total_amount": 2499.0,  # 1 × 2499
        "payment_method": "Credit Card",
        "payment_status": "PAID",
        "tracking_status": "CANCELLED",
        "tracking_note": "Cancelled by customer — refund initiated",
        "delivery_days": 5,
        "expected_delivery_date": (now - timedelta(days=5)) + timedelta(days=5),
    },
]

INSERT_SQL = text("""
INSERT INTO orders (
    order_number, ordered_at, customer_name, customer_email, customer_phone,
    address_line1, city, state, country, pincode,
    product_name, product_image, size, color, quantity, price, total_amount,
    payment_method, payment_status, tracking_status, tracking_note,
    delivery_days, expected_delivery_date, created_at, updated_at
) VALUES (
    :order_number, :ordered_at, :customer_name, :customer_email, :customer_phone,
    :address_line1, :city, :state, :country, :pincode,
    :product_name, :product_image, :size, :color, :quantity, :price, :total_amount,
    :payment_method, :payment_status, :tracking_status, :tracking_note,
    :delivery_days, :expected_delivery_date, :created_at, :updated_at
)
""")

inserted = 0
with engine.begin() as conn:
    for o in orders:
        # Check if order_number already exists (idempotent)
        exists = conn.execute(
            text("SELECT 1 FROM orders WHERE order_number = :on"),
            {"on": o["order_number"]}
        ).fetchone()
        if exists:
            print(f"   ⏭  Skipped {o['order_number']} (already exists)")
            continue

        conn.execute(INSERT_SQL, {
            **o,
            "created_at": now,
            "updated_at": now,
        })
        inserted += 1
        print(f"   ✅ Inserted {o['order_number']}  —  {o['tracking_status']} / {o['payment_status']}")

print(f"\n[2/3] Inserted {inserted} valid order(s).")

# ── Step 3: Validation ────────────────────────────────────────────────────────
with engine.connect() as conn:
    row = conn.execute(text(
        "SELECT COUNT(*) FROM orders WHERE customer_name IS NULL OR product_name IS NULL"
    )).fetchone()
    null_count = row[0]

    total = conn.execute(text("SELECT COUNT(*) FROM orders")).fetchone()[0]

print(f"\n[3/3] Validation:")
print(f"   Orders with NULL customer_name or product_name: {null_count}")
print(f"   Total orders in table: {total}")

if null_count == 0:
    print("\n✅ All clear — no NULL required fields. Orders API should return 200 OK.")
else:
    print("\n❌ WARNING: There are still orders with NULL required fields!")

print("\n── Summary ──")
print(f"  Invalid orders removed:  {deleted_count}")
print(f"  Valid orders inserted:   {inserted}")
print(f"  Files modified:          0 (script-only, no schema/model/migration changes)")
print(f"  Database structure:      UNCHANGED")
