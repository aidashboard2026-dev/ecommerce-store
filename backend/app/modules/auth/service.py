import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from fastapi import HTTPException, status

from app.modules.admins.models import Admin
from app.modules.customers.models import Customer
from app.core.security import verify_password, get_password_hash, create_access_token
from app.modules.auth.schemas import SignupRequest
from datetime import timedelta
from app.core.config import settings

logger = logging.getLogger(__name__)


# ── Admin auth ────────────────────────────────────────────────────────────────

def authenticate_admin(db: Session, email: str, password: str):
    admin = db.query(Admin).filter(Admin.email == email).first()

    if not admin:
        logger.debug("Admin login failed: email not found (email=%s)", email)
        return None

    is_valid = verify_password(password, admin.password_hash)

    if not is_valid:
        logger.debug("Admin login failed: invalid password (email=%s)", email)
        return None

    return admin
def login_admin(db: Session, email: str, password: str):
    admin = authenticate_admin(db, email, password)
    if not admin:
        return None

    # Record last login time
    admin.last_login_at = datetime.now(timezone.utc)
    db.commit()

    access_token = create_access_token(
        subject=admin.id,
        expires_delta=timedelta(minutes=settings.ADMIN_TOKEN_EXPIRE_MINUTES),
        token_type="admin",
    )
    return {"access_token": access_token, "token_type": "bearer", "admin": admin}


# ── Customer auth ─────────────────────────────────────────────────────────────

def register_customer(db: Session, signup_data: SignupRequest) -> Customer:
    """
    Create a new customer account.

    Checks for duplicate email before INSERT (fast-path), then catches
    IntegrityError on the unique constraint as a belt-and-suspenders guard
    against the TOCTOU race between two concurrent signups with the same email.

    Password is hashed with bcrypt via passlib — the plain-text password is
    never persisted.
    """
    # Fast-path duplicate check — avoids a bcrypt hash call on already-known dupes.
    existing = (
        db.query(Customer.id)
        .filter(Customer.email == signup_data.email)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    customer = Customer(
        first_name=signup_data.first_name.strip(),
        last_name=signup_data.last_name.strip(),
        email=signup_data.email,
        phone=signup_data.phone,
        dob=signup_data.dob,
        password_hash=get_password_hash(signup_data.password),
    )

    db.add(customer)

    try:
        db.commit()
        db.refresh(customer)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    except Exception:
        db.rollback()
        raise

    return customer


def login_customer(db: Session, email: str, password: str):
    """
    Authenticate a customer by email + password.
    Returns a dict with access_token (type='customer') and the customer object,
    or None if credentials are invalid.
    """
    customer = db.query(Customer).filter(Customer.email == email).first()
    if not customer:
        return None

    # Admin-created customers have no password (empty or None hash)
    if not customer.password_hash:
        return None

    if not verify_password(password, customer.password_hash):
        return None

    if not customer.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact support.",
        )

    # Record last login time
    customer.last_login_at = datetime.now(timezone.utc)
    db.commit()

    access_token = create_access_token(
        subject=customer.id,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        token_type="customer",
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "customer": customer,
    }


# ── Password reset ─────────────────────────────────────────────────────────────

import hashlib
import secrets


def _hash_reset_token(raw_token: str) -> str:
    """
    Hash a reset token before storing in DB.
    We store the hash, not the raw token — the URL carries the raw token.
    This way even if someone reads the DB they can't use it.
    """
    return hashlib.sha256(raw_token.encode()).hexdigest()


def request_password_reset(db: Session, email: str) -> str | None:
    """
    Generate a one-time password-reset token for the customer with the given email.

    Returns the raw (unhashed) token to be embedded in the reset URL, or None
    if the email is not found (caller must NOT reveal whether email exists).

    Token lifecycle:
      - 32-byte URL-safe random token (urlsafe_b64, 256 bits of entropy)
      - Hashed with SHA-256 before DB storage
      - Expires after settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES (default 60)
      - Invalidated (nulled) on use or replaced on re-request
    """
    customer = db.query(Customer).filter(Customer.email == email).first()
    if not customer or not customer.password_hash:
        # No account, or an admin-created account with no password — silently return None.
        # The endpoint always returns 200, preventing email enumeration (SEC-08 mitigation).
        return None

    if not customer.is_active:
        return None

    raw_token = secrets.token_urlsafe(32)
    hashed = _hash_reset_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
    )

    customer.password_reset_token = hashed
    customer.password_reset_expires = expires_at
    db.commit()

    logger.info("Password reset token generated for customer id=%s", customer.id)
    return raw_token


def reset_password(db: Session, raw_token: str, new_password: str) -> bool:
    """
    Validate a reset token and update the customer's password.

    Returns True on success, False on invalid/expired token.
    On success, the token is immediately invalidated (one-time use).
    """
    hashed = _hash_reset_token(raw_token)

    customer = (
        db.query(Customer)
        .filter(Customer.password_reset_token == hashed)
        .first()
    )

    if not customer:
        logger.debug("Password reset failed: token not found")
        return False

    if not customer.password_reset_expires:
        logger.debug("Password reset failed: no expiry set (token=%s...)", hashed[:8])
        return False

    # Make expiry comparison timezone-aware
    now = datetime.now(timezone.utc)
    expires = customer.password_reset_expires
    if expires.tzinfo is None:
        from datetime import timezone as _tz
        expires = expires.replace(tzinfo=_tz.utc)

    if now > expires:
        logger.debug("Password reset failed: token expired for customer id=%s", customer.id)
        # Null out the expired token so it can't be retried
        customer.password_reset_token = None
        customer.password_reset_expires = None
        db.commit()
        return False

    # Valid token — update password and invalidate token (one-time use)
    customer.password_hash = get_password_hash(new_password)
    customer.password_reset_token = None
    customer.password_reset_expires = None
    db.commit()

    logger.info("Password reset successful for customer id=%s", customer.id)
    return True
