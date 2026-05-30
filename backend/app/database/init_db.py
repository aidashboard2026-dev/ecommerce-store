from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.admin import Admin
from app.core.config import settings
from app.core.security import get_password_hash
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

        db.commit()
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        db.rollback()
        
        raise

    finally:
        db.close()
