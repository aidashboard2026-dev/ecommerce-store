"""
app/shared/response/base.py

Standardized response envelopes for all API endpoints.

ADOPTION STRATEGY
-----------------
Existing endpoints return Pydantic models directly and are untouched.
New endpoints written in Phase 2+ use these envelopes.
Existing endpoints are migrated incrementally as modules are refactored.

DESIGN CHOICES
--------------
- Generic PaginatedResponse[T] replaces module-specific *ListResponse schemas.
  Each module's existing ListResponse is preserved for backward-compatibility
  and will be aliased to PaginatedResponse[T] during its own refactor phase.
- MessageResponse covers simple success confirmations (delete, bulk actions).
- SuccessResponse wraps arbitrary data payloads with a consistent envelope.
- ErrorResponse is emitted by the centralized exception handlers in main.py.
"""

from __future__ import annotations

from typing import Any, Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


# ─────────────────────────────────────────────────────────────
# Pagination
# ─────────────────────────────────────────────────────────────

class PaginatedResponse(BaseModel, Generic[T]):
    """
    Generic paginated list response.

    Replaces the module-specific *ListResponse schemas as modules are
    refactored. Use like:

        @router.get("/", response_model=PaginatedResponse[ProductResponse])
        def list_products(...) -> PaginatedResponse[ProductResponse]:
            ...
    """

    items: List[T]
    total: int = Field(..., description="Total number of matching records (across all pages).")
    page: int = Field(..., ge=1, description="Current page number (1-indexed).")
    per_page: int = Field(..., ge=1, description="Number of records per page.")
    total_pages: int = Field(..., ge=1, description="Total number of pages.")

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────────────────────
# Success envelope
# ─────────────────────────────────────────────────────────────

class SuccessResponse(BaseModel):
    """
    Generic success envelope for single-resource responses.

    Use when the resource itself is the primary payload but a consistent
    envelope is required:

        return SuccessResponse(message="Product created.", data=product_response)
    """

    success: bool = True
    message: str
    data: Optional[Any] = None


# ─────────────────────────────────────────────────────────────
# Simple message (confirmation, deletion, bulk action)
# ─────────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    """
    Lightweight confirmation response — no data payload.

    Use for:
      - 204-equivalent operations that need a body (some frontends expect one)
      - Bulk action confirmations
      - Async-trigger confirmations

    Example:
        return MessageResponse(message="Product deleted.", detail={"deleted_id": 42})
    """

    success: bool = True
    message: str
    detail: Optional[Any] = None


# ─────────────────────────────────────────────────────────────
# Error envelope (emitted by exception handlers, not endpoints)
# ─────────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    """
    Standardized error envelope emitted by the centralized exception
    handlers in main.py.

    The `code` field is a machine-readable string for client-side i18n
    and programmatic error handling. The `field` field identifies the
    offending input field for 422 (Unprocessable Entity) errors.
    """

    success: bool = False
    error: str = Field(..., description="Human-readable error message.")
    code: Optional[str] = Field(None, description="Machine-readable error code.")
    field: Optional[str] = Field(None, description="Input field that caused the error (422 only).")
    detail: Optional[Any] = Field(None, description="Extended error context (debug/development).")


# ─────────────────────────────────────────────────────────────
# Factory helpers
# ─────────────────────────────────────────────────────────────

def bulk_success(
    action: str,
    updated: int,
    not_found: Optional[List[int]] = None,
    errors: Optional[List[str]] = None,
) -> MessageResponse:
    """
    Build a MessageResponse for bulk action results.

    Example:
        return bulk_success("delete", updated=5, not_found=[99])
    """
    return MessageResponse(
        message=f"Bulk action '{action}' applied to {updated} record(s).",
        detail={
            "updated": updated,
            "not_found": not_found or [],
            "errors": errors or [],
        },
    )


def not_found_response(resource: str, identifier: Any) -> ErrorResponse:
    """Build a standardized 404 error body."""
    return ErrorResponse(
        error=f"{resource} '{identifier}' not found.",
        code="NOT_FOUND",
    )


def conflict_response(message: str, field: Optional[str] = None) -> ErrorResponse:
    """Build a standardized 409 error body."""
    return ErrorResponse(
        error=message,
        code="CONFLICT",
        field=field,
    )
