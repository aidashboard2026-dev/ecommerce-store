import logging
import time
import threading
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.modules.auth.dependencies import get_current_admin, get_current_customer
from app.core.database import get_db
from app.modules.admins.models import Admin
from app.modules.customers.models import Customer
from app.modules.admins.schemas import AdminResponse, LoginRequest, Token
from app.modules.customers.schemas import CustomerResponse
from app.modules.auth.service import login_admin, login_customer, register_customer
from app.core.config import settings
from app.modules.auth.schemas import CustomerLoginRequest, SignupRequest

router = APIRouter()
logger = logging.getLogger(__name__)

# ── In-memory brute-force throttle ───────────────────────────────────────────
# NOTE: Works correctly with --workers 1 (dev/demo). For multi-worker prod,
# replace with a Redis-backed counter.

_RATE_LOCK = threading.Lock()
_attempts: dict[str, list[float]] = defaultdict(list)

MAX_ATTEMPTS = 5        # max failures before lockout
WINDOW_SECONDS = 300    # 5-minute rolling window

# ── Cookie configuration ──────────────────────────────────────────────────────
_COOKIE_NAME    = "admin_token"
_COOKIE_MAX_AGE = settings.ADMIN_TOKEN_EXPIRE_MINUTES * 60


def _check_rate_limit(ip: str) -> None:
    now = time.monotonic()
    with _RATE_LOCK:
        _attempts[ip] = [t for t in _attempts[ip] if now - t < WINDOW_SECONDS]
        if len(_attempts[ip]) >= MAX_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed login attempts. Please wait 5 minutes.",
                headers={"Retry-After": str(WINDOW_SECONDS)},
            )


def _record_failure(ip: str) -> None:
    now = time.monotonic()
    with _RATE_LOCK:
        _attempts[ip].append(now)


def _clear_failures(ip: str) -> None:
    with _RATE_LOCK:
        _attempts.pop(ip, None)


# ── Admin endpoints ───────────────────────────────────────────────────────────

@router.post("/login", response_model=Token)
def login(
    request: Request,
    response: Response,
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    ip = request.client.host if request.client else "unknown"

    _check_rate_limit(ip)

    result = login_admin(db, login_data.email, login_data.password)
    if not result:
        _record_failure(ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    _clear_failures(ip)

    import os as _os
    cookie_secure = _os.getenv("AUTH_COOKIE_SECURE", "true").lower() != "false"
    response.set_cookie(
        key=_COOKIE_NAME,
        value=result["access_token"],
        max_age=_COOKIE_MAX_AGE,
        httponly=True,
        secure=cookie_secure,
        samesite="lax",
        path="/",
    )
    logger.info("Admin login successful: email=%s", login_data.email)
    return result


@router.get("/me", response_model=AdminResponse)
def get_me(current_admin: Admin = Depends(get_current_admin)):
    return current_admin


@router.post("/logout")
def logout(response: Response, current_admin: Admin = Depends(get_current_admin)):
    response.delete_cookie(key=_COOKIE_NAME, path="/", samesite="lax")
    return {"message": "Logged out successfully"}


# ── Customer signup ───────────────────────────────────────────────────────────

@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(request: Request, signup_data: SignupRequest, db: Session = Depends(get_db)):
    """
    Register a new customer account.
    Returns safe subset of customer data — no token issued at signup.
    Customer must call POST /auth/customer/login to obtain a JWT.
    """
    ip = request.client.host if request.client else "unknown"
    _check_rate_limit(ip)
    customer = register_customer(db, signup_data)

    return {
        "message": "Account created successfully",
        "customer": {
            "id": customer.id,
            "first_name": customer.first_name,
            "last_name": customer.last_name,
            "email": customer.email,
        },
    }


# ── Customer login ────────────────────────────────────────────────────────────

@router.post("/customer/login")
def customer_login(
    request: Request,
    login_data: CustomerLoginRequest,
    db: Session = Depends(get_db),
):
    """
    Authenticate a customer by email + password.
    Returns access_token (JWT with type='customer') for use in Authorization header.
    """
    ip = request.client.host if request.client else "unknown"
    _check_rate_limit(ip)

    result = login_customer(db, login_data.email, login_data.password)
    if not result:
        _record_failure(ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    _clear_failures(ip)

    customer = result["customer"]
    return {
        "access_token": result["access_token"],
        "token_type": result["token_type"],
        "customer": {
            "id": customer.id,
            "first_name": customer.first_name,
            "last_name": customer.last_name,
            "email": customer.email,
            "is_active": customer.is_active,
        },
    }


@router.get("/customer/me")
def get_customer_me(current_customer: Customer = Depends(get_current_customer)):
    """Return the authenticated customer's profile."""
    return {
        "id": current_customer.id,
        "first_name": current_customer.first_name,
        "last_name": current_customer.last_name,
        "email": current_customer.email,
        "phone": current_customer.phone,
        "is_active": current_customer.is_active,
    }
