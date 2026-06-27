import time
import threading
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.modules.auth.dependencies import get_current_admin
from app.core.database import get_db
from app.modules.admins.models import Admin
from app.modules.admins.schemas import AdminResponse, LoginRequest, Token
from app.modules.auth.service import login_admin, register_customer
from app.core.config import settings
from app.modules.auth.schemas import SignupRequest

router = APIRouter()

# ── In-memory brute-force throttle ───────────────────────────────────────────
# Tracks failed login attempts per IP. Resets after WINDOW_SECONDS.
# For multi-worker / multi-instance deployments, replace with Redis.

_RATE_LOCK = threading.Lock()
_attempts: dict[str, list[float]] = defaultdict(list)

MAX_ATTEMPTS = 5        # max failures before lockout
WINDOW_SECONDS = 300    # 5-minute rolling window

# ── Cookie configuration ──────────────────────────────────────────────────────
# The JWT is stored in an HttpOnly cookie, making it inaccessible to JavaScript
# and therefore immune to XSS-based token theft. SameSite=Lax blocks the cookie
# from being sent in cross-site POST requests (CSRF mitigation), while still
# allowing normal navigation links to work.
#
# Secure=True enforces HTTPS. Set AUTH_COOKIE_SECURE=false in .env for local
# HTTP dev (http://localhost) — never in staging or production.
_COOKIE_NAME   = "admin_token"
_COOKIE_MAX_AGE = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # seconds
_COOKIE_SECURE = True   # override in dev with env: AUTH_COOKIE_SECURE=false


def _check_rate_limit(ip: str) -> None:
    """Raise 429 if this IP has exceeded the failure threshold in the window."""
    now = time.monotonic()
    with _RATE_LOCK:
        # Purge timestamps outside the window
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


# ── Endpoints ─────────────────────────────────────────────────────────────────

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
        # Generic message — do not leak whether the email or password was wrong
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    # Successful login — clear failure counter and issue HttpOnly cookie
    _clear_failures(ip)

    # Set the JWT in an HttpOnly cookie. The browser sends it automatically
    # on every same-origin request — no JavaScript can read it, eliminating
    # the XSS token-theft vector from localStorage.
    import os as _os
    cookie_secure = _os.getenv("AUTH_COOKIE_SECURE", "true").lower() != "false"
    response.set_cookie(
        key=_COOKIE_NAME,
        value=result["access_token"],
        max_age=_COOKIE_MAX_AGE,
        httponly=True,       # invisible to document.cookie and JS — XSS safe
        secure=cookie_secure,  # HTTPS only (set AUTH_COOKIE_SECURE=false for local dev)
        samesite="lax",     # CSRF: blocks cross-site POSTs, allows same-site nav
        path="/",
    )
    return result


@router.get("/me", response_model=AdminResponse)
def get_me(current_admin: Admin = Depends(get_current_admin)):
    return current_admin


@router.post("/logout")
def logout(response: Response, current_admin: Admin = Depends(get_current_admin)):
    # Clear the HttpOnly auth cookie. The JWT remains cryptographically valid
    # until its exp claim, but the browser will not send it after the cookie
    # is deleted. For full server-side revocation, add a token denylist (Redis).
    response.delete_cookie(key=_COOKIE_NAME, path="/", samesite="lax")
    return {"message": "Logged out successfully"}


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(signup_data: SignupRequest, db: Session = Depends(get_db)):
    """
    Register a new customer account.

    - Email uniqueness enforced at both application and DB level.
    - Password hashed with bcrypt; plain-text never persisted.
    - Returns safe subset of customer data — no token issued at signup
      (customer must log in separately once customer login is wired up).
    """
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