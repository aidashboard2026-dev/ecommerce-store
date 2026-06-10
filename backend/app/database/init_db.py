from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.admin import Admin
from app.models.order import Order
from app.models.product import Product, ProductVariant, ProductStatus
from app.core.config import settings
from app.core.security import get_password_hash
from datetime import datetime, timedelta, timezone
import logging
import re

logger = logging.getLogger(__name__)

def _validate_initial_admin_settings() -> tuple[str, str, str]:
    email = settings.INITIAL_ADMIN_EMAIL.strip()
    password = settings.INITIAL_ADMIN_PASSWORD
    name = settings.INITIAL_ADMIN_NAME.strip() or "Administrator"

    if not email or not password:
        raise RuntimeError(
            "INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set before starting the backend."
        )

    return name, email, password


def _make_slug(title: str) -> str:
    """Simple slug generator for seeding."""
    slug = title.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    return re.sub(r"-+", "-", slug).strip("-")


def _seed_demo_products(db: Session) -> None:
    """Seed 5 demo products with variants. Idempotent — skips if products exist."""

    # Skip if any non-deleted products already exist
    existing = db.query(Product).filter(Product.deleted_at.is_(None)).count()
    if existing > 0:
        logger.info(f"Products already seeded ({existing} found), skipping")
        return

    demo_products = [
        {
            "title": "Classic Black Oversized Tee",
            "description": "Premium heavyweight cotton oversized t-shirt with drop shoulders. Perfect for streetwear layering.",
            "collection": "Oversized",
            "tags": ["cotton", "streetwear", "oversized", "bestseller"],
            "status": ProductStatus.published,
            "is_featured": True,
            "variants": [
                {"size": "M", "color": "Black", "color_hex": "#1A1A1A", "sku": "CBOT-BLK-M-001", "original_price": 999, "selling_price": 799, "stock_quantity": 25, "low_stock_threshold": 5},
                {"size": "L", "color": "Black", "color_hex": "#1A1A1A", "sku": "CBOT-BLK-L-001", "original_price": 999, "selling_price": 799, "stock_quantity": 18, "low_stock_threshold": 5},
                {"size": "XL", "color": "Black", "color_hex": "#1A1A1A", "sku": "CBOT-BLK-XL-001", "original_price": 999, "selling_price": 799, "stock_quantity": 12, "low_stock_threshold": 5},
            ],
        },
        {
            "title": "White Minimal Crew Neck",
            "description": "Clean white crew neck tee made from 100% organic cotton. Minimalist design for everyday wear.",
            "collection": "Essentials",
            "tags": ["organic", "minimal", "crew-neck", "basics"],
            "status": ProductStatus.published,
            "is_featured": False,
            "variants": [
                {"size": "S", "color": "White", "color_hex": "#FAFAFA", "sku": "WMCN-WHT-S-001", "original_price": 699, "selling_price": 599, "stock_quantity": 30, "low_stock_threshold": 5},
                {"size": "M", "color": "White", "color_hex": "#FAFAFA", "sku": "WMCN-WHT-M-001", "original_price": 699, "selling_price": 599, "stock_quantity": 22, "low_stock_threshold": 5},
            ],
        },
        {
            "title": "Navy Acid Wash Hoodie",
            "description": "Acid-washed fleece hoodie in deep navy. Features kangaroo pocket and ribbed cuffs.",
            "collection": "Streetwear",
            "tags": ["hoodie", "acid-wash", "fleece", "winter"],
            "status": ProductStatus.published,
            "is_featured": True,
            "variants": [
                {"size": "M", "color": "Navy", "color_hex": "#1B2A4A", "sku": "NAWH-NVY-M-001", "original_price": 1999, "selling_price": 1599, "stock_quantity": 15, "low_stock_threshold": 3},
                {"size": "L", "color": "Navy", "color_hex": "#1B2A4A", "sku": "NAWH-NVY-L-001", "original_price": 1999, "selling_price": 1599, "stock_quantity": 10, "low_stock_threshold": 3},
                {"size": "XL", "color": "Navy", "color_hex": "#1B2A4A", "sku": "NAWH-NVY-XL-001", "original_price": 1999, "selling_price": 1599, "stock_quantity": 8, "low_stock_threshold": 3},
            ],
        },
        {
            "title": "Olive Cargo Joggers",
            "description": "Relaxed fit cargo joggers with multiple utility pockets. Elastic waist and cuffed ankles.",
            "collection": "Bottoms",
            "tags": ["joggers", "cargo", "utility", "relaxed-fit"],
            "status": ProductStatus.draft,
            "is_featured": False,
            "variants": [
                {"size": "M", "color": "Olive", "color_hex": "#556B2F", "sku": "OCJ-OLV-M-001", "original_price": 1499, "selling_price": 1299, "stock_quantity": 20, "low_stock_threshold": 5},
                {"size": "L", "color": "Olive", "color_hex": "#556B2F", "sku": "OCJ-OLV-L-001", "original_price": 1499, "selling_price": 1299, "stock_quantity": 14, "low_stock_threshold": 5},
            ],
        },
        {
            "title": "Tie-Dye Summer Tank",
            "description": "Vibrant tie-dye tank top for summer. Lightweight breathable fabric with a loose fit.",
            "collection": "Summer",
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

        product = Product(
            slug=slug,
            **prod_data,
        )
        db.add(product)
        db.flush()  # Get product.id for variants

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

    logger.info("5 demo products with variants seeded successfully")


def init_db() -> None:
    name, email, password = _validate_initial_admin_settings()

    db: Session = SessionLocal()
    try:
        admin = db.query(Admin).filter(Admin.email == email).first()
        if not admin:
            admin = Admin(
                name=name,
                email=email,
                password_hash=get_password_hash(password),
                role="superadmin",
            )
            db.add(admin)

            logger.info("Default admins created")
        else:
            # logger.info("Database already initialized")
            admin.name = name
            admin.password_hash = get_password_hash(password)
            admin.role = "superadmin"
            logger.info("Initial admin account updated")

        now = datetime.now(timezone.utc)
        week_start = now - timedelta(days=now.weekday())
        # initial_orders = [
        #     Order(
        #         order_number="ORD-1048",
        #         customer="Priya Kumar",
        #         items=3,
        #         total=249.99,
        #         status="processing",
        #         payment="Paid",
        #         ordered_at=week_start + timedelta(days=0, hours=10),
        #     ),
        #     Order(
        #         order_number="ORD-1047",
        #         customer="Arun Patel",
        #         items=1,
        #         total=89.50,
        #         status="shipped",
        #         payment="Paid",
        #         ordered_at=week_start + timedelta(days=1, hours=12),
        #     ),
        #     Order(
        #         order_number="ORD-1046",
        #         customer="Nisha Rao",
        #         items=5,
        #         total=412.00,
        #         status="delivered",
        #         payment="Paid",
        #         ordered_at=week_start + timedelta(days=2, hours=15),
        #     ),
        #     Order(
        #         order_number="ORD-1045",
        #         customer="Kiran Shah",
        #         items=2,
        #         total=128.75,
        #         status="pending",
        #         payment="COD",
        #         ordered_at=week_start + timedelta(days=3, hours=9),
        #     ),
        #     Order(
        #         order_number="ORD-1044",
        #         customer="Kiran Shah",
        #         items=2,
        #         total=128.75,
        #         status="cancelled",
        #         payment="COD",
        #         ordered_at=week_start + timedelta(days=4, hours=9),
        #     ),
        # ]
        initial_orders = [
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
                ordered_at=week_start + timedelta(days=0, hours=10),
            )
        ]
        for order in initial_orders:
            existing_order = db.query(Order).filter(Order.order_number == order.order_number).first()
            if not existing_order:
                db.add(order)

        logger.info("Initial orders synced")

        # Seed demo products (idempotent)
        _seed_demo_products(db)

        db.commit()
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        db.rollback()
        
        raise

    finally:
        db.close()

