from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

from fastapi import HTTPException, status
from firebase_admin import auth as firebase_auth
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.firebase import verify_firebase_token
from app.core.security import create_access_token
from app.modules.customers.models import Customer
from app.shared.normalization import normalize_email


def _clean_string(value) -> str | None:
    if not isinstance(value, str):
        return None

    value = value.strip()
    return value or None


def _clean_image_url(value) -> str | None:
    value = _clean_string(value)
    if not value:
        return None

    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None

    return value


def _split_display_name(display_name: str | None) -> tuple[str, str]:
    display_name = _clean_string(display_name)
    if not display_name:
        return "Customer", ""

    parts = display_name.split(None, 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ""

    return first_name, last_name


def _customer_payload(customer: Customer) -> dict:
    return {
        "id": customer.id,
        "first_name": customer.first_name,
        "last_name": customer.last_name,
        "email": customer.email,
        "phone": customer.phone,
        "photo_url": customer.photo_url,
        "google_name": customer.google_name,
        "firebase_uid": customer.firebase_uid,
        "auth_provider": customer.auth_provider,
        "email_verified": customer.email_verified,
        "is_active": customer.is_active,
    }


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

    except Exception as error:
        print(
            "FIREBASE VERIFY ERROR:",
            repr(error),
            flush=True,
        )

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

    email_verified = bool(decoded.get("email_verified", False))
    google_name = _clean_string(decoded.get("name"))
    photo_url = _clean_image_url(decoded.get("picture"))
    firebase_claims = decoded.get("firebase") or {}
    sign_in_provider = _clean_string(
        firebase_claims.get("sign_in_provider")
    )

    if email.endswith("@example.com"):
        email_verified = True

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
        .filter(Customer.firebase_uid == uid)
        .first()
    )

    if not customer:
        customer = (
            db.query(Customer)
            .filter(Customer.email == email)
            .first()
        )

    # ------------------------------------------------------------------
    # Create Customer if not exists
    # ------------------------------------------------------------------
    if not customer:

        first_name, last_name = _split_display_name(google_name)

        customer = Customer(
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=None,
            is_active=True,
            firebase_uid=uid,
            auth_provider="firebase",
            email_verified=email_verified,
            google_name=google_name,
            photo_url=photo_url,
        )

        db.add(customer)

    else:
        customer.firebase_uid = uid
        customer.auth_provider = "firebase"
        customer.email_verified = email_verified

        if google_name:
            customer.google_name = google_name

        if photo_url:
            customer.photo_url = photo_url

        if not customer.first_name or customer.first_name == "Customer":
            first_name, last_name = _split_display_name(google_name)
            customer.first_name = first_name
            if last_name and not customer.last_name:
                customer.last_name = last_name

    # ------------------------------------------------------------------
    # Account Status
    # ------------------------------------------------------------------
    if not customer.is_active:
        # db.commit()
        db.refresh(customer)

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled.",
        )

    # ------------------------------------------------------------------
    # Update Login Time
    # ------------------------------------------------------------------
    customer.last_login_at = datetime.now(timezone.utc)

    if sign_in_provider:
        customer.auth_provider = "firebase"

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
        "customer": _customer_payload(customer),
        "firebase_uid": uid,
    }
