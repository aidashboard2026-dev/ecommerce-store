from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from firebase_admin import auth as firebase_auth
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.firebase import verify_firebase_token
from app.core.security import create_access_token
from app.modules.customers.models import Customer
from app.shared.normalization import normalize_email


def firebase_login(db: Session, id_token: str):
    """
    Verify Firebase ID Token.
    Create customer if first login.
    Return local JWT token.
    """

    # ------------------------------------------------------------------
    # Verify Firebase Token
    # ------------------------------------------------------------------
    try:
        decoded = verify_firebase_token(id_token)

        # Make sure the Firebase user still exists
        firebase_auth.get_user(decoded["uid"])

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Firebase token",
        )

    uid = decoded["uid"]

    email = normalize_email(decoded.get("email"))

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not found in Firebase token.",
        )

    email_verified = decoded.get("email_verified", False)

    if not email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in.",
        )

    # ------------------------------------------------------------------
    # Find Customer
    # ------------------------------------------------------------------
    customer = (
        db.query(Customer)
        .filter(Customer.email == email)
        .first()
    )

    # ------------------------------------------------------------------
    # Create Customer if not exists
    # ------------------------------------------------------------------
    if not customer:

        full_name = decoded.get("name", "").strip()

        if full_name:
            parts = full_name.split(" ", 1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ""
        else:
            first_name = "Customer"
            last_name = ""

        customer = Customer(
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=None,
            password_hash=None,
            is_active=True,
            firebase_uid=uid,
            auth_provider="firebase",
            email_verified=True,
        )

        db.add(customer)
        db.commit()
        db.refresh(customer)

    else:
        # Update Firebase information if needed
        if not customer.firebase_uid:
            customer.firebase_uid = uid

        customer.auth_provider = "firebase"
        customer.email_verified = True

    # ------------------------------------------------------------------
    # Account Status
    # ------------------------------------------------------------------
    if not customer.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled.",
        )

    # ------------------------------------------------------------------
    # Update Login Time
    # ------------------------------------------------------------------
    customer.last_login_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(customer)

    # ------------------------------------------------------------------
    # Create JWT
    # ------------------------------------------------------------------
    access_token = create_access_token(
        subject=customer.id,
        expires_delta=timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        ),
        token_type="customer",
    )

    # ------------------------------------------------------------------
    # Response
    # ------------------------------------------------------------------
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "customer": {
            "id": customer.id,
            "first_name": customer.first_name,
            "last_name": customer.last_name,
            "email": customer.email,
            "is_active": customer.is_active,
            "email_verified": customer.email_verified,
            "auth_provider": customer.auth_provider,
        },
        "firebase_uid": uid,
    }