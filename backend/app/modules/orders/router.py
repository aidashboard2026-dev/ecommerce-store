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

from fastapi import APIRouter, Depends, Query, Request, status, Header, BackgroundTasks
from fastapi.responses import Response
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
    RazorpayOrderCreateRequest,
    RazorpayOrderCreateResponse,
    RazorpayPaymentVerifyRequest,
)
from app.shared.invoice import generate_invoice_pdf, invoice_filename

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


@router.get("/{order_id}/invoice")
def download_invoice_admin(
    order_id: int,
    db:       Session = Depends(get_db),
    _:        Admin   = Depends(get_current_admin),
):
    """
    Admin — generate and download the invoice PDF for any order.

    Uses the single shared invoice generator (app.shared.invoice.service).
    The PDF is identical to the customer download and email attachment.
    """
    order = order_service.get_order(db, order_id)
    pdf_bytes = generate_invoice_pdf(order, db=db)
    filename  = invoice_filename(order)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ─────────────────────────────────────────────────────────────
# Admin — create / update / cancel / tracking
# ─────────────────────────────────────────────────────────────

@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in:         OrderCreate,
    request:          Request,
    background_tasks: BackgroundTasks,
    db:               Session = Depends(get_db),
    current_admin:    Admin   = Depends(get_current_admin),
):
    """Admin — create an order manually."""
    order = order_service.create_order_admin(db, order_in, background_tasks=background_tasks)

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
    order_id:         int,
    payload:          OrderUpdate,
    request:          Request,
    background_tasks: BackgroundTasks,
    db:               Session = Depends(get_db),
    current_admin:    Admin = Depends(get_current_admin),
):
    """Admin — update order fields (status, tracking, payment)."""
    order = order_service.update_order(db, order_id, payload, background_tasks=background_tasks)

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
    order_id:         int,
    request:          Request,
    background_tasks: BackgroundTasks,
    db:               Session = Depends(get_db),
    current_admin:    Admin = Depends(get_current_admin),
):
    """Admin — cancel an order (no status restrictions)."""
    order = order_service.cancel_order_admin(db, order_id, background_tasks=background_tasks)

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
    background_tasks: BackgroundTasks,
    db:              Session = Depends(get_db),
    current_admin:   Admin   = Depends(get_current_admin),
):
    """Admin — update tracking status only."""
    order = order_service.update_tracking(db, order_id, tracking_status, background_tasks=background_tasks)

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
# Admin — cleanup expired unpaid orders
# ─────────────────────────────────────────────────────────────

@router.post("/cleanup-expired", status_code=status.HTTP_200_OK)
def cleanup_expired_reservations(
    expiry_minutes: int = Query(30, ge=5, description="Orders older than this many minutes with payment_status=PENDING will be cancelled"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Cancel unpaid orders older than *expiry_minutes* and restore stock to inventory.

    Safe to call repeatedly (idempotent). Designed for external cron jobs
    (e.g. GitHub Actions scheduled workflow hitting this endpoint).

    Returns {\"cancelled\": int}.
    """
    count = order_service.release_expired_reservations(db, expiry_minutes=expiry_minutes)
    return {"cancelled": count}


# ─────────────────────────────────────────────────────────────
# Customer storefront
# ─────────────────────────────────────────────────────────────

@router.post("/customer", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_customer_order(
    order_in:         OrderCreate,
    background_tasks: BackgroundTasks,
    db:               Session  = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """Storefront — authenticated customer places an order."""
    return order_service.create_order_customer(db, order_in, current_customer, background_tasks=background_tasks)


@router.post("/customer/razorpay/create", response_model=RazorpayOrderCreateResponse)
def create_razorpay_order_endpoint(
    payload:          RazorpayOrderCreateRequest,
    db:               Session  = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """Storefront — create a Razorpay Order for a cart session.

    Production flow: send items + address to defer order creation until after payment.
    Legacy flow: send only cart_session_id (orders already exist in DB).
    """
    address = None
    if payload.customer_name:
        address = {
            "customer_name": payload.customer_name,
            "customer_phone": payload.customer_phone,
            "address_line1": payload.address_line1,
            "address_line2": payload.address_line2,
            "city": payload.city,
            "state": payload.state,
            "country": payload.country,
            "pincode": payload.pincode,
        }
    return order_service.create_razorpay_order(
        db,
        cart_session_id=payload.cart_session_id,
        customer=current_customer,
        items=payload.items,
        address=address,
    )


@router.post("/customer/razorpay/verify", response_model=list[OrderResponse])
def verify_razorpay_payment_endpoint(
    payload:          RazorpayPaymentVerifyRequest,
    background_tasks: BackgroundTasks,
    db:               Session  = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """Storefront — verify Razorpay payment and process the order.

    For the production flow: creates orders from Razorpay notes, decrements stock,
    sends email, and notifies admin. For the legacy flow: marks existing orders as PAID.
    """
    return order_service.verify_razorpay_payment(
        db,
        cart_session_id=payload.cart_session_id,
        razorpay_order_id=payload.razorpay_order_id,
        razorpay_payment_id=payload.razorpay_payment_id,
        razorpay_signature=payload.razorpay_signature,
        customer=current_customer,
        background_tasks=background_tasks,
    )


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
    background_tasks: BackgroundTasks,
    db:               Session  = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """Storefront — customer cancels their own order (blocked after SHIPPED/DELIVERED)."""
    return order_service.cancel_order_customer(db, order_id, current_customer, background_tasks=background_tasks)


@router.get("/customer/{order_id}/invoice")
def download_invoice_customer(
    order_id:         int,
    db:               Session  = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    """
    Storefront — customer downloads the invoice PDF for their own order.

    Ownership is enforced — the customer can only access invoices for orders
    belonging to their account. Uses the exact same PDF generator as the
    Admin endpoint and the Email attachment. One generator, three paths.
    """
    # get_customer_order_or_raise enforces ownership
    order = order_service.get_customer_order(db, order_id, current_customer)
    pdf_bytes = generate_invoice_pdf(order, db=db)
    filename  = invoice_filename(order)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


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





@router.post("/razorpay/webhook", status_code=status.HTTP_200_OK)
async def razorpay_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_razorpay_signature: str = Header(None),
    db: Session = Depends(get_db),
):
    """
    Razorpay Webhook endpoint to receive asynchronous order payment events.
    """
    import json
    import logging
    from app.core.config import settings
    from fastapi import HTTPException

    logger = logging.getLogger("app")

    if not x_razorpay_signature:
        logger.warning("Webhook received without signature header.")
        raise HTTPException(status_code=400, detail="Signature header missing.")

    body = await request.body()

    # Signature verification
    if settings.RAZORPAY_WEBHOOK_SECRET:
        import hmac
        import hashlib
        expected_sig = hmac.new(
            settings.RAZORPAY_WEBHOOK_SECRET.encode(),
            body,
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(expected_sig, x_razorpay_signature):
            logger.error("Webhook signature mismatch.")
            raise HTTPException(status_code=400, detail="Signature verification failed.")
    else:
        if settings.ENVIRONMENT.lower() == "production":
            logger.error("RAZORPAY_WEBHOOK_SECRET is missing in production. Signature verification cannot be skipped.")
            raise HTTPException(status_code=500, detail="Webhook configuration error.")
        logger.warning("RAZORPAY_WEBHOOK_SECRET is missing. Skipping signature verification in development.")

    try:
        data = json.loads(body.decode())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    event = data.get("event")
    if event not in ("order.paid", "payment.captured"):
        return {"status": "skipped", "message": f"Event '{event}' not processed."}

    payload = data.get("payload", {})
    order_entity = payload.get("order", {}).get("entity", {})
    payment_entity = payload.get("payment", {}).get("entity", {})

    razorpay_order_id = order_entity.get("id") or payment_entity.get("order_id")
    razorpay_payment_id = payment_entity.get("id")

    if not razorpay_order_id:
        logger.warning("Webhook event missing razorpay_order_id.")
        return {"status": "ignored", "message": "No razorpay_order_id found."}

    try:
        updated_count = order_service.process_razorpay_webhook_payment(
            db=db,
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=razorpay_payment_id,
            background_tasks=background_tasks
        )

        return {
            "status": "success",
            "message": f"Processed webhook event successfully. Updated {updated_count} order(s)."
        }
    except Exception as e:
        logger.error(f"Failed to process webhook event: {e}", exc_info=True)
        return {"status": "failed", "message": str(e)}
