from decimal import Decimal
from typing import List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.modules.admins.models import Admin
from app.modules.settings.models import AdminSecurity, NotificationSetting, PaymentMethod, StoreSettings
from app.modules.settings.schemas import (
    AdminSecurityUpdate,
    NotificationSettingUpdate,
    PasswordUpdate,
    PaymentMethodUpdate,
    StoreSettingsUpdate,
)

DEFAULT_PAYMENTS = [
    {
        "name": "Razorpay",
        "description": "Cards, net banking, wallets, and UPI through Razorpay checkout.",
        "fee": Decimal("2.00"),
        "is_active": True,
    },
    {
        "name": "UPI / PhonePe",
        "description": "Direct UPI payments and PhonePe transactions for India-based customers.",
        "fee": Decimal("0.00"),
        "is_active": True,
    },
    {
        "name": "Cash On Delivery",
        "description": "Collect cash when the order is delivered to the customer.",
        "fee": Decimal("0.00"),
        "is_active": False,
    },
    {
        "name": "PayPal",
        "description": "International card and wallet payments through PayPal.",
        "fee": Decimal("3.50"),
        "is_active": False,
    },
]

DEFAULT_NOTIFICATIONS = [
    {"event_name": "New Order Placed", "email_enabled": True, "whatsapp_enabled": True},
    {"event_name": "Order Shipped", "email_enabled": True, "whatsapp_enabled": True},
    {"event_name": "Low Stock Alert", "email_enabled": True, "whatsapp_enabled": False},
    {"event_name": "Refund Processed", "email_enabled": True, "whatsapp_enabled": False},
    {"event_name": "Order Cancelled", "email_enabled": True, "whatsapp_enabled": True},
    {"event_name": "New Review Posted", "email_enabled": True, "whatsapp_enabled": False},
]


def get_or_create_store_settings(db: Session) -> StoreSettings:
    settings = db.query(StoreSettings).order_by(StoreSettings.id.asc()).first()
    if settings:
        return settings

    settings = StoreSettings()
    db.add(settings)
    db.flush()
    db.refresh(settings)
    return settings


def get_or_create_admin_security(db: Session, admin: Admin) -> AdminSecurity:
    security_row = db.query(AdminSecurity).filter(AdminSecurity.admin_id == admin.id).first()
    if security_row:
        # Sync email/username if it changed
        if security_row.email != admin.email or security_row.username != admin.name:
            security_row.email = admin.email
            security_row.username = admin.name
            db.flush()
        return security_row

    security_row = AdminSecurity(
        admin_id=admin.id,
        username=admin.name,
        email=admin.email,
        two_factor_enabled=False,
        email_verified=True,
    )
    db.add(security_row)
    db.flush()
    db.refresh(security_row)
    return security_row


def get_settings_bundle(db: Session, admin: Admin) -> dict:
    return {
        "settings": get_or_create_store_settings(db),
        "security": get_or_create_admin_security(db, admin),
    }


def update_store_settings(db: Session, payload: StoreSettingsUpdate) -> StoreSettings:
    settings = get_or_create_store_settings(db)
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, str(value) if field == "store_url" and value is not None else value)
    db.flush()
    db.refresh(settings)
    return settings


def update_admin_security(db: Session, admin: Admin, payload: AdminSecurityUpdate) -> AdminSecurity:
    security_row = get_or_create_admin_security(db, admin)
    update_data = payload.model_dump(exclude_unset=True)

    email = update_data.get("email")
    if email and email != admin.email:
        existing_admin = db.query(Admin).filter(Admin.email == email, Admin.id != admin.id).first()
        if existing_admin:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already in use.")
        admin.email = email
        security_row.email = email
        security_row.email_verified = False

    username = update_data.get("username")
    if username:
        admin.name = username
        security_row.username = username

    if "two_factor_enabled" in update_data:
        security_row.two_factor_enabled = update_data["two_factor_enabled"]

    db.flush()
    db.refresh(security_row)
    db.refresh(admin)
    return security_row


def update_admin_password(db: Session, admin: Admin, payload: PasswordUpdate) -> dict:
    if not verify_password(payload.current_password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")

    admin.password_hash = get_password_hash(payload.new_password)
    db.flush()
    return {"message": "Password updated successfully."}


def ensure_payment_methods(db: Session) -> List[PaymentMethod]:
    existing_by_name = {method.name: method for method in db.query(PaymentMethod).all()}
    changed = False

    for payment in DEFAULT_PAYMENTS:
        if payment["name"] not in existing_by_name:
            db.add(PaymentMethod(**payment))
            changed = True

    if changed:
        db.flush()
        return db.query(PaymentMethod).order_by(PaymentMethod.id.asc()).all()

    return sorted(existing_by_name.values(), key=lambda x: x.id)


def update_payment_method(db: Session, payment_id: int, payload: PaymentMethodUpdate) -> PaymentMethod:
    payment = db.query(PaymentMethod).filter(PaymentMethod.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment method not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(payment, field, value)

    db.flush()
    db.refresh(payment)
    return payment


def ensure_notification_settings(db: Session) -> List[NotificationSetting]:
    existing_by_name = {notification.event_name: notification for notification in db.query(NotificationSetting).all()}
    changed = False

    for notification in DEFAULT_NOTIFICATIONS:
        if notification["event_name"] not in existing_by_name:
            db.add(NotificationSetting(**notification))
            changed = True

    if changed:
        db.flush()
        return db.query(NotificationSetting).order_by(NotificationSetting.id.asc()).all()

    return sorted(existing_by_name.values(), key=lambda x: x.id)


def update_notification_setting(
    db: Session,
    notification_id: int,
    payload: NotificationSettingUpdate,
) -> NotificationSetting:
    notification = db.query(NotificationSetting).filter(NotificationSetting.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification setting not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(notification, field, value)

    db.flush()
    db.refresh(notification)
    return notification
