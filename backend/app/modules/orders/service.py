"""
app/modules/orders/service.py

Order business logic — completely extracted from the router.

RESPONSIBILITIES
----------------
- Order creation (admin and customer paths)
- Inventory check, decrement, and restoration
- Cancellation rules (customer vs admin)
- Delivery date estimation
- Order update and tracking status transitions
- Pagination and filtering

WHAT THIS LAYER DOES NOT DO
----------------------------
- No HTTPException — raises domain exceptions only
- No SQLAlchemy queries — delegates entirely to OrderRepository
- No knowledge of request/response schemas — works with plain dicts and ORM objects
- No HTTP context (Request, Response) — those belong in the router

TRANSACTION STRATEGY
--------------------
Service methods call repo methods that flush but do NOT commit.
The service calls db.commit() itself at the end of each operation,
ensuring the entire business operation (order + inventory decrement)
is atomic. If any step raises, the caller's exception propagates and
no commit is made — SQLAlchemy will roll back on session close.
"""

from __future__ import annotations

import logging
import math
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.modules.customers.models import Customer
from app.modules.orders.constants import (
    DEFAULT_DELIVERY_DAYS,
    DEFAULT_PAGE_SIZE,
    DELIVERY_DAYS_MAP,
    ItemType,
    TrackingStatus,
)
from app.modules.orders.models import Order
from app.modules.orders.repository import OrderRepository
from app.modules.orders.schemas import (
    OrderCreate,
    OrderListResponse,
    OrderResponse,
    OrderTrackingResponse,
    OrderUpdate,
)
from app.shared.exceptions import BusinessRuleError, NotFoundError

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Delivery helpers
# ─────────────────────────────────────────────────────────────

def _calculate_delivery(city: Optional[str], ordered_at: datetime) -> Tuple[int, datetime]:
    """
    Return (delivery_days, expected_delivery_date) for the given city.
    Falls back to DEFAULT_DELIVERY_DAYS when city is unknown.
    """
    cleaned_city = ""
    if city:
        try:
            from app.shared.normalization import normalize_name
            cleaned_city = normalize_name(city).canonical_name
        except Exception:
            cleaned_city = city.strip()
            
    days     = DELIVERY_DAYS_MAP.get(cleaned_city, DEFAULT_DELIVERY_DAYS)
    due_date = ordered_at + timedelta(days=days)
    return days, due_date


# ─────────────────────────────────────────────────────────────
# Inventory helpers (internal — called by create / cancel)
# ─────────────────────────────────────────────────────────────

def _check_and_decrement_stock(
    repo: OrderRepository,
    order_in: OrderCreate,
) -> None:
    """
    Lock the matching ProductVariant and decrement stock atomically.

    Called only when item_type == ItemType.PRODUCT and size is present.
    No-op when the product has no variant record (legacy data path).

    Raises:
        BusinessRuleError: If stock is insufficient.
    """
    item_type = (order_in.item_type or ItemType.PRODUCT).upper()
    if item_type != ItemType.PRODUCT:
        return
    if not order_in.size:
        return

    variant = repo.lock_variant_for_order(
        product_id=order_in.product_id,
        product_name=order_in.product_name,
        size=order_in.size,
        color=order_in.color,
    )

    if variant is None:
        # No inventory record for this product — proceed without stock management.
        # This covers custom product orders routed through PRODUCT item_type
        # (legacy) and products that were added without variants.
        logger.debug(
            "No variant found for product_id=%s product_name=%s size=%s color=%s — skipping stock check.",
            order_in.product_id, order_in.product_name, order_in.size, order_in.color,
        )
        return

    qty = order_in.quantity or 1
    if variant.stock_quantity < qty:
        raise BusinessRuleError(
            f"Insufficient stock for '{order_in.product_name}' (size: {order_in.size}). "
            f"Available: {variant.stock_quantity}, requested: {qty}.",
            code="INSUFFICIENT_STOCK",
            context={
                "product": order_in.product_name,
                "size": order_in.size,
                "available": variant.stock_quantity,
                "requested": qty,
            },
        )

    repo.decrement_stock(variant, qty)

    # Check if stock dropped below low_stock_threshold
    if variant.stock_quantity <= variant.low_stock_threshold:
        try:
            from app.modules.settings.service import get_or_create_store_settings
            settings_row = get_or_create_store_settings(repo.db)
            to_email = settings_row.support_email or "admin@example.com"
            from app.shared.notifications.service import send_notification_sync
            send_notification_sync(
                db=repo.db,
                event_name="Low Stock Alert",
                to_email=to_email,
                context={"product_name": order_in.product_name, "stock": variant.stock_quantity},
                subject=f"Low Stock Alert: {order_in.product_name}",
                text_body=f"Product {order_in.product_name} (Size: {variant.size}) is low on stock. Current stock: {variant.stock_quantity}.",
                html_body=f"<p>Product <strong>{order_in.product_name}</strong> (Size: {variant.size}) is low on stock. Current stock: <strong>{variant.stock_quantity}</strong>.</p>",
            )
        except Exception as e:
            logger.error(f"Failed to send low stock alert: {e}", exc_info=True)


def _restore_inventory(repo: OrderRepository, order: Order) -> None:
    """
    Restore stock for a cancelled order's variant.

    Only called on the PLACED → CANCELLED transition (not idempotent by design —
    the caller must guard against double-restoration with the current status check).
    """
    variant = repo.find_variant_for_order(order)
    if variant is not None:
        repo.restore_stock(variant, order.quantity or 1)
        logger.info(
            "Inventory restored: variant_id=%s qty=%s order_id=%s",
            variant.id, order.quantity, order.id,
        )


# ─────────────────────────────────────────────────────────────
# Order creation (shared core)
# ─────────────────────────────────────────────────────────────

def _build_and_persist_order(
    repo: OrderRepository,
    order_in: OrderCreate,
    order_number: str,
    customer: Optional[Customer] = None,
) -> Order:
    """
    Build an Order ORM object, perform stock checks, and flush to the session.
    Does NOT commit — caller commits after audit log flush.

    Args:
        repo:         OrderRepository bound to the current session.
        order_in:     Validated create schema from the router.
        order_number: Pre-generated unique order number.
        customer:     If set, overrides customer fields from the Customer record
                      (storefront path). Admin path passes None.
    """
    now_utc = datetime.now(timezone.utc)
    delivery_days, expected_date = _calculate_delivery(order_in.city, now_utc)

    data = order_in.model_dump(exclude={"order_number"})

    # Storefront path: override customer fields from the authenticated Customer
    if customer is not None:
        data["customer_name"]  = f"{customer.first_name} {customer.last_name}"
        data["customer_email"] = customer.email
        data["customer_phone"] = customer.phone or order_in.customer_phone

    # Apply email and address normalization
    from app.shared.normalization import normalize_email, normalize_name
    
    if "customer_email" in data and data["customer_email"]:
        data["customer_email"] = normalize_email(data["customer_email"])
        
    if "city" in data and data["city"]:
        try:
            data["city"] = normalize_name(data["city"]).canonical_name
        except Exception:
            data["city"] = data["city"].strip()
            
    if "state" in data and data["state"]:
        try:
            data["state"] = normalize_name(data["state"]).canonical_name
        except Exception:
            data["state"] = data["state"].strip()
            
    if "country" in data and data["country"]:
        try:
            data["country"] = normalize_name(data["country"]).canonical_name
        except Exception:
            data["country"] = data["country"].strip()

    data["delivery_days"]          = delivery_days
    data["expected_delivery_date"] = expected_date
    data["ordered_at"]             = now_utc
    data["item_type"]              = (order_in.item_type or ItemType.PRODUCT).upper()

    # ── Inventory check + decrement (atomic with the order INSERT) ────────────
    _check_and_decrement_stock(repo, order_in)

    order = Order(order_number=order_number, **data)
    return repo.create_order(order)


# ─────────────────────────────────────────────────────────────
# Public service functions
# ─────────────────────────────────────────────────────────────

def list_orders(
    db: Session,
    *,
    page: int = 1,
    per_page: int = DEFAULT_PAGE_SIZE,
    search: Optional[str] = None,
    tracking_status: Optional[str] = None,
    payment_status: Optional[str] = None,
    item_type: Optional[str] = None,
) -> OrderListResponse:
    """
    Return a paginated list of all orders for the admin panel.
    Replaces the bare List[OrderResponse] returned by the old list_orders endpoint.
    """
    repo = OrderRepository(db)
    orders, total = repo.list_paginated(
        page=page,
        per_page=per_page,
        search=search,
        tracking_status=tracking_status,
        payment_status=payment_status,
        item_type=item_type,
    )
    return OrderListResponse(
        items=[OrderResponse.model_validate(o) for o in orders],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=math.ceil(total / per_page) if total else 1,
    )


def get_order(db: Session, order_id: int) -> OrderResponse:
    """Fetch a single order by PK. Raises NotFoundError if missing."""
    repo  = OrderRepository(db)
    order = repo.get_order_or_raise(order_id)
    return OrderResponse.model_validate(order)


def get_order_by_number(db: Session, order_number: str) -> OrderTrackingResponse:
    """
    Public tracking lookup by order number.
    Returns only shipping/status fields — no customer PII.
    """
    repo  = OrderRepository(db)
    order = repo.get_by_order_number(order_number)
    if order is None:
        raise NotFoundError(f"Order '{order_number}' not found.", code="ORDER_NOT_FOUND")
    return OrderTrackingResponse.model_validate(order)


def _handle_status_transition_notifications(
    db: Session,
    order: Order,
    old_status: Optional[str],
    new_status: str,
) -> None:
    old_status_upper = (old_status or "").upper()
    new_status_upper = new_status.upper()

    if old_status_upper == new_status_upper:
        return

    from app.shared.notifications.service import send_notification_sync

    if new_status_upper == "SHIPPED":
        send_notification_sync(
            db=db,
            event_name="Order Shipped",
            to_email=order.customer_email,
            context={"order_number": order.order_number},
            subject=f"Your order #{order.order_number} has been shipped!",
            text_body=f"Great news! Your order #{order.order_number} has been shipped. It will arrive soon.",
            html_body=f"<p>Great news! Your order #{order.order_number} has been shipped. It will arrive soon.</p>",
        )
    elif new_status_upper == "CANCELLED":
        send_notification_sync(
            db=db,
            event_name="Order Cancelled",
            to_email=order.customer_email,
            context={"order_number": order.order_number},
            subject=f"Your order #{order.order_number} has been cancelled",
            text_body=f"Your order #{order.order_number} has been cancelled successfully.",
            html_body=f"<p>Your order #{order.order_number} has been cancelled successfully.</p>",
        )


def create_order_admin(db: Session, order_in: OrderCreate) -> OrderResponse:
    """
    Create an order through the admin panel.
    Validates order number uniqueness, checks stock, and persists atomically.
    """
    repo = OrderRepository(db)

    order_number = order_in.order_number or repo.generate_order_number()

    if order_in.order_number and repo.order_number_exists(order_in.order_number):
        raise BusinessRuleError(
            f"Order number '{order_in.order_number}' already exists.",
            code="DUPLICATE_ORDER_NUMBER",
        )

    order = _build_and_persist_order(repo, order_in, order_number)
    db.commit()
    db.refresh(order)
    logger.info("Admin order created: order_number=%s", order.order_number)

    # Trigger New Order Placed notification
    try:
        from app.shared.notifications.service import send_notification_sync
        send_notification_sync(
            db=db,
            event_name="New Order Placed",
            to_email=order.customer_email,
            context={"order_number": order.order_number, "total_amount": float(order.total_amount)},
            subject=f"Order Placed successfully! - #{order.order_number}",
            text_body=f"Your order #{order.order_number} has been placed successfully. Thank you for shopping with us!",
            html_body=f"<p>Your order #{order.order_number} has been placed successfully. Thank you for shopping with us!</p>",
        )
    except Exception as e:
        logger.error(f"Failed to send order placed notification: {e}", exc_info=True)

    return OrderResponse.model_validate(order)


def reconcile_pending_orders(db: Session, customer_email: str):
    """
    Check for any pending online orders with a razorpay_order_id, fetch from Razorpay API,
    and update them to PAID if paid on Razorpay.
    """
    pending_orders = db.query(Order).filter(
        Order.customer_email == customer_email,
        Order.payment_status == "PENDING",
        Order.payment_method == "ONLINE",
        Order.razorpay_order_id.isnot(None),
    ).all()

    if not pending_orders:
        return

    from collections import defaultdict
    by_rzp_id = defaultdict(list)
    for o in pending_orders:
        by_rzp_id[o.razorpay_order_id].append(o)

    from app.core.config import settings
    import razorpay

    try:
        client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )
        for rzp_order_id, orders in by_rzp_id.items():
            try:
                rzp_order = client.order.fetch(rzp_order_id)
                if rzp_order.get("status") == "paid":
                    payments_res = client.order.payments(rzp_order_id)
                    payment_items = payments_res.get("items", [])
                    captured_payment = next(
                        (p for p in payment_items if p.get("status") in ("captured", "authorized")),
                        None
                    )
                    payment_id = captured_payment.get("id") if captured_payment else "auto_reconciled"

                    logger.info(
                        "Reconciliation: Order %s paid on Razorpay. Updating db to PAID.",
                        rzp_order_id
                    )
                    for order in orders:
                        order.payment_status = "PAID"
                        order.payment_verified_at = datetime.utcnow()
                        order.razorpay_payment_id = payment_id
                    db.commit()
            except Exception as e:
                logger.warning(
                    "Reconciliation: Failed to check/update Razorpay Order %s: %s",
                    rzp_order_id, e
                )
    except Exception as general_err:
        logger.error("Failed to run Razorpay reconciliation: %s", general_err)


def process_razorpay_webhook_payment(
    db: Session,
    razorpay_order_id: str,
    razorpay_payment_id: str,
) -> int:
    """
    Idempotently processes a successful Razorpay payment webhook.
    Marks all corresponding pending orders as PAID and returns the count of updated rows.
    """
    orders = db.query(Order).filter(Order.razorpay_order_id == razorpay_order_id).all()
    if not orders:
        logger.warning(
            "Webhook: No database orders found matching razorpay_order_id %s",
            razorpay_order_id
        )
        return 0

    already_paid_count = sum(1 for o in orders if o.payment_status == "PAID")
    if already_paid_count == len(orders):
        logger.info(
            "Webhook: All orders for razorpay_order_id %s are already PAID. Exiting safely.",
            razorpay_order_id
        )
        return 0

    updated_count = 0
    now = datetime.utcnow()
    for order in orders:
        if order.payment_status == "PENDING":
            order.payment_status = "PAID"
            order.payment_verified_at = now
            if razorpay_payment_id:
                order.razorpay_payment_id = razorpay_payment_id
            updated_count += 1
            
            try:
                from app.shared.notifications.service import send_notification_sync
                send_notification_sync(
                    db=db,
                    event_name="Order Payment Completed",
                    to_email=order.customer_email,
                    context={"order_number": order.order_number, "total_amount": float(order.total_amount)},
                    subject=f"Payment Confirmed! - #{order.order_number}",
                    text_body=f"Your payment for order #{order.order_number} has been received and confirmed. Thank you!",
                    html_body=f"<p>Your payment for order #{order.order_number} has been received and confirmed. Thank you!</p>",
                )
            except Exception as notify_err:
                logger.error(
                    "Webhook: Failed to send payment completion notification for order %s: %s",
                    order.order_number, notify_err
                )
    
    if updated_count > 0:
        db.commit()
        logger.info(
            "Webhook: Successfully reconciled %d pending orders for razorpay_order_id %s to PAID.",
            updated_count, razorpay_order_id
        )

    return updated_count


def create_order_customer(
    db: Session,
    order_in: OrderCreate,
    customer: Customer,
) -> OrderResponse:
    """
    Create an order through the storefront (authenticated customer).
    Customer fields are taken from the Customer record, not the request body.
    """
    # 1. Run Razorpay reconciliation first so any paid orders are correctly updated
    reconcile_pending_orders(db, customer.email)

    # 2. Check if customer already has an active unpaid online checkout
    if order_in.payment_method == "ONLINE":
        existing_pending = db.query(Order).filter(
            Order.customer_email == customer.email,
            Order.payment_status == "PENDING",
            Order.payment_method == "ONLINE",
            Order.cart_session_id.isnot(None),
        ).all()
        
        if existing_pending:
            active_session_id = existing_pending[0].cart_session_id
            if order_in.cart_session_id != active_session_id:
                # Try to see if there's a matching order in the existing session
                matching = [
                    o for o in existing_pending
                    if o.product_id == order_in.product_id
                    and o.size == order_in.size
                    and o.color == order_in.color
                ]
                if matching:
                    return OrderResponse.model_validate(matching[0])
                
                raise BusinessRuleError(
                    f"An active unpaid checkout session '{active_session_id}' already exists.",
                    code="ACTIVE_CHECKOUT_EXISTS",
                )

    repo         = OrderRepository(db)
    order_number = repo.generate_order_number()

    order = _build_and_persist_order(repo, order_in, order_number, customer=customer)
    db.commit()
    db.refresh(order)
    logger.info(
        "Customer order created: order_number=%s customer_email=%s",
        order.order_number, customer.email,
    )

    # Trigger New Order Placed notification
    try:
        from app.shared.notifications.service import send_notification_sync
        send_notification_sync(
            db=db,
            event_name="New Order Placed",
            to_email=order.customer_email,
            context={"order_number": order.order_number, "total_amount": float(order.total_amount)},
            subject=f"Order Placed successfully! - #{order.order_number}",
            text_body=f"Your order #{order.order_number} has been placed successfully. Thank you for shopping with us!",
            html_body=f"<p>Your order #{order.order_number} has been placed successfully. Thank you for shopping with us!</p>",
        )
    except Exception as e:
        logger.error(f"Failed to send order placed notification: {e}", exc_info=True)

    return OrderResponse.model_validate(order)


def update_order(db: Session, order_id: int, payload: OrderUpdate) -> OrderResponse:
    """
    Admin update for an order.
    Handles inventory restoration when tracking_status transitions to CANCELLED.
    """
    repo   = OrderRepository(db)
    order  = repo.get_order_or_raise(order_id)
    old_tracking_status = order.tracking_status
    old_payment_status = order.payment_status
    update = payload.model_dump(exclude_unset=True)

    from app.shared.normalization import normalize_email, normalize_name
    
    if "customer_email" in update and update["customer_email"]:
        update["customer_email"] = normalize_email(update["customer_email"])
        
    if "city" in update and update["city"]:
        try:
            update["city"] = normalize_name(update["city"]).canonical_name
        except Exception:
            update["city"] = update["city"].strip()
            
    if "state" in update and update["state"]:
        try:
            update["state"] = normalize_name(update["state"]).canonical_name
        except Exception:
            update["state"] = update["state"].strip()
            
    if "country" in update and update["country"]:
        try:
            update["country"] = normalize_name(update["country"]).canonical_name
        except Exception:
            update["country"] = update["country"].strip()

    new_status = update.get("tracking_status")
    if new_status is not None:
        _handle_cancellation_transition(repo, order, new_status)

    repo.update_order_fields(order, update)
    db.commit()
    db.refresh(order)

    # Trigger tracking status transition notification
    if new_status is not None:
        try:
            _handle_status_transition_notifications(db, order, old_tracking_status, new_status)
        except Exception as e:
            logger.error(f"Failed to send status transition notification: {e}", exc_info=True)

    # Trigger Refund Processed notification
    new_payment_status = update.get("payment_status")
    if new_payment_status is not None and new_payment_status.upper() == "REFUNDED" and (old_payment_status or "").upper() != "REFUNDED":
        try:
            from app.shared.notifications.service import send_notification_sync
            send_notification_sync(
                db=db,
                event_name="Refund Processed",
                to_email=order.customer_email,
                context={"order_number": order.order_number, "total_amount": float(order.total_amount)},
                subject=f"Refund Processed for Order #{order.order_number}",
                text_body=f"We have processed a refund of {order.total_amount} for your order #{order.order_number}.",
                html_body=f"<p>We have processed a refund of <strong>{order.total_amount}</strong> for your order #{order.order_number}.</p>",
            )
        except Exception as e:
            logger.error(f"Failed to send refund notification: {e}", exc_info=True)

    return OrderResponse.model_validate(order)


def cancel_order_admin(db: Session, order_id: int) -> OrderResponse:
    """
    Admin-initiated cancellation. No status restrictions.
    Restores inventory if not already cancelled.
    """
    repo  = OrderRepository(db)
    order = repo.get_order_or_raise(order_id)
    old_tracking_status = order.tracking_status

    if order.tracking_status != TrackingStatus.CANCELLED:
        _restore_inventory(repo, order)

    repo.update_order_fields(order, {"tracking_status": TrackingStatus.CANCELLED})
    db.commit()
    db.refresh(order)
    logger.info("Admin cancelled order: order_id=%s", order_id)

    try:
        _handle_status_transition_notifications(db, order, old_tracking_status, TrackingStatus.CANCELLED)
    except Exception as e:
        logger.error(f"Failed to send cancellation notification: {e}", exc_info=True)

    return OrderResponse.model_validate(order)


def cancel_order_customer(
    db: Session,
    order_id: int,
    customer: Customer,
) -> OrderResponse:
    """
    Customer-initiated cancellation.
    Blocked if order is already SHIPPED or DELIVERED.
    Customer ownership is enforced — raises NotFoundError if order does not belong to them.
    """
    repo  = OrderRepository(db)
    order = repo.get_customer_order_or_raise(order_id, customer.email)
    old_tracking_status = order.tracking_status

    if order.tracking_status in TrackingStatus.NON_CANCELLABLE:
        raise BusinessRuleError(
            "Cannot cancel an order that has already been shipped or delivered.",
            code="ORDER_NOT_CANCELLABLE",
            context={"tracking_status": order.tracking_status},
        )

    if order.tracking_status != TrackingStatus.CANCELLED:
        _restore_inventory(repo, order)

    repo.update_order_fields(order, {"tracking_status": TrackingStatus.CANCELLED})
    db.commit()
    db.refresh(order)
    logger.info(
        "Customer cancelled order: order_id=%s customer_email=%s",
        order_id, customer.email,
    )

    try:
        _handle_status_transition_notifications(db, order, old_tracking_status, TrackingStatus.CANCELLED)
    except Exception as e:
        logger.error(f"Failed to send cancellation notification: {e}", exc_info=True)

    return OrderResponse.model_validate(order)


def update_tracking(db: Session, order_id: int, tracking_status: str) -> OrderResponse:
    """
    Update tracking status only — used by the dedicated tracking endpoint.
    Restores inventory on PLACED → CANCELLED transition.
    """
    repo  = OrderRepository(db)
    order = repo.get_order_or_raise(order_id)
    old_tracking_status = order.tracking_status

    _handle_cancellation_transition(repo, order, tracking_status)

    repo.update_order_fields(order, {"tracking_status": tracking_status})
    db.commit()
    db.refresh(order)

    try:
        _handle_status_transition_notifications(db, order, old_tracking_status, tracking_status)
    except Exception as e:
        logger.error(f"Failed to send tracking transition notification: {e}", exc_info=True)

    return OrderResponse.model_validate(order)



def list_customer_orders(
    db: Session,
    customer: Customer,
    *,
    page: int = 1,
    per_page: int = DEFAULT_PAGE_SIZE,
) -> OrderListResponse:
    """Return paginated orders for an authenticated customer."""
    reconcile_pending_orders(db, customer.email)

    repo    = OrderRepository(db)
    orders, total = repo.list_paginated(
        page=page,
        per_page=per_page,
        customer_email=customer.email,
    )
    return OrderListResponse(
        items=[OrderResponse.model_validate(o) for o in orders],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=math.ceil(total / per_page) if total else 1,
    )


def get_customer_order(
    db: Session,
    order_id: int,
    customer: Customer,
) -> OrderResponse:
    """Fetch a customer's own order by PK. Raises NotFoundError for missing or not-owned."""
    repo  = OrderRepository(db)
    order = repo.get_customer_order_or_raise(order_id, customer.email)
    return OrderResponse.model_validate(order)


# ─────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────

def _handle_cancellation_transition(
    repo: OrderRepository,
    order: Order,
    new_status: str,
) -> None:
    """
    Detect PLACED → CANCELLED transitions and restore inventory once.

    Called by update_order and update_tracking before persisting the new status.
    The "only once" guarantee is enforced by checking that the current status
    is NOT already CANCELLED before restoring.
    """
    is_now_cancelled = new_status.upper() == TrackingStatus.CANCELLED
    was_cancelled    = (order.tracking_status or "").upper() == TrackingStatus.CANCELLED

    if is_now_cancelled and not was_cancelled:
        _restore_inventory(repo, order)


# ─────────────────────────────────────────────────────────────
# Razorpay Integration Service Methods
# ─────────────────────────────────────────────────────────────

def create_razorpay_order(
    db: Session,
    cart_session_id: str,
    customer: Customer,
) -> dict:
    """
    Find all orders with cart_session_id belonging to customer, calculate total,
    reuse existing pending and usable Razorpay order if present, or create a new one.
    """
    from app.shared.exceptions import ExternalServiceError, NotFoundError
    import razorpay
    from app.core.config import settings

    repo = OrderRepository(db)
    orders = repo.get_by_cart_session_id(cart_session_id)
    if not orders:
        raise NotFoundError(
            f"No orders found for cart session '{cart_session_id}'.",
            code="ORDER_NOT_FOUND",
        )

    for order in orders:
        if order.customer_email != customer.email:
            raise NotFoundError(
                f"No orders found for cart session '{cart_session_id}'.",
                code="ORDER_NOT_FOUND",
            )

    total_amount = sum(order.total_amount for order in orders)
    amount_paise = int(round(total_amount * 100))

    client = razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )

    # Check for order reuse eligibility
    existing_order_id = orders[0].razorpay_order_id if orders else None
    all_pending = all(order.payment_status == "PENDING" for order in orders)

    if all_pending and existing_order_id:
        try:
            rzp_order = client.order.fetch(existing_order_id)
            if (
                rzp_order.get("status") in ("created", "attempted")
                and rzp_order.get("amount") == amount_paise
            ):
                logger.info(
                    "Reusing existing Razorpay Order: %s for cart_session_id: %s",
                    existing_order_id,
                    cart_session_id,
                )
                return {
                    "id": rzp_order["id"],
                    "amount": rzp_order["amount"],
                    "currency": rzp_order["currency"],
                    "key": settings.RAZORPAY_KEY_ID,
                    "receipt": rzp_order.get("receipt"),
                    "status": rzp_order.get("status"),
                }
        except Exception as fetch_err:
            logger.warning(
                "Could not reuse existing Razorpay Order %s: %s. Creating a new one.",
                existing_order_id,
                fetch_err,
            )

    try:
        razorpay_order = client.order.create(
            {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": f"rcpt_{cart_session_id[:20]}",
                "notes": {
                    "cart_session_id": cart_session_id,
                    "customer_email": customer.email,
                },
            }
        )
    except Exception as e:
        logger.exception("Razorpay SDK order creation failed")
        raise ExternalServiceError(
            f"Razorpay API failure: {str(e)}",
            code="RAZORPAY_API_FAILURE",
        )

    try:
        for order in orders:
            repo.update_order_fields(
                order,
                {
                    "razorpay_order_id": razorpay_order["id"],
                    "payment_method": "RAZORPAY",
                },
            )
        db.commit()
    except Exception as db_err:
        db.rollback()
        logger.exception("Database persistence of razorpay_order_id failed")
        raise BusinessRuleError(
            "Failed to save Razorpay order ID to the database.",
            code="DATABASE_ERROR",
        )

    return {
        "id": razorpay_order["id"],
        "amount": razorpay_order["amount"],
        "currency": razorpay_order["currency"],
        "key": settings.RAZORPAY_KEY_ID,
        "receipt": razorpay_order.get("receipt"),
        "status": razorpay_order.get("status"),
    }


def verify_razorpay_payment(
    db: Session,
    cart_session_id: str,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    customer: Customer,
) -> list[OrderResponse]:
    """
    Verify the payment signature with Razorpay SDK, update payment status to PAID,
    tracking status to CONFIRMED, and record payment metadata.
    """
    from app.shared.exceptions import ConflictError, NotFoundError
    from app.modules.orders.constants import PaymentStatus, TrackingStatus
    import razorpay
    from app.core.config import settings

    repo = OrderRepository(db)
    orders = repo.get_by_cart_session_id(cart_session_id)
    if not orders:
        raise NotFoundError(
            f"No orders found for cart session '{cart_session_id}'.",
            code="ORDER_NOT_FOUND",
        )

    for order in orders:
        if order.customer_email != customer.email:
            raise NotFoundError(
                f"No orders found for cart session '{cart_session_id}'.",
                code="ORDER_NOT_FOUND",
            )

    # 1. Idempotency Check: if already PAID, return cached orders without modifying anything
    if any(order.payment_status == PaymentStatus.PAID for order in orders):
        logger.info(
            "Payment already verified (PAID) for cart_session_id=%s. Returning cached orders.",
            cart_session_id,
        )
        return [OrderResponse.model_validate(order) for order in orders]

    # 2. Duplicate Verification: check if payment ID has already been used on a DIFFERENT session
    duplicate_payment = (
        db.query(Order)
        .filter(
            Order.razorpay_payment_id == razorpay_payment_id,
            Order.cart_session_id != cart_session_id,
        )
        .first()
    )
    if duplicate_payment:
        raise ConflictError(
            f"Payment ID '{razorpay_payment_id}' has already been verified for another transaction.",
            code="DUPLICATE_VERIFICATION",
        )

    # 3. Signature Verification using official SDK
    try:
        client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            }
        )
    except Exception as e:
        logger.warning("Razorpay signature verification failed: %s", e)
        raise BusinessRuleError(
            "Invalid payment signature.",
            code="INVALID_SIGNATURE",
        )

    # 4. Atomic Transaction update
    try:
        now_utc = datetime.now(timezone.utc)
        for order in orders:
            repo.update_order_fields(
                order,
                {
                    "razorpay_payment_id": razorpay_payment_id,
                    "razorpay_signature": razorpay_signature,
                    "payment_status": PaymentStatus.PAID,
                    "payment_verified_at": now_utc,
                    "tracking_status": TrackingStatus.CONFIRMED,
                },
            )
        db.commit()
        for order in orders:
            db.refresh(order)
    except Exception as db_err:
        db.rollback()
        logger.exception("Database update during payment verification failed")
        raise BusinessRuleError(
            "Failed to update payment status in database.",
            code="DATABASE_ERROR",
        )

    return [OrderResponse.model_validate(order) for order in orders]

