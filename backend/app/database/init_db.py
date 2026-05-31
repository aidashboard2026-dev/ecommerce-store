from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.admin import Admin
from app.models.order import Order
from app.core.config import settings
from app.core.security import get_password_hash
from datetime import datetime, timedelta, timezone
import logging

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
        initial_orders = [
            Order(
                order_number="ORD-1048",
                customer="Priya Kumar",
                items=3,
                total=249.99,
                status="processing",
                payment="Paid",
                ordered_at=week_start + timedelta(days=0, hours=10),
            ),
            Order(
                order_number="ORD-1047",
                customer="Arun Patel",
                items=1,
                total=89.50,
                status="shipped",
                payment="Paid",
                ordered_at=week_start + timedelta(days=1, hours=12),
            ),
            Order(
                order_number="ORD-1046",
                customer="Nisha Rao",
                items=5,
                total=412.00,
                status="delivered",
                payment="Paid",
                ordered_at=week_start + timedelta(days=2, hours=15),
            ),
            Order(
                order_number="ORD-1045",
                customer="Kiran Shah",
                items=2,
                total=128.75,
                status="pending",
                payment="COD",
                ordered_at=week_start + timedelta(days=3, hours=9),
            ),
            Order(
                order_number="ORD-1044",
                customer="Kiran Shah",
                items=2,
                total=128.75,
                status="cancelled",
                payment="COD",
                ordered_at=week_start + timedelta(days=4, hours=9),
            ),
        ]

        for order in initial_orders:
            existing_order = db.query(Order).filter(Order.order_number == order.order_number).first()
            if not existing_order:
                db.add(order)

        logger.info("Initial orders synced")

        db.commit()
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        db.rollback()
        
        raise

    finally:
        db.close()
