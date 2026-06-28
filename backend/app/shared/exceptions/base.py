"""
app/shared/exceptions/base.py

Domain exception hierarchy. These are plain Python exceptions with no
HTTP awareness — the FastAPI exception handlers in main.py own the
HTTP status code mapping.

Design principles:
  - Raise the most specific exception possible so handlers can act on type.
  - Attach a human-readable `detail` message for the API response.
  - Attach optional `field` for field-level validation errors (422 context).
  - Attach optional `code` for machine-readable error codes (client i18n).

Migration path:
  Existing `raise HTTPException(...)` calls remain valid and are untouched.
  New code written in Phase 2+ uses these domain exceptions.
  Replace existing HTTPExceptions incrementally as modules are refactored.
"""

from typing import Any, Optional


class AppException(Exception):
    """
    Base class for all application-level exceptions.

    Every subclass must pass a `detail` message. All other attributes
    are optional and provide additional context for callers.
    """

    def __init__(
        self,
        detail: str,
        *,
        code: Optional[str] = None,
        field: Optional[str] = None,
        context: Optional[dict[str, Any]] = None,
    ) -> None:
        super().__init__(detail)
        self.detail = detail
        self.code = code        # e.g. "PRODUCT_CATEGORY_LIMIT_EXCEEDED"
        self.field = field      # e.g. "category_id" for field-level errors
        self.context = context or {}

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(detail={self.detail!r}, code={self.code!r})"


# ─────────────────────────────────────────────────────────────
# 404 — Resource not found
# ─────────────────────────────────────────────────────────────

class NotFoundError(AppException):
    """
    Raised when a requested resource does not exist.

    Maps to HTTP 404.

    Examples:
        raise NotFoundError("Product 42 not found.")
        raise NotFoundError(f"Order {order_id} not found.", code="ORDER_NOT_FOUND")
    """


# ─────────────────────────────────────────────────────────────
# 409 — State conflict
# ─────────────────────────────────────────────────────────────

class ConflictError(AppException):
    """
    Raised when an operation conflicts with existing state.

    Maps to HTTP 409.

    Examples:
        raise ConflictError("A product with this slug already exists.")
        raise ConflictError(f"SKU '{sku}' is already in use.", field="sku")
    """


# ─────────────────────────────────────────────────────────────
# 422 — Input validation failed
# ─────────────────────────────────────────────────────────────

class ValidationError(AppException):
    """
    Raised when business-level input validation fails.

    Maps to HTTP 422. Distinct from Pydantic's own ValidationError
    (which FastAPI handles at the schema level before reaching service code).

    Examples:
        raise ValidationError("selling_price cannot exceed original_price.", field="selling_price")
        raise ValidationError("color_hex must be a valid CSS hex colour.", field="color_hex")
    """


# ─────────────────────────────────────────────────────────────
# 401 — Authentication required
# ─────────────────────────────────────────────────────────────

class AuthenticationError(AppException):
    """
    Raised when a request cannot be authenticated.

    Maps to HTTP 401.

    Examples:
        raise AuthenticationError("Invalid or expired token.")
        raise AuthenticationError("Admin account not found.")
    """


# ─────────────────────────────────────────────────────────────
# 403 — Authorisation denied
# ─────────────────────────────────────────────────────────────

class AuthorizationError(AppException):
    """
    Raised when an authenticated caller lacks permission for an action.

    Maps to HTTP 403.

    Examples:
        raise AuthorizationError("Only superadmins can delete categories.")
        raise AuthorizationError("You do not have access to this resource.")
    """


# ─────────────────────────────────────────────────────────────
# 400 — Business rule violation
# ─────────────────────────────────────────────────────────────

class BusinessRuleError(AppException):
    """
    Raised when an operation violates a domain business rule that is not
    strictly a validation error (field-level) or a conflict (duplicate key).

    Maps to HTTP 400.

    Examples:
        raise BusinessRuleError("Maximum of 5 product categories allowed.")
        raise BusinessRuleError("Main product category names cannot be changed.")
        raise BusinessRuleError("Cannot delete a category that has products.")
    """


# ─────────────────────────────────────────────────────────────
# 409 — Database integrity violation (escalated from DB layer)
# ─────────────────────────────────────────────────────────────

class IntegrityError(AppException):
    """
    Raised when a database integrity constraint is violated and no more
    specific ConflictError applies. Repository layer catches
    sqlalchemy.exc.IntegrityError and re-raises this where appropriate.

    Maps to HTTP 409.

    Examples:
        raise IntegrityError("This action conflicts with existing data.")
    """


# ─────────────────────────────────────────────────────────────
# 503 — External storage failure
# ─────────────────────────────────────────────────────────────

class StorageError(AppException):
    """
    Raised when an external storage operation (e.g. Supabase upload/delete)
    fails in a way that blocks the request.

    Maps to HTTP 503.

    Examples:
        raise StorageError("Image upload to Supabase failed. Try again later.")
    """


# ─────────────────────────────────────────────────────────────
# 429 — Rate limit exceeded
# ─────────────────────────────────────────────────────────────

class RateLimitError(AppException):
    """
    Raised when a caller has exceeded an allowed request rate.

    Maps to HTTP 429.

    Examples:
        raise RateLimitError("Too many login attempts. Try again in 60 seconds.")
    """


# ─────────────────────────────────────────────────────────────
# 502 — External service failure
# ─────────────────────────────────────────────────────────────

class ExternalServiceError(AppException):
    """
    Raised when a downstream service (payment gateway, SMS, etc.) returns
    an error that blocks the current operation.

    Maps to HTTP 502.

    Examples:
        raise ExternalServiceError("Razorpay payment verification failed.")
    """
