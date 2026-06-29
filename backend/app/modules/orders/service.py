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
    days     = DELIVERY_DAYS_MAP.get(city or "", DEFAULT_DELIVERY_DAYS)
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


def create_order_customer(
    db: Session,
    order_in: OrderCreate,
    customer: Customer,
) -> OrderResponse:
    """
    Create an order through the storefront (authenticated customer).
    Customer fields are taken from the Customer record, not the request body.
    """
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
