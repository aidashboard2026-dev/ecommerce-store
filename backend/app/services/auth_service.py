from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from fastapi import HTTPException, status

from app.models.admin import Admin
from app.models.customer import Customer
from app.core.security import verify_password, get_password_hash, create_access_token
from app.schemas.auth import SignupRequest
from datetime import timedelta
from app.core.config import settings


# ── Admin auth ────────────────────────────────────────────────────────────────

def authenticate_admin(db: Session, email: str, password: str):
    admin = db.query(Admin).filter(Admin.email == email).first()
    if not admin:
        return None
    if not verify_password(password, admin.password_hash):
        return None
    return admin


def login_admin(db: Session, email: str, password: str):
    admin = authenticate_admin(db, email, password)
    if not admin:
        return None

    access_token = create_access_token(
        subject=admin.id,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
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
