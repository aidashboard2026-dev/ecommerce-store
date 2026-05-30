from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.admin import Admin
from app.core.security import get_password_hash
import logging

logger = logging.getLogger(__name__)


def init_db() -> None:
    db: Session = SessionLocal()
    try:
        # Check if super admin exists
        admin = db.query(Admin).filter(Admin.email == "admin@admindash.com").first()
        if not admin:
            admin = Admin(
                name="Super Admin",
                email="admin@admindash.com",
                password_hash=get_password_hash("admin123"),
                role="superadmin",
            )
            db.add(admin)

            # Add a regular admin
            admin2 = Admin(
                name="Jane Smith",
                email="jane@admindash.com",
                password_hash=get_password_hash("jane123"),
                role="admin",
            )
            db.add(admin2)
            db.commit()
            logger.info("Default admins created")
        else:
            logger.info("Database already initialized")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()
