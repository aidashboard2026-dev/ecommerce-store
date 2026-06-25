"""
app/database/init_db.py

Startup seeding script — runs once per container boot via entrypoint.sh.
All functions are idempotent: safe to call on every restart.

Execution order
───────────────
1. Validate admin settings
2. Create / update the initial superadmin account
3. Seed master categories   ← NEW
4. Seed master collections  ← NEW
5. Migrate legacy Product.collection → collection_id FKs  ← NEW
6. Seed demo products (skipped if products already exist)
7. Seed demo orders
"""

import logging
import re
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.core.database import SessionLocal
from app.modules.admins.models import Admin
from app.modules.orders.models import Order
from app.modules.delivery_zones.models import DeliveryZone
from app.modules.products.models import Category, Collection, Product, ProductVariant, ProductStatus

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Slug helper (mirrors product_service._slugify)
# ─────────────────────────────────────────────────────────────

def _make_slug(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    return re.sub(r"-+", "-", slug).strip("-")


# ─────────────────────────────────────────────────────────────
# Admin validation
# ─────────────────────────────────────────────────────────────

def _validate_initial_admin_settings() -> tuple[str, str, str]:
    email    = settings.INITIAL_ADMIN_EMAIL.strip()
    password = settings.INITIAL_ADMIN_PASSWORD
    name     = settings.INITIAL_ADMIN_NAME.strip() or "Administrator"

    if not email or not password:
        raise RuntimeError(
            "INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set before starting the backend."
        )
    return name, email, password


# ─────────────────────────────────────────────────────────────
# TASK 5 — Master category seeding
# ─────────────────────────────────────────────────────────────

# Production master categories.
# Add / rename here; existing rows are never touched once created.
MASTER_CATEGORIES = [
    # sort_order controls homepage CategorySection tile order.
    # Product type is the top level; gender lives as collections underneath.
    {"name": "Track Pants",     "sort_order": 1},
    {"name": "Jerseys",         "sort_order": 2},
    {"name": "T-Shirts",        "sort_order": 3},
    {"name": "Custom Printing", "sort_order": 4},
]

def _seed_categories(db: Session) -> dict[str, int]:
    """
    Insert master categories that do not already exist.
    Returns a mapping of category name → id for use by the collection seeder
    and the migration step.
    Idempotent — safe to call on every restart.
    """
    existing = {c.name: c.id for c in db.query(Category.name, Category.id).all()}
    created = 0

    for cat_def in MASTER_CATEGORIES:
        if cat_def["name"] not in existing:
            slug = _make_slug(cat_def["name"])
            # Make slug unique if collision exists (shouldn't happen for master data)
            if db.query(Category.id).filter(Category.slug == slug).first():
                slug = f"{slug}-1"
            cat = Category(
                name=cat_def["name"],
                slug=slug,
                status="active",
                sort_order=cat_def["sort_order"],
            )
            db.add(cat)
            db.flush()          # get id without committing
            existing[cat.name] = cat.id
            created += 1

    if created:
        logger.info(f"Seeded {created} new categories")
    else:
        logger.info("Categories already up to date, skipping")

    return existing   # name → id


# ─────────────────────────────────────────────────────────────
# TASK 5 — Master collection seeding
# ─────────────────────────────────────────────────────────────

# Each collection can optionally be linked to a category by name.
# category_name=None means the collection has no parent category FK (nullable).
MASTER_COLLECTIONS = [
    # ── Track Pants ────────────────────────────────────────────────────────────
    {"name": "Men's Track Pants",   "category_name": "Track Pants"},
    {"name": "Women's Track Pants", "category_name": "Track Pants"},
    {"name": "Kids' Track Pants",   "category_name": "Track Pants"},

    # ── Jerseys ────────────────────────────────────────────────────────────────
    {"name": "Men's Jerseys",   "category_name": "Jerseys"},
    {"name": "Women's Jerseys", "category_name": "Jerseys"},
    {"name": "Kids' Jerseys",   "category_name": "Jerseys"},

    # ── T-Shirts ───────────────────────────────────────────────────────────────
    {"name": "Men's T-Shirts",   "category_name": "T-Shirts"},
    {"name": "Women's T-Shirts", "category_name": "T-Shirts"},
    {"name": "Kids' T-Shirts",   "category_name": "T-Shirts"},

    # ── Custom Printing ────────────────────────────────────────────────────────
    {"name": "Magic Cup",        "category_name": "Custom Printing"},
    {"name": "White Cup",        "category_name": "Custom Printing"},
    {"name": "Keychain",         "category_name": "Custom Printing"},
    {"name": "Embroidery Design","category_name": "Custom Printing"},
]

def _seed_collections(db: Session, category_map: dict[str, int]) -> dict[str, int]:
    """
    Insert master collections that do not already exist.
    Returns name → id mapping for the migration step.
    Idempotent — safe to call on every restart.
    """
    existing = {c.name: c.id for c in db.query(Collection.name, Collection.id).all()}
    created = 0

    for col_def in MASTER_COLLECTIONS:
        if col_def["name"] not in existing:
            slug = _make_slug(col_def["name"])
            if db.query(Collection.id).filter(Collection.slug == slug).first():
                slug = f"{slug}-1"
            cat_id = category_map.get(col_def.get("category_name", ""))
            col = Collection(
                name=col_def["name"],
                slug=slug,
                status="active",
                category_id=cat_id,
            )
            db.add(col)
            db.flush()
            existing[col.name] = col.id
            created += 1

    if created:
        logger.info(f"Seeded {created} new collections")
    else:
        logger.info("Collections already up to date, skipping")

    return existing   # name → id


# ─────────────────────────────────────────────────────────────
# TASK 4 — Migrate legacy Product.collection → collection_id
# ─────────────────────────────────────────────────────────────

def _migrate_legacy_collections(db: Session, collection_map: dict[str, int], category_map: dict[str, int]) -> None:
    """
    For every product whose collection_id is still NULL but whose legacy
    Product.collection field has a non-empty value, look up the matching
    Collection row (case-insensitive) and set collection_id.

    Additionally, if the matched Collection has a category_id and the
    product's category_id is still NULL, inherit it automatically.

    Idempotent — already-migrated products are skipped.
    No data loss — legacy Product.collection field is preserved.
    """
    # Build a case-insensitive lookup: lower(name) → id
    col_lower_map: dict[str, int] = {k.lower(): v for k, v in collection_map.items()}

    # Also fetch collection → category_id for the inheritance step
    col_cat_map: dict[int, int | None] = {
        c.id: c.category_id
        for c in db.query(Collection.id, Collection.category_id).all()
    }

    # Only migrate products that:
    #   - are not deleted
    #   - still have collection_id = NULL
    #   - have a non-empty legacy collection string
    products_to_migrate = (
        db.query(Product)
        .filter(
            Product.deleted_at.is_(None),
            Product.collection_id.is_(None),
            Product.collection.isnot(None),
            Product.collection != "",
        )
        .all()
    )

    migrated = 0
    for product in products_to_migrate:
        legacy_name = (product.collection or "").strip().lower()
        if not legacy_name:
            continue

        col_id = col_lower_map.get(legacy_name)
        if not col_id:
            # No exact match — try partial match (e.g. "oversized tee" → "Oversized")
            for col_name_lower, cid in col_lower_map.items():
                if col_name_lower in legacy_name or legacy_name in col_name_lower:
                    col_id = cid
                    break

        if col_id:
            product.collection_id = col_id

            # Inherit category from collection if product has none
            if not product.category_id:
                inherited_cat = col_cat_map.get(col_id)
                if inherited_cat:
                    product.category_id = inherited_cat

            migrated += 1

    if migrated:
        logger.info(f"Migrated {migrated} products: legacy collection → collection_id FK")
    else:
        logger.info("No products required legacy-collection migration")


# ─────────────────────────────────────────────────────────────
# Demo product seeding (runs only when products table is empty)
# ─────────────────────────────────────────────────────────────

def _seed_demo_products(db: Session, collection_map: dict[str, int], category_map: dict[str, int]) -> None:
    """
    Seed 5 demo products with variants.
    Idempotent — skips entirely if any non-deleted products already exist.
    Now seeds with correct category_id and collection_id FKs.
    """
    existing = db.query(Product).filter(Product.deleted_at.is_(None)).count()
    if existing > 0:
        logger.info(f"Products already seeded ({existing} found), skipping demo products")
        return

    # Resolve IDs from maps (fall back to None if master data wasn't seeded for some reason)
    tshirt_cat_id   = category_map.get("T-Shirts")
    jerseys_cat_id  = category_map.get("Jerseys")
    oversized_col   = collection_map.get("Oversized")
    essentials_col  = collection_map.get("Essentials")
    streetwear_col  = collection_map.get("Streetwear")
    summer_col      = collection_map.get("Summer")

    demo_products = [
        {
            "title":       "Classic Black Oversized Tee",
            "description": "Premium heavyweight cotton oversized t-shirt with drop shoulders. Perfect for streetwear layering.",
            "collection":  "Oversized",          # legacy field kept for backward compat
            "category_id":    tshirt_cat_id,
            "collection_id":  oversized_col,
            "tags": ["cotton", "streetwear", "oversized", "bestseller"],
            "status": ProductStatus.published,
            "is_featured": True,
            "variants": [
                {"size": "M",  "color": "Black", "color_hex": "#1A1A1A", "sku": "CBOT-BLK-M-001",  "original_price": 999,  "selling_price": 799,  "stock_quantity": 25, "low_stock_threshold": 5},
                {"size": "L",  "color": "Black", "color_hex": "#1A1A1A", "sku": "CBOT-BLK-L-001",  "original_price": 999,  "selling_price": 799,  "stock_quantity": 18, "low_stock_threshold": 5},
                {"size": "XL", "color": "Black", "color_hex": "#1A1A1A", "sku": "CBOT-BLK-XL-001", "original_price": 999,  "selling_price": 799,  "stock_quantity": 12, "low_stock_threshold": 5},
            ],
        },
        {
            "title":       "White Minimal Crew Neck",
            "description": "Clean white crew neck tee made from 100% organic cotton. Minimalist design for everyday wear.",
            "collection":  "Essentials",
            "category_id":    tshirt_cat_id,
            "collection_id":  essentials_col,
            "tags": ["organic", "minimal", "crew-neck", "basics"],
            "status": ProductStatus.published,
            "is_featured": False,
            "variants": [
                {"size": "S", "color": "White", "color_hex": "#FAFAFA", "sku": "WMCN-WHT-S-001", "original_price": 699, "selling_price": 599, "stock_quantity": 30, "low_stock_threshold": 5},
                {"size": "M", "color": "White", "color_hex": "#FAFAFA", "sku": "WMCN-WHT-M-001", "original_price": 699, "selling_price": 599, "stock_quantity": 22, "low_stock_threshold": 5},
            ],
        },
        {
            "title":       "Navy Acid Wash Hoodie",
            "description": "Acid-washed fleece hoodie in deep navy. Features kangaroo pocket and ribbed cuffs.",
            "collection":  "Streetwear",
            "category_id":    tshirt_cat_id,
            "collection_id":  streetwear_col,
            "tags": ["hoodie", "acid-wash", "fleece", "winter"],
            "status": ProductStatus.published,
            "is_featured": True,
            "variants": [
                {"size": "M",  "color": "Navy", "color_hex": "#1B2A4A", "sku": "NAWH-NVY-M-001",  "original_price": 1999, "selling_price": 1599, "stock_quantity": 15, "low_stock_threshold": 3},
                {"size": "L",  "color": "Navy", "color_hex": "#1B2A4A", "sku": "NAWH-NVY-L-001",  "original_price": 1999, "selling_price": 1599, "stock_quantity": 10, "low_stock_threshold": 3},
                {"size": "XL", "color": "Navy", "color_hex": "#1B2A4A", "sku": "NAWH-NVY-XL-001", "original_price": 1999, "selling_price": 1599, "stock_quantity": 8,  "low_stock_threshold": 3},
            ],
        },
        {
            "title":       "Olive Cargo Joggers",
            "description": "Relaxed fit cargo joggers with multiple utility pockets. Elastic waist and cuffed ankles.",
            "collection":  "Bottoms",
            "category_id":    None,    # no Bottoms category in master list — left unmapped
            "collection_id":  None,    # no Bottoms collection in master list — left unmapped
            "tags": ["joggers", "cargo", "utility", "relaxed-fit"],
            "status": ProductStatus.draft,
            "is_featured": False,
            "variants": [
                {"size": "M", "color": "Olive", "color_hex": "#556B2F", "sku": "OCJ-OLV-M-001", "original_price": 1499, "selling_price": 1299, "stock_quantity": 20, "low_stock_threshold": 5},
                {"size": "L", "color": "Olive", "color_hex": "#556B2F", "sku": "OCJ-OLV-L-001", "original_price": 1499, "selling_price": 1299, "stock_quantity": 14, "low_stock_threshold": 5},
            ],
        },
        {
            "title":       "Tie-Dye Summer Tank",
            "description": "Vibrant tie-dye tank top for summer. Lightweight breathable fabric with a loose fit.",
            "collection":  "Summer",
            "category_id":    tshirt_cat_id,
            "collection_id":  summer_col,
            "tags": ["tank-top", "tie-dye", "summer", "limited-edition"],
            "status": ProductStatus.archived,
            "is_featured": False,
            "variants": [
                {"size": "S", "color": "Multi", "color_hex": "#FF6B6B", "sku": "TDST-MLT-S-001", "original_price": 599, "selling_price": 399, "stock_quantity": 3, "low_stock_threshold": 5},
                {"size": "M", "color": "Multi", "color_hex": "#FF6B6B", "sku": "TDST-MLT-M-001", "original_price": 599, "selling_price": 399, "stock_quantity": 0, "low_stock_threshold": 5},
            ],
        },
    ]

    for prod_data in demo_products:
        variants_data = prod_data.pop("variants")
        slug = _make_slug(prod_data["title"])

        product = Product(slug=slug, **prod_data)
        db.add(product)
        db.flush()  # get product.id

        for v in variants_data:
            discount = round(((v["original_price"] - v["selling_price"]) / v["original_price"]) * 100, 2)
            variant = ProductVariant(
                product_id=product.id,
                size=v["size"],
                color=v["color"],
                color_hex=v["color_hex"],
                sku=v["sku"],
                original_price=v["original_price"],
                selling_price=v["selling_price"],
                discount_percentage=discount,
                stock_quantity=v["stock_quantity"],
                low_stock_threshold=v["low_stock_threshold"],
            )
            db.add(variant)

    logger.info("5 demo products with variants seeded (with category_id + collection_id FKs)")


# ─────────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────
# TASK 6 — Delivery zone seeding
# ─────────────────────────────────────────────────────────────

# Tamil Nadu city delivery estimates (business days from dispatch).
# Admin can override / extend via the /delivery-zones API without touching code.
MASTER_DELIVERY_ZONES = [
    ("Chennai", 3), ("Kanchipuram", 3),
    ("Coimbatore", 4), ("Trichy", 4), ("Erode", 4), ("Tiruppur", 4),
    ("Vellore", 4), ("Namakkal", 4), ("Karur", 4), ("Ranipet", 4),
    ("Salem", 5), ("Cuddalore", 5), ("Dharmapuri", 5), ("Krishnagiri", 5),
    ("Ariyalur", 5), ("Perambalur", 5), ("Tirupathur", 5),
    ("Madurai", 6), ("Sivagangai", 6), ("Nagapattinam", 6),
    ("Pudukkottai", 6), ("Nilgiris", 6), ("Mayiladuthurai", 6),
    ("Tirunelveli", 7), ("Thoothukudi", 7), ("Ramanathapuram", 7),
    ("Kanyakumari", 7), ("Virudhunagar", 6), ("Tenkasi", 7),
    ("Thanjavur", 5), ("Dindigul", 5),
]


def _seed_delivery_zones(db: Session) -> None:
    """
    Insert delivery zone records that do not already exist.
    Idempotent — existing zones are never overwritten so admin edits are safe.
    """
    existing_cities = {
        row[0].lower()
        for row in db.query(DeliveryZone.city).all()
    }
    created = 0
    for city, days in MASTER_DELIVERY_ZONES:
        if city.lower() not in existing_cities:
            db.add(DeliveryZone(city=city, delivery_days=days))
            created += 1
    if created:
        db.flush()
        logger.info(f"Seeded {created} new delivery zones")
    else:
        logger.info("Delivery zones already up to date, skipping")


# Main entry point
# ─────────────────────────────────────────────────────────────

def init_db() -> None:
    name, email, password = _validate_initial_admin_settings()

    db: Session = SessionLocal()
    try:
        # ── 1. Admin account ────────────────────────────────────────────────────
        admin = db.query(Admin).filter(Admin.email == email).first()
        if not admin:
            admin = Admin(
                name=name,
                email=email,
                password_hash=get_password_hash(password),
                role="superadmin",
            )
            db.add(admin)
            logger.info("Default superadmin created")
        else:
            admin.name          = name
            admin.password_hash = get_password_hash(password)
            admin.role          = "superadmin"
            logger.info("Initial admin account updated")

        # ── 2. Master categories ────────────────────────────────────────────────
        category_map = _seed_categories(db)

        # ── 3. Master collections ───────────────────────────────────────────────
        collection_map = _seed_collections(db, category_map)

        # ── 4. Delivery zones ───────────────────────────────────────────────────
        _seed_delivery_zones(db)

        # ── 5. Legacy migration ─────────────────────────────────────────────────
        # Must run AFTER collections are seeded so the FK targets exist.
        _migrate_legacy_collections(db, collection_map, category_map)

        # ── 6. Demo products (only if table is empty) ───────────────────────────
        _seed_demo_products(db, collection_map, category_map)

        # ── 7. Demo order ───────────────────────────────────────────────────────
        now      = datetime.now(timezone.utc)
        week_start = now - timedelta(days=now.weekday())
        demo_orders = [
            Order(
                order_number="ORD-1048",
                customer_name="Priya Kumar",
                customer_email="priya@test.com",
                customer_phone="9876543210",
                address_line1="Salem Main Road",
                city="Salem",
                state="Tamil Nadu",
                country="India",
                pincode="636305",
                product_name="Oversized Tee",
                size="M",
                color="Black",
                quantity=3,
                price=249.99,
                total_amount=749.97,
                payment_method="UPI",
                payment_status="PAID",
                tracking_status="PROCESSING",
                ordered_at=week_start + timedelta(hours=10),
            ),
        ]
        for order in demo_orders:
            if not db.query(Order).filter(Order.order_number == order.order_number).first():
                db.add(order)
        logger.info("Demo orders synced")

        db.commit()
        logger.info("init_db complete")

    except Exception as e:
        logger.error(f"init_db failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()
