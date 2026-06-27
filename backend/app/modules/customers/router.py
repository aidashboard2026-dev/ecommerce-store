from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.modules.auth.dependencies import get_current_admin, get_current_customer
from app.modules.customers.models import Customer
from app.core.database import get_db
from app.modules.admins.models import Admin
from app.modules.customers.schemas import (
    CustomerCreate,
    CustomerListResponse,
    CustomerNoteUpdate,
    CustomerProfileResponse,
    CustomerResponse,
    CustomerStatusUpdate,
    CustomerTagsUpdate,
    CustomerUpdate,
)
from app.modules.customers.service import (
    create_customer,
    get_customer,
    get_customer_analytics,
    get_customer_profile,
    get_customers_paginated,
    toggle_customer_status,
    update_customer,
    update_customer_notes,
    update_customer_tags,
)

router = APIRouter()


# ─── List & Search ────────────────────────────────────────────────────────────

@router.get("/", response_model=CustomerListResponse)
def list_customers(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, max_length=200),
    status: Optional[str] = Query(None, pattern="^(active|inactive)$"),
    tag: Optional[str] = Query(None, max_length=100),
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    Paginated customer list with full-text search, status/tag filters,
    and aggregated order stats (total orders, total spent, AOV, last order date).
    All stats computed in one JOIN — no N+1.
    """
    return get_customers_paginated(
        db,
        page=page,
        per_page=per_page,
        search=search,
        status_filter=status,
        tag_filter=tag,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )


# ─── Analytics ───────────────────────────────────────────────────────────────

@router.get("/analytics")
def customer_analytics(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Summary metrics: totals, new this month, top spenders."""
    return get_customer_analytics(db)


# ─── Create ───────────────────────────────────────────────────────────────────

@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer_endpoint(
    data: CustomerCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Admin-creates a customer. No public self-registration."""
    return create_customer(db, data)


# ─── Profile (detail) ─────────────────────────────────────────────────────────

@router.get("/{customer_id}/profile", response_model=CustomerProfileResponse)
def customer_profile(
    customer_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    Full customer profile: info + order history + spending analytics.
    All computed in 2 DB queries (customer + order stats + recent 10 orders).
    """
    return get_customer_profile(db, customer_id)


# ─── Single customer ──────────────────────────────────────────────────────────

@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer_endpoint(
    customer_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return get_customer(db, customer_id)


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer_endpoint(
    customer_id: int,
    data: CustomerUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return update_customer(db, customer_id, data)


# ─── Status toggle ────────────────────────────────────────────────────────────

@router.patch("/{customer_id}/status", response_model=CustomerResponse)
def update_status(
    customer_id: int,
    data: CustomerStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Activate or deactivate a customer (soft toggle, no deletion)."""
    return toggle_customer_status(db, customer_id, data.is_active)


# ─── Notes ───────────────────────────────────────────────────────────────────

@router.patch("/{customer_id}/notes", response_model=CustomerResponse)
def update_notes(
    customer_id: int,
    data: CustomerNoteUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Replace internal admin notes for a customer."""
    return update_customer_notes(db, customer_id, data.notes)


# ─── Tags ────────────────────────────────────────────────────────────────────

@router.patch("/{customer_id}/tags", response_model=CustomerResponse)
def update_tags(
    customer_id: int,
    data: CustomerTagsUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Replace the full tag list for a customer."""
    return update_customer_tags(db, customer_id, data.tags)


@router.put("/profile/update", response_model=CustomerResponse)
def update_profile(
    profile_data: CustomerUpdate,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """Update customer's own profile details."""
    allowed_fields = ["first_name", "last_name", "phone", "dob", "city", "state", "country"]
    update_data = profile_data.model_dump(exclude_unset=True)
    
    for field in allowed_fields:
        if field in update_data:
            setattr(current_customer, field, update_data[field])
            
    db.commit()
    db.refresh(current_customer)
    
    # Return with empty analytics fields to satisfy CustomerResponse
    return current_customer
