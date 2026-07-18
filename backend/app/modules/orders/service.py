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

from decimal import Decimal

import logging
import math
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from fastapi import BackgroundTasks

from sqlalchemy.orm import Session
from app.core.config import settings

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

    # Note: Low stock alerts have been moved to a post-commit hook
    # to ensure notifications are only triggered if the order transaction is committed successfully.




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


def trigger_low_stock_alerts_post_commit(
    db: Session,
    order: Order,
    background_tasks: Optional[BackgroundTasks] = None,
) -> None:
    """
    Check if the order item variant stock is below threshold post-commit,
    and trigger low stock email and database notifications.
    """
    if order.item_type != ItemType.PRODUCT or not order.size:
        return

    from app.modules.products.models import ProductVariant
    # query the variant
    variant = (
        db.query(ProductVariant)
        .filter(
            ProductVariant.product_id == order.product_id,
            ProductVariant.size == order.size,
            ProductVariant.color == order.color,
        )
        .first()
    )

    if not variant:
        return

    if variant.stock_quantity <= variant.low_stock_threshold:
        # Create database notification
        try:
            from app.modules.notifications.service import create_admin_notification
            item_desc = f"{order.product_name} {variant.size or ''}".strip()
            create_admin_notification(
                db=db,
                title="⚠️ Low Stock",
                message=f"{item_desc}\nRemaining Stock: {variant.stock_quantity}",
                type="warning",
                event="Low Stock Alert",
                metadata={"product_name": order.product_name, "size": variant.size, "stock": variant.stock_quantity}
            )
            db.commit()
        except Exception as e:
            logger.error(f"Failed to create low stock admin notification: {e}", exc_info=True)

        # Trigger email notification
        try:
            from app.modules.settings.service import get_or_create_store_settings
            settings_row = get_or_create_store_settings(db)
            to_email = settings_row.support_email or "admin@example.com"

            if background_tasks:
                from app.shared.notifications.service import send_notification_background
                background_tasks.add_task(
                    send_notification_background,
                    event_name="Low Stock Alert",
                    to_email=to_email,
                    context={"product_name": order.product_name, "stock": variant.stock_quantity},
                    subject=f"Low Stock Alert: {order.product_name}",
                    text_body=f"Product {order.product_name} (Size: {variant.size}) is low on stock. Current stock: {variant.stock_quantity}.",
                    html_body=f"<p>Product <strong>{order.product_name}</strong> (Size: {variant.size}) is low on stock. Current stock: <strong>{variant.stock_quantity}</strong>.</p>",
                )
            else:
                from app.shared.notifications.service import send_notification_sync
                send_notification_sync(
                    db=db,
                    event_name="Low Stock Alert",
                    to_email=to_email,
                    context={"product_name": order.product_name, "stock": variant.stock_quantity},
                    subject=f"Low Stock Alert: {order.product_name}",
                    text_body=f"Product {order.product_name} (Size: {variant.size}) is low on stock. Current stock: {variant.stock_quantity}.",
                    html_body=f"<p>Product <strong>{order.product_name}</strong> (Size: {variant.size}) is low on stock. Current stock: <strong>{variant.stock_quantity}</strong>.</p>",
                )
        except Exception as e:
            logger.error(f"Failed to send low stock alert: {e}", exc_info=True)


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
        #hide_unpaid_online=True,
    )
    stats = repo.get_order_stats()

    return OrderListResponse(
        items=[OrderResponse.model_validate(o) for o in orders],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=math.ceil(total/per_page) if total else 1,
        stats=stats,
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
    background_tasks: Optional[BackgroundTasks] = None,
) -> None:
    old_status_upper = (old_status or "").upper()
    new_status_upper = new_status.upper()

    if old_status_upper == new_status_upper:
        return

    if new_status_upper == "SHIPPED":
        if background_tasks:
            from app.shared.notifications.service import send_notification_background
            background_tasks.add_task(
                send_notification_background,
                event_name="Order Shipped",
                to_email=order.customer_email,
                context={"order_number": order.order_number},
                subject=f"Your order #{order.order_number} has been shipped!",
                text_body=f"Great news! Your order #{order.order_number} has been shipped. It will arrive soon.",
                html_body=f"<p>Great news! Your order #{order.order_number} has been shipped. It will arrive soon.</p>",
            )
        else:
            from app.shared.notifications.service import send_notification_sync
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
        if background_tasks:
            from app.shared.notifications.service import send_notification_background
            background_tasks.add_task(
                send_notification_background,
                event_name="Order Cancelled",
                to_email=order.customer_email,
                context={"order_number": order.order_number},
                subject=f"Your order #{order.order_number} has been cancelled",
                text_body=f"Your order #{order.order_number} has been cancelled successfully.",
                html_body=f"<p>Your order #{order.order_number} has been cancelled successfully.</p>",
            )
        else:
            from app.shared.notifications.service import send_notification_sync
            send_notification_sync(
                db=db,
                event_name="Order Cancelled",
                to_email=order.customer_email,
                context={"order_number": order.order_number},
                subject=f"Your order #{order.order_number} has been cancelled",
                text_body=f"Your order #{order.order_number} has been cancelled successfully.",
                html_body=f"<p>Your order #{order.order_number} has been cancelled successfully.</p>",
            )


def create_order_admin(
    db: Session,
    order_in: OrderCreate,
    background_tasks: Optional[BackgroundTasks] = None,
) -> OrderResponse:
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
    try:
        from app.modules.notifications.service import create_admin_notification
        create_admin_notification(
            db=db,
            title="🛒 New Order Received",
            message=f"Order #{order.order_number}\nCustomer: {order.customer_name}\nAmount: ₹{int(order.total_amount)}",
            type="success",
            event="New Order Placed",
            metadata={"order_number": order.order_number, "customer_name": order.customer_name, "total_amount": float(order.total_amount)}
        )
    except Exception as e:
        logger.error(f"Failed to create admin notification for order {order.order_number}: {e}", exc_info=True)
    db.commit()
    db.refresh(order)

    # Post-Commit Hooks: Low stock alert and invoice email
    trigger_low_stock_alerts_post_commit(db, order, background_tasks=background_tasks)

    logger.info("Admin order created: order_number=%s", order.order_number)

    # Send order confirmation email with invoice PDF attached
    if background_tasks:
        from app.shared.email.service import send_order_confirmation_with_invoice_background
        background_tasks.add_task(send_order_confirmation_with_invoice_background, order.id)
    else:
        try:
            from app.shared.email.service import send_order_confirmation_with_invoice
            import asyncio
            asyncio.run(send_order_confirmation_with_invoice(order, db=db))
        except Exception as e:
            logger.error(f"Failed to send order confirmation with invoice: {e}", exc_info=True)

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
        Order.tracking_status != TrackingStatus.CANCELLED,
    ).all()

    if not pending_orders:
        return

    from collections import defaultdict
    by_rzp_id = defaultdict(list)
    for o in pending_orders:
        by_rzp_id[o.razorpay_order_id].append(o)

    from app.modules.payments.service import payment_service

    # Release the read transaction before making HTTP calls to Razorpay.
    # This prevents holding a DB connection open during network I/O.
    db.commit()

    try:
        client = payment_service.client
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
                        try:
                            from app.modules.notifications.service import create_admin_notification
                            create_admin_notification(
                                db=db,
                                title="💳 Payment Received",
                                message=f"Order #{order.order_number}\n₹{int(order.total_amount)}",
                                type="success",
                                event="Payment Received",
                                metadata={"order_number": order.order_number, "total_amount": float(order.total_amount)}
                            )
                        except Exception as notif_err:
                            logger.error(f"Reconciliation: Failed to create payment received admin notification for {order.order_number}: {notif_err}")
                    db.commit()

            except Exception as e:
                logger.warning(
                    "Reconciliation: Failed to check/update Razorpay Order %s: %s",
                    rzp_order_id, e
                )
    except Exception as general_err:
        logger.error("Failed to run Razorpay reconciliation: %s", general_err)


def release_expired_reservations(
    db: Session,
    expiry_minutes: int = 30,
) -> int:
    """
    Find orders that were created (ordered_at) more than *expiry_minutes* ago,
    still have payment_status = 'PENDING' and tracking_status = 'PLACED', and
    auto-cancel them — restoring stock to inventory.

    Returns the number of orders cancelled.

    Designed to be called periodically (e.g. by an external cron job hitting an
    admin endpoint). If the project later adds a proper scheduler, this function
    is the single integration point.
    """
    from datetime import timedelta

    cutoff = datetime.utcnow() - timedelta(minutes=expiry_minutes)

    stale_orders = db.query(Order).filter(
        Order.payment_status == "PENDING",
        Order.tracking_status == "PLACED",
        Order.ordered_at < cutoff,
    ).all()

    if not stale_orders:
        return 0

    from app.modules.orders.repository import OrderRepository
    repo = OrderRepository(db)

    cancelled_count = 0
    for order in stale_orders:
        try:
            repo.update_order_fields(order, {"tracking_status": TrackingStatus.CANCELLED})
            _restore_inventory(db, repo, order)
            cancelled_count += 1
        except Exception as exc:
            logger.error(
                "release_expired_reservations: failed to cancel order %s: %s",
                order.id, exc,
                exc_info=True,
            )

    if cancelled_count:
        db.commit()
        logger.info("release_expired_reservations: cancelled %d stale order(s).", cancelled_count)

    return cancelled_count


def process_razorpay_webhook_payment(
    db: Session,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    background_tasks: Optional[BackgroundTasks] = None,
) -> int:
    """
    Process a Razorpay payment webhook.

    For the production flow (no pre-existing orders): fetches cart_session_id
    from Razorpay notes, then delegates to _post_payment_success which creates
    orders, decrements stock, sends email, and notifies admin.

    For the legacy flow (orders pre-exist): marks existing pending orders as PAID,
    sends payment confirmation email and admin notification.

    Idempotent: returns 0 if orders are already PAID.
    """
    orders = db.query(Order).filter(Order.razorpay_order_id == razorpay_order_id).all()

    if orders:
        already_paid_count = sum(1 for o in orders if o.payment_status == "PAID")
        if already_paid_count == len(orders):
            logger.info("Webhook: All orders for razorpay_order_id %s are already PAID.", razorpay_order_id)
            return 0

        # Legacy path: orders exist, mark as PAID
        updated_orders = []
        now = datetime.utcnow()
        for order in orders:
            if order.payment_status == "PENDING":
                order.payment_status = "PAID"
                order.payment_verified_at = now
                if razorpay_payment_id:
                    order.razorpay_payment_id = razorpay_payment_id
                updated_orders.append(order)

        updated_count = len(updated_orders)
        if updated_count > 0:
            db.commit()
            logger.info("Webhook: Reconciled %d pending orders to PAID. Rzp Order: %s", updated_count, razorpay_order_id)

            for order in updated_orders:
                try:
                    if background_tasks:
                        from app.shared.notifications.service import send_notification_background
                        background_tasks.add_task(
                            send_notification_background,
                            event_name="Order Payment Completed",
                            to_email=order.customer_email,
                            context={"order_number": order.order_number, "total_amount": float(order.total_amount)},
                            subject=f"Payment Confirmed! - #{order.order_number}",
                            text_body=f"Your payment for order #{order.order_number} has been received and confirmed. Thank you!",
                            html_body=f"<p>Your payment for order #{order.order_number} has been received and confirmed. Thank you!</p>",
                        )
                    else:
                        from app.shared.notifications.service import send_notification_sync
                        send_notification_sync(
                            db=db, event_name="Order Payment Completed", to_email=order.customer_email,
                            context={"order_number": order.order_number, "total_amount": float(order.total_amount)},
                            subject=f"Payment Confirmed! - #{order.order_number}",
                            text_body=f"Your payment for order #{order.order_number} has been received and confirmed. Thank you!",
                            html_body=f"<p>Your payment for order #{order.order_number} has been received and confirmed. Thank you!</p>",
                        )
                except Exception as notify_err:
                    logger.error("Webhook: Failed to send payment completion notification for order %s: %s", order.order_number, notify_err)

                try:
                    if background_tasks:
                        from app.shared.notifications.service import create_admin_notification_background
                        background_tasks.add_task(
                            create_admin_notification_background,
                            title="💳 Payment Received",
                            message=f"Order #{order.order_number}\n₹{int(order.total_amount)}",
                            type="success", event="Payment Received",
                            metadata={"order_number": order.order_number, "total_amount": float(order.total_amount)}
                        )
                    else:
                        from app.modules.notifications.service import create_admin_notification
                        create_admin_notification(
                            db=db, title="💳 Payment Received",
                            message=f"Order #{order.order_number}\n₹{int(order.total_amount)}",
                            type="success", event="Payment Received",
                            metadata={"order_number": order.order_number, "total_amount": float(order.total_amount)}
                        )
                        db.commit()
                except Exception as notify_admin_err:
                    logger.error("Webhook: Failed to create payment received admin notification for order %s: %s", order.order_number, notify_admin_err)

        return updated_count

    # Production path: no orders in DB — fetch cart_session_id from Razorpay notes
    from app.modules.payments.service import payment_service
    try:
        client = payment_service.client
        rzp_order = client.order.fetch(razorpay_order_id)
        notes = rzp_order.get("notes", {})
        cart_session_id = notes.get("cart_session_id", "")
    except Exception as e:
        logger.error("Webhook: Failed to fetch Razorpay order %s: %s", razorpay_order_id, e)
        return 0

    if not cart_session_id:
        logger.warning("Webhook: No cart_session_id in Razorpay notes for %s", razorpay_order_id)
        return 0

    # Delegate to shared post-payment processing
    processed_orders = _post_payment_success(
        db=db,
        cart_session_id=cart_session_id,
        razorpay_order_id=razorpay_order_id,
        razorpay_payment_id=razorpay_payment_id,
        background_tasks=background_tasks,
    )

    return len(processed_orders)


def create_order_customer(
    db: Session,
    order_in: OrderCreate,
    customer: Customer,
    background_tasks: Optional[BackgroundTasks] = None,
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
            Order.tracking_status != TrackingStatus.CANCELLED,
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
                    # Adopt the new cart_session_id so subsequent calls
                    # (create_razorpay_order, verify_razorpay_payment) find
                    # these orders under the current session.
                    matched = matching[0]
                    matched.cart_session_id = order_in.cart_session_id
                    db.flush()
                    return OrderResponse.model_validate(matched)
                
                raise BusinessRuleError(
                    f"An active unpaid checkout session '{active_session_id}' already exists.",
                    code="ACTIVE_CHECKOUT_EXISTS",
                )

    repo = OrderRepository(db)

    # 3. Multi-item merge: if this cart_session already has an order, merge instead of creating a new one
    if order_in.cart_session_id and order_in.payment_method == "ONLINE":
        existing_session_order = (
            db.query(Order)
            .filter(
                Order.cart_session_id == order_in.cart_session_id,
                Order.payment_status == "PENDING",
            )
            .first()
        )
        if existing_session_order:
            import json
            current_line_items = []
            if existing_session_order.line_items:
                try:
                    current_line_items = json.loads(existing_session_order.line_items)
                except (json.JSONDecodeError, TypeError):
                    current_line_items = []
            # First item is the order itself; others are stored in line_items
            if not current_line_items:
                first_item = {
                    "product_name": existing_session_order.product_name,
                    "product_id": existing_session_order.product_id,
                    "size": existing_session_order.size,
                    "color": existing_session_order.color,
                    "quantity": existing_session_order.quantity,
                    "price": str(existing_session_order.price),
                    "total_amount": str(existing_session_order.total_amount),
                    "shipping_fee": str(existing_session_order.shipping_fee),
                }
                current_line_items.append(first_item)
            new_item = {
                "product_name": order_in.product_name,
                "product_id": order_in.product_id,
                "size": order_in.size,
                "color": order_in.color,
                "quantity": order_in.quantity,
                "price": str(order_in.price),
                "total_amount": str(order_in.total_amount),
                "shipping_fee": str(order_in.shipping_fee),
            }
            current_line_items.append(new_item)
            existing_session_order.line_items = json.dumps(current_line_items)
            existing_session_order.total_amount += order_in.total_amount
            existing_session_order.quantity += order_in.quantity
            existing_session_order.shipping_fee += order_in.shipping_fee
            db.flush()
            db.refresh(existing_session_order)
            logger.info(
                "Merged item into existing order: order_number=%s, item=%s, total_items=%d",
                existing_session_order.order_number, order_in.product_name, len(current_line_items),
            )
            return OrderResponse.model_validate(existing_session_order)

    order_number = repo.generate_order_number()

    order = _build_and_persist_order(repo, order_in, order_number, customer=customer)

    # For non-online orders (e.g. COD), notify immediately — payment is guaranteed.
    # For online orders the notification fires only after payment verification succeeds
    # (see verify_razorpay_payment).
    if order_in.payment_method != "ONLINE":
        try:
            from app.modules.notifications.service import create_admin_notification
            create_admin_notification(
                db=db,
                title="🛒 New Order Received",
                message=f"Order #{order.order_number}\nCustomer: {order.customer_name}\nAmount: ₹{int(order.total_amount)}",
                type="success",
                event="New Order Placed",
                metadata={"order_number": order.order_number, "customer_name": order.customer_name, "total_amount": float(order.total_amount)}
            )
        except Exception as e:
            logger.error(f"Failed to create admin notification for order {order.order_number}: {e}", exc_info=True)
    db.commit()
    db.refresh(order)

    # Post-Commit Hooks: Low stock alert and invoice email
    trigger_low_stock_alerts_post_commit(db, order, background_tasks=background_tasks)

    logger.info(
        "Customer order created: order_number=%s customer_email=%s",
        order.order_number, customer.email,
    )

    # For non-online orders (e.g. COD), send confirmation email immediately.
    # For online orders it fires only after payment verification succeeds
    # (see verify_razorpay_payment).
    if order_in.payment_method != "ONLINE":
        if background_tasks:
            from app.shared.email.service import send_order_confirmation_with_invoice_background
            background_tasks.add_task(send_order_confirmation_with_invoice_background, order.id)
        else:
            try:
                from app.shared.email.service import send_order_confirmation_with_invoice
                import asyncio
                asyncio.run(send_order_confirmation_with_invoice(order, db=db))
            except Exception as e:
                logger.error(f"Failed to send order confirmation with invoice: {e}", exc_info=True)

    return OrderResponse.model_validate(order)


def update_order(
    db: Session,
    order_id: int,
    payload: OrderUpdate,
    background_tasks: Optional[BackgroundTasks] = None,
) -> OrderResponse:
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

    # Trigger admin notifications on manual transitions
    new_payment_status = update.get("payment_status")
    if new_payment_status == "PAID" and old_payment_status != "PAID":
        try:
            from app.modules.notifications.service import create_admin_notification
            create_admin_notification(
                db=db,
                title="💳 Payment Received",
                message=f"Order #{order.order_number}\n₹{int(order.total_amount)}",
                type="success",
                event="Payment Received",
                metadata={"order_number": order.order_number, "total_amount": float(order.total_amount)}
            )
        except Exception as e:
            logger.error(f"Failed to create manual update payment received notification: {e}")

    if new_status == TrackingStatus.CANCELLED and old_tracking_status != TrackingStatus.CANCELLED:
        try:
            from app.modules.notifications.service import create_admin_notification
            create_admin_notification(
                db=db,
                title="❌ Order Cancelled",
                message=f"Order #{order.order_number}",
                type="error",
                event="Order Cancelled",
                metadata={"order_number": order.order_number}
            )
        except Exception as e:
            logger.error(f"Failed to create manual update cancellation notification: {e}")

    db.commit()
    db.refresh(order)


    # Trigger tracking status transition notification
    if new_status is not None:
        try:
            _handle_status_transition_notifications(db, order, old_tracking_status, new_status, background_tasks=background_tasks)
        except Exception as e:
            logger.error(f"Failed to send status transition notification: {e}", exc_info=True)

    return OrderResponse.model_validate(order)


def cancel_order_admin(
    db: Session,
    order_id: int,
    background_tasks: Optional[BackgroundTasks] = None,
) -> OrderResponse:
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
    try:
        from app.modules.notifications.service import create_admin_notification
        create_admin_notification(
            db=db,
            title="❌ Order Cancelled",
            message=f"Order #{order.order_number}",
            type="error",
            event="Order Cancelled",
            metadata={"order_number": order.order_number}
        )
    except Exception as e:
        logger.error(f"Failed to create admin notification for cancellation: {e}")
    db.commit()
    db.refresh(order)
    logger.info("Admin cancelled order: order_id=%s", order_id)

    try:
        _handle_status_transition_notifications(
            db, order, old_tracking_status, TrackingStatus.CANCELLED, background_tasks=background_tasks
        )
    except Exception as e:
        logger.error(f"Failed to send cancellation notification: {e}", exc_info=True)

    return OrderResponse.model_validate(order)


def cancel_order_customer(
    db: Session,
    order_id: int,
    customer: Customer,
    background_tasks: Optional[BackgroundTasks] = None,
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
    try:
        from app.modules.notifications.service import create_admin_notification
        create_admin_notification(
            db=db,
            title="❌ Order Cancelled",
            message=f"Order #{order.order_number}",
            type="error",
            event="Order Cancelled",
            metadata={"order_number": order.order_number}
        )
    except Exception as e:
        logger.error(f"Failed to create admin notification for cancellation: {e}")
    db.commit()
    db.refresh(order)

    logger.info(
        "Customer cancelled order: order_id=%s customer_email=%s",
        order_id, customer.email,
    )

    try:
        _handle_status_transition_notifications(
            db, order, old_tracking_status, TrackingStatus.CANCELLED, background_tasks=background_tasks
        )
    except Exception as e:
        logger.error(f"Failed to send cancellation notification: {e}", exc_info=True)

    return OrderResponse.model_validate(order)


def update_tracking(
    db: Session,
    order_id: int,
    tracking_status: str,
    background_tasks: Optional[BackgroundTasks] = None,
) -> OrderResponse:
    """
    Update tracking status only — used by the dedicated tracking endpoint.
    Restores inventory on PLACED → CANCELLED transition.
    """
    repo  = OrderRepository(db)
    order = repo.get_order_or_raise(order_id)
    old_tracking_status = order.tracking_status

    _handle_cancellation_transition(repo, order, tracking_status)

    repo.update_order_fields(order, {"tracking_status": tracking_status})
    if tracking_status.upper() == TrackingStatus.CANCELLED and old_tracking_status != TrackingStatus.CANCELLED:
        try:
            from app.modules.notifications.service import create_admin_notification
            create_admin_notification(
                db=db,
                title="❌ Order Cancelled",
                message=f"Order #{order.order_number}",
                type="error",
                event="Order Cancelled",
                metadata={"order_number": order.order_number}
            )
        except Exception as e:
            logger.error(f"Failed to create admin notification for cancellation in update_tracking: {e}")
    db.commit()
    db.refresh(order)


    try:
        _handle_status_transition_notifications(
            db, order, old_tracking_status, tracking_status, background_tasks=background_tasks
        )
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
    stats = repo.get_order_stats()

    return OrderListResponse(
        items=[OrderResponse.model_validate(o) for o in orders],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=math.ceil(total/per_page) if total else 1,
        stats=stats,
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
    items=None,
    address: Optional[dict] = None,
) -> dict:
    """
    Create a Razorpay Order for a cart session.

    Production flow (items provided):
      Validates cart items and stock without creating database Orders.
      Stores cart data in Razorpay notes for post-payment order creation.

    Legacy flow (items omitted, orders pre-exist in DB):
      Finds existing Order rows created by create_order_customer.
    """
    from app.modules.payments.service import payment_service
    from app.shared.exceptions import ExternalServiceError

    client = payment_service.client
    repo = OrderRepository(db)

    if items is not None:
        return _create_razorpay_order_from_items(db, repo, client, cart_session_id, customer, items, address)

    return _create_razorpay_order_from_existing_orders(db, repo, client, cart_session_id, customer)


def _create_razorpay_order_from_items(
    db: Session,
    repo: OrderRepository,
    client,
    cart_session_id: str,
    customer: Customer,
    items: list,
    address: Optional[dict],
) -> dict:
    from app.shared.exceptions import ExternalServiceError

    if not items:
        raise BusinessRuleError("Cart is empty.", code="EMPTY_CART")

    existing_orders = (
        db.query(Order)
        .filter(Order.cart_session_id == cart_session_id)
        .with_for_update()
        .all()
    )

    if existing_orders:
        any_paid = any(o.payment_status == "PAID" for o in existing_orders)
        if any_paid:
            raise BusinessRuleError("This order has already been paid.", code="ORDER_ALREADY_PAID")
        any_cancelled = any(o.tracking_status == TrackingStatus.CANCELLED for o in existing_orders)
        if any_cancelled:
            raise BusinessRuleError("Cannot pay for a cancelled order.", code="ORDER_CANCELLED")

        existing_rzp_id = existing_orders[0].razorpay_order_id if existing_orders else None
        total_amount = sum(o.total_amount for o in existing_orders)
        amount_paise = int(round(total_amount * 100))

        if existing_rzp_id:
            try:
                import time
                rzp_order = client.order.fetch(existing_rzp_id)
                rzp_status = rzp_order.get("status")
                rzp_amount = rzp_order.get("amount")
                rzp_created_at = rzp_order.get("created_at")

                is_expired = False
                if rzp_created_at:
                    age_minutes = (time.time() - rzp_created_at) / 60.0
                    if age_minutes > settings.RAZORPAY_ORDER_TIMEOUT_MINUTES:
                        is_expired = True

                if (
                    not is_expired
                    and rzp_status in ("created", "attempted")
                    and rzp_amount == amount_paise
                ):
                    logger.info("Reusing existing Razorpay Order %s for cart_session_id=%s", existing_rzp_id, cart_session_id)
                    return {"id": rzp_order["id"], "amount": rzp_order["amount"], "currency": rzp_order["currency"], "key": settings.RAZORPAY_KEY_ID, "receipt": rzp_order.get("receipt"), "status": rzp_order.get("status")}
            except Exception as fetch_err:
                logger.warning("Could not reuse Razorpay Order %s: %s. Creating new one.", existing_rzp_id, fetch_err)
    else:
        total_shipping = Decimal("0.00")
        total_amount = Decimal("0.00")

        for item in items:
            item_total = item.price * item.quantity
            total_amount += item_total
            if item.shipping_fee:
                total_shipping += item.shipping_fee

            item_type = (item.item_type or ItemType.PRODUCT).upper()
            if item_type == ItemType.PRODUCT and item.size:
                variant = repo.lock_variant_for_order(
                    product_id=item.product_id, product_name=item.product_name, size=item.size, color=item.color,
                )
                if variant is not None:
                    qty = item.quantity or 1
                    if variant.stock_quantity < qty:
                        raise BusinessRuleError(
                            f"Insufficient stock for '{item.product_name}' (size: {item.size}). Available: {variant.stock_quantity}, requested: {qty}.",
                            code="INSUFFICIENT_STOCK",
                            context={"product": item.product_name, "size": item.size, "available": variant.stock_quantity, "requested": qty},
                        )

        total_amount += total_shipping
        amount_paise = int(round(total_amount * 100))

    if amount_paise < 100:
        raise BusinessRuleError("The minimum transaction amount is 1.00 INR (100 paise).", code="INVALID_AMOUNT")

    cart_data = {
        "cart_session_id": cart_session_id,
        "customer_email": customer.email,
        "items": [
            {"product_id": item.product_id, "product_name": item.product_name, "product_image": item.product_image, "size": item.size, "color": item.color, "quantity": item.quantity, "price": str(item.price), "total_amount": str(item.total_amount), "shipping_fee": str(item.shipping_fee), "item_type": item.item_type}
            for item in items
        ],
        "address": {
            "customer_name": (address or {}).get("customer_name", ""),
            "customer_phone": (address or {}).get("customer_phone"),
            "address_line1": (address or {}).get("address_line1"),
            "address_line2": (address or {}).get("address_line2"),
            "city": (address or {}).get("city"),
            "state": (address or {}).get("state"),
            "country": (address or {}).get("country", "India"),
            "pincode": (address or {}).get("pincode"),
        },
    }

    receipt_id = cart_session_id[:20].replace("-", "")
    try:
        razorpay_order = client.order.create({"amount": amount_paise, "currency": "INR", "receipt": f"RCPT-{receipt_id}", "notes": cart_data})
    except Exception as e:
        logger.exception("Razorpay SDK order creation failed")
        raise ExternalServiceError(f"Razorpay API failure: {str(e)}", code="RAZORPAY_API_FAILURE")

    if existing_orders:
        try:
            for order in existing_orders:
                repo.update_order_fields(order, {"razorpay_order_id": razorpay_order["id"], "payment_method": "RAZORPAY"})
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("Failed to persist razorpay_order_id on existing orders")
            raise BusinessRuleError("Failed to save Razorpay order ID.", code="DATABASE_ERROR")

    logger.info("Razorpay checkout order created: cart_session_id=%s, rzp_order_id=%s, amount=%d", cart_session_id, razorpay_order["id"], amount_paise)
    return {"id": razorpay_order["id"], "amount": razorpay_order["amount"], "currency": razorpay_order["currency"], "key": settings.RAZORPAY_KEY_ID, "receipt": razorpay_order.get("receipt"), "status": razorpay_order.get("status")}


def _create_razorpay_order_from_existing_orders(
    db: Session,
    repo: OrderRepository,
    client,
    cart_session_id: str,
    customer: Customer,
) -> dict:
    from app.shared.exceptions import ExternalServiceError, NotFoundError

    orders = (
        db.query(Order)
        .filter(Order.cart_session_id == cart_session_id)
        .with_for_update()
        .all()
    )
    if not orders:
        raise NotFoundError(f"No orders found for cart session '{cart_session_id}'.", code="ORDER_NOT_FOUND")

    for order in orders:
        if order.customer_email != customer.email:
            raise NotFoundError(f"No orders found for cart session '{cart_session_id}'.", code="ORDER_NOT_FOUND")

    any_paid = any(order.payment_status == "PAID" for order in orders)
    if any_paid:
        raise BusinessRuleError("This order has already been paid.", code="ORDER_ALREADY_PAID")

    any_cancelled = any(order.tracking_status == TrackingStatus.CANCELLED for order in orders)
    if any_cancelled:
        raise BusinessRuleError("Cannot pay for a cancelled order.", code="ORDER_CANCELLED")

    total_amount = sum(order.total_amount for order in orders)
    amount_paise = int(round(total_amount * 100))

    if amount_paise < 100:
        raise BusinessRuleError("The minimum transaction amount is 1.00 INR (100 paise).", code="INVALID_AMOUNT")

    existing_order_id = orders[0].razorpay_order_id if orders else None
    all_pending = all(order.payment_status == "PENDING" for order in orders)
    is_retry = existing_order_id is not None
    retry_count = 1 if is_retry else 0

    if all_pending and existing_order_id:
        try:
            import time
            rzp_order = client.order.fetch(existing_order_id)
            rzp_status = rzp_order.get("status")
            rzp_amount = rzp_order.get("amount")
            rzp_created_at = rzp_order.get("created_at")

            is_expired = False
            if rzp_created_at:
                age_minutes = (time.time() - rzp_created_at) / 60.0
                if age_minutes > settings.RAZORPAY_ORDER_TIMEOUT_MINUTES:
                    is_expired = True

            if not is_expired and rzp_status in ("created", "attempted") and rzp_amount == amount_paise:
                logger.info("Reusing existing valid Razorpay Order: %s for cart_session_id: %s.", existing_order_id, cart_session_id)
                return {"id": rzp_order["id"], "amount": rzp_order["amount"], "currency": rzp_order["currency"], "key": settings.RAZORPAY_KEY_ID, "receipt": rzp_order.get("receipt"), "status": rzp_order.get("status")}
        except Exception as fetch_err:
            logger.warning("Could not reuse existing Razorpay Order %s: %s. Creating a new one.", existing_order_id, fetch_err)

    try:
        razorpay_order = client.order.create({
            "amount": amount_paise, "currency": "INR",
            "receipt": f"RCPT-{orders[0].order_number.replace('ORD-', '')}",
            "notes": {"cart_session_id": cart_session_id, "customer_email": customer.email},
        })
    except Exception as e:
        logger.exception("Razorpay SDK order creation failed")
        raise ExternalServiceError(f"Razorpay API failure: {str(e)}", code="RAZORPAY_API_FAILURE")

    try:
        for order in orders:
            repo.update_order_fields(order, {"razorpay_order_id": razorpay_order["id"], "payment_method": "RAZORPAY"})
        db.commit()
        logger.info("New Razorpay Order created. Order IDs: %s, Cart Session: %s, Rzp Order: %s", [o.id for o in orders], cart_session_id, razorpay_order["id"])
    except Exception:
        db.rollback()
        logger.exception("Database persistence of razorpay_order_id failed")
        raise BusinessRuleError("Failed to save Razorpay order ID to the database.", code="DATABASE_ERROR")

    return {"id": razorpay_order["id"], "amount": razorpay_order["amount"], "currency": razorpay_order["currency"], "key": settings.RAZORPAY_KEY_ID, "receipt": razorpay_order.get("receipt"), "status": razorpay_order.get("status")}


def verify_razorpay_payment(
    db: Session,
    cart_session_id: str,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    customer: Customer,
    background_tasks: Optional[BackgroundTasks] = None,
) -> list[OrderResponse]:
    """
    Verify Razorpay payment signature and process the order.

    For the production flow (no pre-existing orders): delegates to
    _post_payment_success which creates orders from Razorpay notes,
    decrements stock, sends email, and notifies admin.

    For the legacy flow (orders pre-exist): delegates to
    _post_payment_success which marks existing orders as PAID.

    Idempotent: if orders are already PAID, returns them without reprocessing.
    """
    from app.modules.payments.service import payment_service
    from app.shared.exceptions import ConflictError

    # 1. Duplicate payment check
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

    # 2. Signature verification
    try:
        client = payment_service.client
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            }
        )
    except Exception as e:
        logger.warning("Razorpay signature verification failed: %s", e)
        raise BusinessRuleError("Invalid payment signature.", code="INVALID_SIGNATURE")

    # 3. Delegate to shared post-payment processing
    orders = _post_payment_success(
        db=db,
        cart_session_id=cart_session_id,
        razorpay_order_id=razorpay_order_id,
        razorpay_payment_id=razorpay_payment_id,
        razorpay_signature=razorpay_signature,
        background_tasks=background_tasks,
    )

    return [OrderResponse.model_validate(order) for order in orders]


# ─────────────────────────────────────────────────────────────
# PRODUCTION ORDER FLOW — Orders created AFTER payment
# ─────────────────────────────────────────────────────────────
#
# _post_payment_success is the single source of truth for what happens
# after payment is confirmed (called by both verify and webhook paths).
# ─────────────────────────────────────────────────────────────


def _post_payment_success(
    db: Session,
    cart_session_id: str,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str = None,
    background_tasks=None,
) -> list[Order]:
    """
    Single source of truth for post-payment processing.

    Called by BOTH:
    - verify_razorpay_payment (frontend verify path)
    - process_razorpay_webhook_payment (webhook path)

    Guarantees:
    - Orders are created exactly once (idempotent via cart_session_id check)
    - Stock is decremented exactly once
    - Customer email is sent exactly once
    - Admin notification is sent exactly once

    Flow:
    1. Check if orders already exist for cart_session_id
    2. If not, fetch cart data from Razorpay notes and create orders
    3. Mark orders as PAID
    4. Decrement stock
    5. Send customer email with invoice
    6. Send admin notification
    """
    import json

    repo = OrderRepository(db)

    # ── Step 1: Check if orders already exist ────────────────────────────────
    existing_orders = (
        db.query(Order)
        .filter(Order.cart_session_id == cart_session_id)
        .all()
    )

    if existing_orders:
        # Orders exist — check if already fully processed
        already_paid = all(o.payment_status == "PAID" for o in existing_orders)
        if already_paid:
            logger.info(
                "_post_payment_success: Orders for cart_session_id=%s already PAID. Idempotent exit.",
                cart_session_id,
            )
            return existing_orders

        # Update existing orders with payment data
        now_utc = datetime.now(timezone.utc)
        for order in existing_orders:
            if order.payment_status != "PAID":
                repo.update_order_fields(
                    order,
                    {
                        "razorpay_payment_id": razorpay_payment_id,
                        "razorpay_signature": razorpay_signature,
                        "payment_status": "PAID",
                        "payment_verified_at": now_utc,
                        "tracking_status": TrackingStatus.CONFIRMED,
                    },
                )
        db.commit()

        # Refresh all orders
        for order in existing_orders:
            db.refresh(order)

        orders_to_process = existing_orders

    else:
        # ── No orders exist — create them from Razorpay notes ───────────────
        from app.modules.payments.service import payment_service

        try:
            client = payment_service.client
            rzp_order = client.order.fetch(razorpay_order_id)
            notes = rzp_order.get("notes", {})
        except Exception as e:
            logger.error(
                "_post_payment_success: Failed to fetch Razorpay order %s: %s",
                razorpay_order_id, e,
            )
            raise BusinessRuleError(
                "Failed to fetch order details from Razorpay.",
                code="RAZORPAY_FETCH_FAILURE",
            )

        cart_session_id_from_notes = notes.get("cart_session_id", cart_session_id)
        customer_email = notes.get("customer_email", "")
        cart_items_raw = notes.get("items", [])
        address_data = notes.get("address", {})

        if not cart_items_raw:
            logger.error(
                "_post_payment_success: No cart items in Razorpay notes for order %s",
                razorpay_order_id,
            )
            raise BusinessRuleError(
                "Order data not found in payment record.",
                code="ORDER_DATA_MISSING",
            )

        # Create Order rows from cart items
        now_utc = datetime.now(timezone.utc)
        created_orders = []

        for item_data in cart_items_raw:
            order_number = repo.generate_order_number()
            delivery_days, expected_date = _calculate_delivery(
                address_data.get("city"), now_utc
            )

            order = Order(
                order_number=order_number,
                cart_session_id=cart_session_id_from_notes,
                customer_name=address_data.get("customer_name", ""),
                customer_email=customer_email,
                customer_phone=address_data.get("customer_phone"),
                address_line1=address_data.get("address_line1"),
                address_line2=address_data.get("address_line2"),
                city=address_data.get("city"),
                state=address_data.get("state"),
                country=address_data.get("country", "India"),
                pincode=address_data.get("pincode"),
                product_id=item_data.get("product_id"),
                product_name=item_data.get("product_name", ""),
                product_image=item_data.get("product_image"),
                size=item_data.get("size"),
                color=item_data.get("color"),
                quantity=item_data.get("quantity", 1),
                price=Decimal(str(item_data.get("price", "0.00"))),
                shipping_fee=Decimal(str(item_data.get("shipping_fee", "0.00"))),
                total_amount=Decimal(str(item_data.get("total_amount", "0.00"))),
                payment_method="RAZORPAY",
                payment_status="PAID",
                tracking_status=TrackingStatus.CONFIRMED,
                razorpay_order_id=razorpay_order_id,
                razorpay_payment_id=razorpay_payment_id,
                razorpay_signature=razorpay_signature,
                payment_verified_at=now_utc,
                ordered_at=now_utc,
                item_type=(item_data.get("item_type") or ItemType.PRODUCT).upper(),
                delivery_days=delivery_days,
                expected_delivery_date=expected_date,
            )

            # Decrement stock
            item_type = (item_data.get("item_type") or ItemType.PRODUCT).upper()
            if item_type == ItemType.PRODUCT and item_data.get("size"):
                variant = repo.lock_variant_for_order(
                    product_id=item_data.get("product_id"),
                    product_name=item_data.get("product_name"),
                    size=item_data.get("size"),
                    color=item_data.get("color"),
                )
                if variant is not None:
                    qty = item_data.get("quantity", 1)
                    if variant.stock_quantity >= qty:
                        repo.decrement_stock(variant, qty)
                    else:
                        logger.error(
                            "Stock insufficient at payment time for %s: available=%d, needed=%d",
                            item_data.get("product_name"), variant.stock_quantity, qty,
                        )

            created_order = repo.create_order(order)
            created_orders.append(created_order)

        db.commit()

        # Refresh all orders
        for order in created_orders:
            db.refresh(order)

        orders_to_process = created_orders

        logger.info(
            "_post_payment_success: Created %d order(s) from Razorpay notes. "
            "cart_session_id=%s, razorpay_order_id=%s",
            len(created_orders), cart_session_id_from_notes, razorpay_order_id,
        )

    # ── Step 5+6: Send notifications ────────────────────────────────────────
    for order in orders_to_process:
        # Customer email with invoice
        try:
            if background_tasks:
                from app.shared.email.service import send_order_confirmation_with_invoice_background
                background_tasks.add_task(send_order_confirmation_with_invoice_background, order.id)
            else:
                from app.shared.email.service import send_order_confirmation_with_invoice
                import asyncio
                asyncio.run(send_order_confirmation_with_invoice(order, db=db))
        except Exception as email_err:
            logger.error(
                "_post_payment_success: Failed to send order confirmation email for %s: %s",
                order.order_number, email_err,
            )

        # Admin notification
        try:
            from app.modules.notifications.service import create_admin_notification
            create_admin_notification(
                db=db,
                title="🛒 New Order Received",
                message=f"Order #{order.order_number}\nCustomer: {order.customer_name}\nAmount: ₹{int(order.total_amount)}",
                type="success",
                event="New Order Placed",
                metadata={
                    "order_number": order.order_number,
                    "customer_name": order.customer_name,
                    "total_amount": float(order.total_amount),
                },
            )
        except Exception as notif_err:
            logger.error(
                "_post_payment_success: Failed to create admin notification for %s: %s",
                order.order_number, notif_err,
            )

    # Post-commit: low stock alerts
    for order in orders_to_process:
        trigger_low_stock_alerts_post_commit(db, order, background_tasks=background_tasks)

    return orders_to_process

