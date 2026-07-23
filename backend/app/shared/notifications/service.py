"""
app/shared/notifications/service.py

Notification dispatcher that respects active toggles in the notification_settings table.
If a channel is turned OFF, it is guaranteed that the backend will not send it.
"""

import logging
import asyncio
from sqlalchemy.orm import Session
from app.modules.settings.models import NotificationSetting
from app.shared.email.service import send_email_unified
from app.core.config import settings

logger = logging.getLogger("app.notifications")

async def send_notification(
    db: Session,
    event_name: str,
    to_email: str,
    context: dict,
    subject: str,
    text_body: str,
    html_body: str,
) -> None:
    """
    Check notification toggles in the database before sending notifications.
    """
    # Normalize event name
    normalized_name = event_name
    if event_name == "New Review Published":
        normalized_name = "New Review Posted"

    # Default Reference ID
    import time
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d")
    unique_suffix = f"{int(time.time() * 1000) % 1000000:06d}"
    reference_id = f"GEN-{timestamp}-{unique_suffix}"

    from app.shared.email.service import compile_email_branding
    branding = compile_email_branding(db=db)

    # Redesign templates using the design system
    if event_name == "Order Payment Completed":
        try:
            from app.shared.email.builder import build_payment_successful
            from app.modules.orders.models import Order
            order = db.query(Order).filter(Order.order_number == context.get("order_number")).first()
            if order:
                pay_id = getattr(order, "razorpay_payment_id", None) or getattr(order, "order_number", "N/A")
                reference_id = f"PAY-{pay_id}"
                
                order_data = {
                    "order_number": getattr(order, "order_number", "N/A"),
                    "total_amount": float(getattr(order, "total_amount", 0) or 0),
                    "payment_id": getattr(order, "razorpay_payment_id", "—") or "—",
                    "payment_method": getattr(order, "payment_method", "Online Payment"),
                    "payment_status": getattr(order, "payment_status", "PAID"),
                    "customer_name": getattr(order, "customer_name", "Customer"),
                    "view_order_url": f"{settings.FRONTEND_URL}/orders/{getattr(order, 'id', 0)}",
                }
                html_body, text_body = build_payment_successful(branding, order_data, reference_id)
        except Exception as err:
            logger.error(f"Failed to build payment completion email: {err}")

    elif event_name == "Order Shipped":
        try:
            from app.shared.email.builder import build_order_shipped
            from app.modules.orders.models import Order
            order = db.query(Order).filter(Order.order_number == context.get("order_number")).first()
            if order:
                expected_del_date = getattr(order, "expected_delivery_date", None)
                if expected_del_date:
                    if hasattr(expected_del_date, "strftime"):
                        expected_delivery = expected_del_date.strftime("%B %d, %Y")
                    else:
                        expected_delivery = str(expected_del_date)
                else:
                    ordered_date = getattr(order, "ordered_at", None)
                    if ordered_date and hasattr(ordered_date, "strftime"):
                        from datetime import timedelta
                        expected_delivery = (ordered_date + timedelta(days=int(getattr(order, "delivery_days", 5) or 5))).strftime("%B %d, %Y")
                    else:
                        expected_delivery = "Standard (3-5 business days)"
                
                tracking_val = getattr(order, "tracking_id", "—") or "—"
                reference_id = f"SHP-{tracking_val}" if tracking_val != "—" else f"SHP-{getattr(order, 'order_number', 'N/A')}"
                
                order_data = {
                    "order_number": getattr(order, "order_number", "N/A"),
                    "logistics": getattr(order, "logistics", "Standard Delivery"),
                    "tracking_id": tracking_val,
                    "customer_name": getattr(order, "customer_name", "Customer"),
                    "expected_delivery": expected_delivery,
                    "view_order_url": f"{settings.FRONTEND_URL}/orders/{getattr(order, 'id', 0)}",
                }
                html_body, text_body = build_order_shipped(branding, order_data, reference_id)
        except Exception as err:
            logger.error(f"Failed to build order shipped email: {err}")

    elif event_name == "Order Cancelled":
        try:
            from app.shared.email.builder import build_order_cancelled
            from app.modules.orders.models import Order
            order = db.query(Order).filter(Order.order_number == context.get("order_number")).first()
            if order:
                reference_id = f"ORD-{getattr(order, 'order_number', 'N/A')}"
                pay_method = getattr(order, "payment_method", "COD").upper()
                pay_status = getattr(order, "payment_status", "CANCELLED").upper()
                is_online_paid = pay_method not in ("COD", "CASH ON DELIVERY", "CASH_ON_DELIVERY") and pay_status == "PAID"
                
                if is_online_paid:
                    refund_status_text = "Manual refund required (please contact support to request your refund)."
                elif pay_method in ("COD", "CASH ON DELIVERY", "CASH_ON_DELIVERY"):
                    refund_status_text = "Not applicable (Cash on Delivery)"
                else:
                    refund_status_text = "No charges were processed."
                
                order_data = {
                    "order_number": getattr(order, "order_number", "N/A"),
                    "reason": getattr(order, "tracking_note", "Cancelled upon request.") or "Cancelled upon request.",
                    "refund_status_text": refund_status_text,
                    "customer_name": getattr(order, "customer_name", "Customer"),
                    "is_online_paid": is_online_paid,
                }
                html_body, text_body = build_order_cancelled(branding, order_data, reference_id)
        except Exception as err:
            logger.error(f"Failed to build order cancelled email: {err}")

    elif event_name == "Low Stock Alert":
        try:
            from app.shared.email.builder import build_low_stock_alert
            product_name = context.get("product_name", "N/A")
            stock = context.get("stock", 0)
            sku_str = ""
            threshold = 5
            try:
                from app.modules.products.models import Product, ProductVariant
                prod = db.query(Product).filter(Product.title == product_name).first()
                if prod:
                    variant = db.query(ProductVariant).filter(
                        ProductVariant.product_id == prod.id,
                        ProductVariant.stock_quantity <= ProductVariant.low_stock_threshold
                    ).first()
                    if variant:
                        sku_str = variant.sku
                        threshold = variant.low_stock_threshold
            except Exception:
                pass
            
            reference_id = f"INV-{timestamp}-{unique_suffix}"
            manage_url = f"{settings.FRONTEND_URL}/admin/products"
            
            html_body, text_body = build_low_stock_alert(
                branding=branding,
                product_name=product_name,
                stock=stock,
                sku=sku_str,
                threshold=threshold,
                manage_url=manage_url,
                reference_id=reference_id
            )
        except Exception as err:
            logger.error(f"Failed to build low stock alert email: {err}")

    # Query DB configuration
    setting = db.query(NotificationSetting).filter(
        NotificationSetting.event_name == normalized_name
    ).first()

    email_enabled = True
    whatsapp_enabled = False

    if setting:
        email_enabled = setting.email_enabled
        whatsapp_enabled = setting.whatsapp_enabled
    else:
        logger.warning(f"Notification setting for event '{event_name}' not found. Defaulting to Email: True, WhatsApp: False.")

    if email_enabled:
        try:
            await send_email_unified(
                to_email=to_email,
                subject=subject,
                html_body=html_body,
                text_body=text_body,
                reference_id=reference_id
            )
        except Exception as e:
            logger.error(f"Failed to send email notification for event {event_name}: {e}", exc_info=True)
    else:
        logger.info(f"Email notification for event '{event_name}' is disabled. Skipping.")

    if whatsapp_enabled:
        logger.info(f"Dispatching WhatsApp notification for event '{event_name}' to {to_email}")
        # ==========================================================
        # FUTURE FEATURE
        #
        # Meta WhatsApp Cloud API Integration
        #
        # This block will send WhatsApp notifications to the admin
        # once the Meta Cloud API is configured.
        #
        # Current status:
        # Disabled intentionally.
        #
        # ==========================================================
        # logger.warning(
        #     f"[SIMULATION] WhatsApp message sent to client: {text_body}"
        # )
        
        # ==========================================================
        # FUTURE INTEGRATION
        #
        # Provider:
        # Meta WhatsApp Cloud API
        #
        # Planned Features:
        # - Admin notifications
        # - Delivery status tracking
        # - Template messages
        # - Retry mechanism
        # - Error logging
        #
        # ==========================================================
        pass
    else:
        logger.info(f"WhatsApp notification for event '{event_name}' is disabled. Skipping.")


def send_notification_sync(
    db: Session,
    event_name: str,
    to_email: str,
    context: dict,
    subject: str,
    text_body: str,
    html_body: str,
) -> None:
    """
    Synchronous wrapper for send_notification. Safe to call from sync services.
    """
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        # Safely submit to the running event loop
        loop.create_task(
            send_notification(db, event_name, to_email, context, subject, text_body, html_body)
        )
    else:
        # Run blocking synchronously
        asyncio.run(
            send_notification(db, event_name, to_email, context, subject, text_body, html_body)
        )


async def send_notification_background(
    event_name: str,
    to_email: str,
    context: dict,
    subject: str,
    text_body: str,
    html_body: str,
) -> None:
    """
    Background task for dispatching email notifications.
    Creates a new database session locally, processes the notification, and ensures it is closed.
    """
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        await send_notification(
            db=db,
            event_name=event_name,
            to_email=to_email,
            context=context,
            subject=subject,
            text_body=text_body,
            html_body=html_body,
        )
    except Exception as exc:
        logger.error(
            "Background Notification Failed - Template: %s, Recipient: %s, Error: %s",
            event_name, to_email, str(exc), exc_info=True
        )
    finally:
        db.close()


def create_admin_notification_background(
    title: str,
    message: str,
    type: str,
    event: str,
    metadata: dict = None,
) -> None:
    """
    Background task for creating admin database notifications safely outside request transaction context.
    """
    from app.core.database import SessionLocal
    from app.modules.notifications.service import create_admin_notification
    db = SessionLocal()
    try:
        create_admin_notification(
            db=db,
            title=title,
            message=message,
            type=type,
            event=event,
            metadata=metadata,
        )
        db.commit()
    except Exception as exc:
        logger.error(
            "Background Admin Notification Failed - Title: %s, Error: %s",
            title, str(exc), exc_info=True
        )
    finally:
        db.close()

