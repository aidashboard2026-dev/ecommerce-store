"""
app/modules/orders/router.py

Thin order router — zero business logic, zero SQLAlchemy.

Responsibilities:
  - Parse and validate incoming HTTP requests (Pydantic handles this)
  - Call the service layer
  - Write audit log entries
  - Return HTTP responses

Everything else lives in:
  service.py   — business rules and orchestration
  repository.py — database access
  constants.py  — domain constants
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.admins.models import Admin
from app.modules.auth.dependencies import get_current_admin, get_current_customer
from app.modules.customers.models import Customer
from app.modules.audit.service import audit
from app.modules.orders import service as order_service
from app.modules.orders.constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from app.modules.orders.schemas import (
    OrderCreate,
    OrderListResponse,
    OrderResponse,
    OrderTrackingResponse,
    OrderUpdate,
)

router = APIRouter()


# ─────────────────────────────────────────────────────────────
# Admin — list / get
# ─────────────────────────────────────────────────────────────

@router.get("/", response_model=OrderListResponse)
def list_orders(
    page:            int           = Query(1, ge=1),
    per_page:        int           = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    search:          str | None    = Query(None, description="Search order number, customer name/email, product name"),
    tracking_status: str | None    = Query(None),
    payment_status:  str | None    = Query(None),
    item_type:       str | None    = Query(None, description="PRODUCT or CUSTOM_PRODUCT"),
    db:              Session       = Depends(get_db),
    _:               Admin         = Depends(get_current_admin),
):
    """
    Admin — paginated order list with optional filters.

    Breaking change from the original List[OrderResponse]:
    Response is now wrapped in OrderListResponse {items, total, page, per_page, total_pages}.
    Update the admin frontend to read `.items` instead of the bare array.
    """
    return order_service.list_orders(
        db,
        page=page,
        per_page=per_page,
        search=search,
        tracking_status=tracking_status,
        payment_status=payment_status,
        item_type=item_type,
    )


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db:       Session = Depends(get_db),
    _:        Admin   = Depends(get_current_admin),
):
    """Admin — fetch a single order by PK."""
    return order_service.get_order(db, order_id)


# ─────────────────────────────────────────────────────────────
# Admin — create / update / cancel / tracking
# ─────────────────────────────────────────────────────────────

@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in:      OrderCreate,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    """Admin — create an order manually."""
    order = order_service.create_order_admin(db, order_in)

    audit.created(
        db=db, admin=current_admin,
        resource_type="order",
        resource_id=order.id,
        resource_label=order.order_number,
        payload={"item_type": order.item_type, "product": order.product_name},
        request=request,
    )
    db.commit()

    return order


@router.put("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: int,
    payload:  OrderUpdate,
    request:  Request,
    db:       Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Admin — update order fields (status, tracking, payment)."""
    order = order_service.update_order(db, order_id, payload)

    audit.updated(
        db=db, admin=current_admin,
        resource_type="order",
        resource_id=order.id,
        resource_label=order.order_number,
        after=payload.model_dump(exclude_unset=True),
        request=request,
    )
    db.commit()

    return order


@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(
    order_id: int,
    request:  Request,
    db:       Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Admin — cancel an order (no status restrictions)."""
    order = order_service.cancel_order_admin(db, order_id)

    audit.log(
        db=db, admin=current_admin,
        action="order.cancelled",
        resource_type="order",
        resource_id=order.id,
        resource_label=order.order_number,
        request=request,
    )
    db.commit()

    return order


@router.put("/{order_id}/tracking", response_model=OrderResponse)
def update_tracking(
    order_id:        int,
    tracking_status: str,
    request:         Request,
    db:              Session = Depends(get_db),
    current_admin:   Admin   = Depends(get_current_admin),
):
    """Admin — update tracking status only."""
    order = order_service.update_tracking(db, order_id, tracking_status)

    audit.log(
        db=db, admin=current_admin,
        action="order.tracking_updated",
        resource_type="order",
        resource_id=order.id,
        resource_label=order.order_number,
        changes={"tracking_status": tracking_status},
        request=request,
    )
    db.commit()

    return order


# ─────────────────────────────────────────────────────────────
# Customer storefront
# ─────────────────────────────────────────────────────────────

@router.post("/customer", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_customer_order(
    order_in:         OrderCreate,
    db:               Session  = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """Storefront — authenticated customer places an order."""
    return order_service.create_order_customer(db, order_in, current_customer)


@router.get("/customer/all", response_model=OrderListResponse)
def list_customer_orders(
    page:     int     = Query(1, ge=1),
    per_page: int     = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    db:       Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """Storefront — return paginated orders for the authenticated customer."""
    return order_service.list_customer_orders(
        db, current_customer, page=page, per_page=per_page,
    )


@router.get("/customer/{order_id}", response_model=OrderResponse)
def get_customer_order(
    order_id:         int,
    db:               Session  = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """Storefront — fetch a specific order owned by the current customer."""
    return order_service.get_customer_order(db, order_id, current_customer)


@router.post("/customer/{order_id}/cancel", response_model=OrderResponse)
def cancel_customer_order(
    order_id:         int,
    db:               Session  = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """Storefront — customer cancels their own order (blocked after SHIPPED/DELIVERED)."""
    return order_service.cancel_order_customer(db, order_id, current_customer)


# ─────────────────────────────────────────────────────────────
# Public — order tracking (no auth)
# ─────────────────────────────────────────────────────────────

@router.get("/track/{order_number}", response_model=OrderTrackingResponse)
def track_order_by_number(
    order_number: str,
    db:           Session = Depends(get_db),
):
    """
    Public order tracking — no authentication required.
    Returns only shipping/status fields; strips all customer PII.
    """
    return order_service.get_order_by_number(db, order_number)
