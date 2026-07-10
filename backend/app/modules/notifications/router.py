from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.auth.dependencies import get_current_admin
from app.modules.admins.models import Admin
from app.modules.notifications.schemas import AdminNotificationsListResponse, AdminNotificationResponse
from app.modules.notifications.service import (
    get_admin_notifications,
    get_unread_count,
    mark_notification_as_read,
    mark_all_notifications_as_read
)

router = APIRouter()

@router.get("", response_model=AdminNotificationsListResponse)
def list_notifications(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Fetch latest notifications and unread count.
    """
    notifications = get_admin_notifications(db, limit=limit)
    unread_count = get_unread_count(db)
    return {
        "unread_count": unread_count,
        "notifications": notifications
    }

@router.put("/read", response_model=AdminNotificationResponse)
def read_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Mark a single notification as read.
    """
    return mark_notification_as_read(db, notification_id)

@router.put("/read-all")
def read_all_notifications(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Mark all unread notifications as read.
    """
    count = mark_all_notifications_as_read(db)
    return {"message": f"Successfully marked {count} notifications as read.", "count": count}
