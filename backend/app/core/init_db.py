"""
app/database/init_db.py

Startup seeding script — runs once per container boot via entrypoint.sh.
All functions are idempotent: safe to call on every restart.
"""

import logging
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.core.database import SessionLocal
from app.modules.admins.models import Admin

logger = logging.getLogger(__name__)


def _validate_initial_admin_settings() -> tuple[str, str, str]:
    email    = settings.INITIAL_ADMIN_EMAIL.strip()
    password = settings.INITIAL_ADMIN_PASSWORD
    name     = settings.INITIAL_ADMIN_NAME.strip() or "Administrator"

    if not email or not password:
        raise RuntimeError(
            "INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set before starting the backend."
        )
    return name, email, password


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
            admin.name = name
            admin.role = "superadmin"
            logger.info("Initial admin account verified (password unchanged)")

        # ── 2. Clean up notification settings ──────────────────────────────────
        from app.modules.settings.models import NotificationSetting
        from app.modules.settings.service import DEFAULT_NOTIFICATIONS
        allowed_names = {n["event_name"] for n in DEFAULT_NOTIFICATIONS}
        deleted_count = db.query(NotificationSetting).filter(
            NotificationSetting.event_name.notin_(allowed_names)
        ).delete(synchronize_session=False)
        if deleted_count > 0:
            logger.info(f"Pruned {deleted_count} obsolete notification settings from database on startup.")

        db.commit()
        logger.info("init_db complete")

    except Exception as e:
        logger.error(f"init_db failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()
