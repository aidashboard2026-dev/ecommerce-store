"""
app/shared/exceptions/__init__.py

Centralized exception hierarchy for the application.

USAGE — domain code raises semantic exceptions:
    raise NotFoundError("Product 42 not found.")
    raise ConflictError("SKU already in use.")
    raise BusinessRuleError("Max 5 product categories allowed.")

FastAPI exception handlers in main.py map these to HTTP responses.
Existing HTTPException raises continue to work unchanged during migration.
"""

from .base import (
    AppException,
    NotFoundError,
    ConflictError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    BusinessRuleError,
    StorageError,
    IntegrityError,
    RateLimitError,
    ExternalServiceError,
)

__all__ = [
    "AppException",
    "NotFoundError",
    "ConflictError",
    "ValidationError",
    "AuthenticationError",
    "AuthorizationError",
    "BusinessRuleError",
    "StorageError",
    "IntegrityError",
    "RateLimitError",
    "ExternalServiceError",
]
