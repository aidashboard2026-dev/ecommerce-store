import logging
import time
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.modules.admins.models import Admin
from app.shared.normalization import normalize_email

logger = logging.getLogger(__name__)


def authenticate_admin(db: Session, email: str, password: str):
    norm_email = normalize_email(email)
    admin = db.query(Admin).filter(Admin.email == norm_email).first()

    if not admin:
        logger.debug("Admin login failed: email not found (email=%s)", email)
        return None

    is_valid = verify_password(password, admin.password_hash)

    if not is_valid:
        logger.debug("Admin login failed: invalid password (email=%s)", email)
        return None

    return admin


def login_admin(db, email, password):
    t0 = time.perf_counter()

    admin = authenticate_admin(db, email, password)

    t1 = time.perf_counter()

    if not admin:
        return None

    admin.last_login_at = datetime.now(timezone.utc)

    db.commit()

    t2 = time.perf_counter()

    access_token = create_access_token(
        subject=admin.id,
        expires_delta=timedelta(
            minutes=settings.ADMIN_TOKEN_EXPIRE_MINUTES
        ),
        token_type="admin",
    )

    t3 = time.perf_counter()

    logger.info(
        "LOGIN TIMING | auth=%.2f ms | commit=%.2f ms | jwt=%.2f ms",
        (t1 - t0) * 1000,
        (t2 - t1) * 1000,
        (t3 - t2) * 1000,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "admin": admin,
    }


def _customer_password_auth_removed():
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail=(
            "Customer password authentication has been removed. "
            "Use Firebase Authentication."
        ),
    )


def register_customer(*args, **kwargs):
    _customer_password_auth_removed()


def login_customer(*args, **kwargs):
    _customer_password_auth_removed()


def request_password_reset(*args, **kwargs):
    _customer_password_auth_removed()


def reset_password(*args, **kwargs):
    _customer_password_auth_removed()
