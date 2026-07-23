import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.modules.notifications.models import AdminNotification
from app.shared.exceptions import NotFoundError

logger = logging.getLogger("app.notifications")

def create_admin_notification(
    db: Session,
    title: str,
    message: str,
    type: str,
    event: str,
    metadata: Optional[Dict[str, Any]] = None
) -> AdminNotification:
    """
    Idempotently creates a persistent admin notification.
    Flushes the database session to participate in parent transactions.
    """
    try:
        # Check for duplication of identical order alerts to prevent duplicate notifications
        if event in ("New Order Placed", "Payment Received", "Order Cancelled") and metadata and "order_number" in metadata:
            order_number = metadata["order_number"]
            # Look for duplicate event in the last 1 minute
            from datetime import datetime, timedelta, timezone
            time_threshold = datetime.now(timezone.utc) - timedelta(minutes=1)
            existing = db.query(AdminNotification).filter(
                AdminNotification.event == event,
                AdminNotification.created_at >= time_threshold
            ).all()
            for notif in existing:
                notif_meta = notif.metadata_json or {}
                if notif_meta.get("order_number") == order_number:
                    logger.info(f"Duplicate notification for order {order_number} event {event} suppressed.")
                    return notif

        notification = AdminNotification(
            title=title,
            message=message,
            type=type,
            event=event,
            metadata_json=metadata
        )
        db.add(notification)
        db.flush()
        logger.info(f"Created Admin Notification: {title} ({type}) for event {event}")
        return notification
    except Exception as e:
        logger.error(f"Failed to create admin notification: {e}", exc_info=True)
        # Non-blocking for the parent transaction, but we log the error
        raise e

def get_admin_notifications(db: Session, limit: int = 20) -> List[AdminNotification]:
    """
    Fetch the latest admin notifications, sorted newest first.
    """
    return db.query(AdminNotification).order_by(AdminNotification.created_at.desc()).limit(limit).all()

def get_unread_count(db: Session) -> int:
    """
    Get count of unread admin notifications.
    """
    return db.query(AdminNotification).filter(AdminNotification.is_read == False).count()

def mark_notification_as_read(db: Session, notification_id: int) -> AdminNotification:
    """
    Mark a single notification as read.
    """
    notification = db.query(AdminNotification).filter(AdminNotification.id == notification_id).first()
    if not notification:
        raise NotFoundError(
            f"Notification with ID {notification_id} not found.",
            code="NOTIFICATION_NOT_FOUND"
        )
    
    if not notification.is_read:
        notification.is_read = True
        db.commit()
        db.refresh(notification)
        logger.info(f"Notification {notification_id} marked as read.")
    
    return notification

def mark_all_notifications_as_read(db: Session) -> int:
    """
    Mark all unread notifications as read.
    """
    unread = db.query(AdminNotification).filter(AdminNotification.is_read == False).all()
    count = 0
    for notif in unread:
        notif.is_read = True
        count += 1
    
    if count > 0:
        db.commit()
        logger.info(f"Marked {count} notifications as read.")
    
    return count
