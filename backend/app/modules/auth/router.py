import logging
import threading
import time
from collections import defaultdict

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db

from app.modules.admins.models import Admin
from app.modules.customers.models import Customer
from app.modules.admins.schemas import (
    AdminResponse,
    LoginRequest,
    Token,
)

from app.modules.auth.dependencies import (
    get_current_admin,
    get_current_customer,
)

from app.modules.auth.firebase_service import (
    firebase_login,
)

from app.modules.auth.service import (
    login_admin,
)


# ============================================================
# Router
# ============================================================

router = APIRouter()

logger = logging.getLogger(__name__)


def _customer_profile_payload(customer: Customer) -> dict:
    return {
        "id": customer.id,
        "first_name": customer.first_name,
        "last_name": customer.last_name,
        "email": customer.email,
        "phone": customer.phone,
        "dob": customer.dob,
        "address_line1": customer.address_line1,
        "address_line2": customer.address_line2,
        "city": customer.city,
        "state": customer.state,
        "country": customer.country,
        "pincode": customer.pincode,
        "photo_url": customer.photo_url,
        "google_name": customer.google_name,
        "firebase_uid": customer.firebase_uid,
        "auth_provider": customer.auth_provider,
        "email_verified": customer.email_verified,
        "is_active": customer.is_active,
        "created_at": customer.created_at,
    }


# ============================================================
# Firebase Request Schema
# ============================================================

class FirebaseLoginRequest(BaseModel):
    id_token: str


# ============================================================
# Login Rate Limit
# ============================================================

_RATE_LOCK = threading.Lock()

_attempts: dict[str, list[float]] = defaultdict(
    list
)

MAX_ATTEMPTS = 5

WINDOW_SECONDS = 300


def _check_rate_limit(
    ip: str,
) -> None:

    now = time.monotonic()

    with _RATE_LOCK:

        _attempts[ip] = [
            attempt_time
            for attempt_time
            in _attempts[ip]
            if (
                now
                - attempt_time
                < WINDOW_SECONDS
            )
        ]

        if (
            len(_attempts[ip])
            >= MAX_ATTEMPTS
        ):

            raise HTTPException(
                status_code=(
                    status
                    .HTTP_429_TOO_MANY_REQUESTS
                ),
                detail=(
                    "Too many failed "
                    "login attempts. "
                    "Please wait 5 minutes."
                ),
                headers={
                    "Retry-After":
                    str(
                        WINDOW_SECONDS
                    )
                },
            )


def _record_failure(
    ip: str,
) -> None:

    with _RATE_LOCK:

        _attempts[ip].append(
            time.monotonic()
        )


def _clear_failures(
    ip: str,
) -> None:

    with _RATE_LOCK:

        _attempts.pop(
            ip,
            None,
        )


# ============================================================
# Admin Cookie Configuration
# ============================================================

ADMIN_COOKIE_NAME = (
    "admin_token"
)

ADMIN_COOKIE_MAX_AGE = (
    settings
    .ADMIN_TOKEN_EXPIRE_MINUTES
    * 60
)


# ============================================================
# Admin Login
# ============================================================

@router.post(
    "/login",
    response_model=Token,
)
def admin_login(
    request: Request,
    response: Response,
    login_data: LoginRequest,
    db: Session = Depends(
        get_db
    ),
):

    ip = (
        request.client.host
        if request.client
        else "unknown"
    )

    _check_rate_limit(
        ip
    )

    result = login_admin(
        db,
        login_data.email,
        login_data.password,
    )

    if not result:

        _record_failure(
            ip
        )

        raise HTTPException(
            status_code=(
                status
                .HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Invalid credentials."
            ),
        )

    _clear_failures(
        ip
    )


    import os

    cookie_secure = (
        os.getenv(
            "AUTH_COOKIE_SECURE",
            "true",
        ).lower()
        != "false"
    )


    response.set_cookie(
        key=(
            ADMIN_COOKIE_NAME
        ),
        value=(
            result[
                "access_token"
            ]
        ),
        max_age=(
            ADMIN_COOKIE_MAX_AGE
        ),
        httponly=True,
        secure=(
            cookie_secure
        ),
        samesite="lax",
        path="/",
    )


    logger.info(
        (
            "Admin login "
            "successful: %s"
        ),
        login_data.email,
    )


    return result


# ============================================================
# Current Admin
# ============================================================

@router.get(
    "/me",
    response_model=AdminResponse,
)
def get_admin_profile(
    current_admin: Admin = Depends(
        get_current_admin
    ),
):

    return current_admin


# ============================================================
# Admin Logout
# ============================================================

@router.post(
    "/logout"
)
def admin_logout(
    response: Response,
    current_admin: Admin = Depends(
        get_current_admin
    ),
):

    response.delete_cookie(
        key=(
            ADMIN_COOKIE_NAME
        ),
        path="/",
        samesite="lax",
    )


    logger.info(
        (
            "Admin logout: "
            "id=%s"
        ),
        current_admin.id,
    )


    return {
        "message":
        "Logged out successfully"
    }


# ============================================================
# Firebase Customer Login
# ============================================================

@router.post(
    "/firebase/login"
)
def firebase_customer_login(
    body: FirebaseLoginRequest,
    db: Session = Depends(
        get_db
    ),
):

    print(
        (
            "Firebase login "
            "request received"
        ),
        flush=True,
    )


    try:

        result = firebase_login(
            db=db,
            id_token=(
                body.id_token
            ),
        )


        print(
            (
                "Firebase login "
                "successful"
            ),
            flush=True,
        )


        return result


    except HTTPException:

        db.rollback()

        raise


    except Exception as error:

        db.rollback()


        # print(("FIREBASE""LOGIN ERROR:"),  type(error).__name__,  str(error),  flush=True,)
        logger.exception(
            (
                "Firebase customer "
                "login failed"
            )
        )


        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to complete Firebase login. Please try again.",
        )
    
@router.get("/customer/me")
def get_customer_profile(
    current_customer: Customer = Depends(get_current_customer),
):
    return _customer_profile_payload(current_customer)


class CustomerProfileRequest(BaseModel):
    first_name: str
    last_name: str
    phone: str | None = None
    dob: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = "India"
    pincode: str | None = None
    



@router.put("/customer/profile")
def update_customer_profile(
    body: CustomerProfileRequest,
    current_customer=Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    from datetime import date

    current_customer.first_name = body.first_name.strip()
    current_customer.last_name = body.last_name.strip()
    current_customer.phone = body.phone

    if body.dob:
        current_customer.dob = (date.fromisoformat(body.dob) if body.dob else None)

    current_customer.address_line1 = body.address_line1
    current_customer.address_line2 = body.address_line2
    current_customer.city = body.city
    current_customer.state = body.state
    current_customer.country = body.country
    current_customer.pincode = body.pincode

    db.commit()
    db.refresh(current_customer)

    return {
        "message": "Customer profile saved successfully",
        "customer": _customer_profile_payload(current_customer),
    }
