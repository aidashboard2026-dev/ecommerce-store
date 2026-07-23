"""
app/modules/auth/dependencies.py

FastAPI dependency functions for authentication and authorisation.

Uses domain exceptions (AuthenticationError, AuthorizationError) instead
of HTTPException so the centralized handlers in main.py own the HTTP
status code and response shape.
"""

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_token
from app.modules.admins.models import Admin
from app.modules.customers.models import Customer
from app.shared.exceptions import AuthenticationError, AuthorizationError

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_admin(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    token = None

    # Authorization Header
    if credentials:
        token = credentials.credentials if credentials else None

    # Cookie
    if not token:
        token = request.cookies.get("admin_token")

    if not token:
        raise AuthenticationError(
            "Authentication required.",
            code="NO_TOKEN",
        )

    admin_id = verify_token(token, expected_type="admin")

    if not admin_id:
        raise AuthenticationError(
            "Invalid or expired token.",
            code="INVALID_TOKEN",
        )

    admin = db.query(Admin).filter(Admin.id == int(admin_id)).first()

    if admin is None:
        raise AuthenticationError(
            "Admin account not found.",
            code="ADMIN_NOT_FOUND",
        )

    return admin

def get_current_superadmin(
    current_admin: Admin = Depends(get_current_admin),
) -> Admin:
    """
    Assert that the authenticated admin holds the 'superadmin' role.

    Raises AuthorizationError (→ HTTP 403) when the admin's role is not 'superadmin'.
    """
    if current_admin.role != "superadmin":
        raise AuthorizationError(
            "Insufficient permissions. This action requires the superadmin role.",
            code="INSUFFICIENT_PERMISSIONS",
        )
    return current_admin


def get_current_customer(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Customer:
    """
    Validate a Bearer token and return the authenticated Customer.

    Raises AuthenticationError (→ HTTP 401) when:
      - The token is invalid, expired, or not a customer token.
      - The customer account no longer exists.
    Raises AuthorizationError (→ HTTP 403) when:
      - The customer account is inactive/suspended.
    """
    if not credentials:
        raise AuthenticationError(
            "Customer authentication required.",
            code="NO_CUSTOMER_TOKEN",
        )

    token = credentials.credentials
    customer_id = verify_token(token, expected_type="customer")

    if not customer_id:
        raise AuthenticationError(
            "Invalid or expired customer token.",
            code="INVALID_CUSTOMER_TOKEN",
        )

    customer = db.query(Customer).filter(Customer.id == int(customer_id)).first()

    if customer is None:
        raise AuthenticationError(
            "Customer account not found.",
            code="CUSTOMER_NOT_FOUND",
        )

    if not customer.is_active:
        raise AuthorizationError(
            "Customer account is inactive.",
            code="CUSTOMER_INACTIVE",
        )

    return customer
