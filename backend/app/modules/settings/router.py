from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List
import os

from app.modules.auth.dependencies import get_current_admin
from app.modules.audit.service import audit
from app.shared.utils.image import validate_and_read_image
from app.core.database import get_db
from app.modules.admins.models import Admin
from app.modules.settings.schemas import (
    AdminSecurityResponse,
    AdminSecurityUpdate,
    NotificationSettingResponse,
    NotificationSettingUpdate,
    PasswordUpdate,
    PaymentMethodResponse,
    PaymentMethodUpdate,
    SettingsBundleResponse,
    StoreSettingsResponse,
    StoreSettingsUpdate,
)
from app.modules.settings.service import (
    ensure_notification_settings,
    ensure_payment_methods,
    get_settings_bundle,
    update_admin_password,
    update_admin_security,
    update_notification_setting,
    update_payment_method,
    update_store_settings,
)
from app.core.config import settings as app_settings
from app.modules.settings.models import StoreSettings

router = APIRouter()


@router.get("", response_model=SettingsBundleResponse)
def read_settings(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return get_settings_bundle(db, current_admin)


@router.put("", response_model=StoreSettingsResponse)
def update_settings(
    payload: StoreSettingsUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    result = update_store_settings(db, payload)
    audit.log(db=db, admin=current_admin, action="settings.store_updated",
              resource_type="store_settings", changes=payload.model_dump(exclude_unset=True), request=request)
    db.commit()
    return result


@router.get("/payments", response_model=List[PaymentMethodResponse])
def read_payment_methods(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return ensure_payment_methods(db)


@router.put("/payments/{payment_id}", response_model=PaymentMethodResponse)
def update_payment(
    payment_id: int,
    payload: PaymentMethodUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return update_payment_method(db, payment_id, payload)


@router.get("/notifications", response_model=List[NotificationSettingResponse])
def read_notification_settings(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return ensure_notification_settings(db)


@router.put("/notifications/{notification_id}", response_model=NotificationSettingResponse)
def update_notification(
    notification_id: int,
    payload: NotificationSettingUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return update_notification_setting(db, notification_id, payload)


@router.put("/profile", response_model=StoreSettingsResponse)
def update_profile(
    payload: StoreSettingsUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return update_store_settings(db, payload)


@router.put("/security", response_model=AdminSecurityResponse)
def update_security(
    payload: AdminSecurityUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    result = update_admin_security(db, current_admin, payload)
    audit.log(db=db, admin=current_admin, action="settings.security_updated",
              resource_type="admin", resource_id=current_admin.id,
              changes=payload.model_dump(exclude_unset=True), request=request)
    db.commit()
    return result


@router.put("/password")
def update_password(
    payload: PasswordUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    result = update_admin_password(db, current_admin, payload)
    audit.log(db=db, admin=current_admin, action="settings.password_changed",
              resource_type="admin", resource_id=current_admin.id, request=request)
    db.commit()
    return result




@router.post("/logo", response_model=StoreSettingsResponse)
def upload_logo(
    file: UploadFile = File(...),
    request: Request = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    import uuid as _uuid

    contents = validate_and_read_image(file)  # MIME, extension, size, magic bytes

    # Safe filename — never trust the original filename from the client
    uploads_root = os.path.abspath(app_settings.UPLOAD_DIR)
    logos_dir = os.path.join(uploads_root, "logos")
    os.makedirs(logos_dir, exist_ok=True)

    safe_name = f"logo_{_uuid.uuid4().hex}{exit}"
    dest_path = os.path.join(logos_dir, safe_name)

    # Path-traversal guard
    if not os.path.normpath(dest_path).startswith(logos_dir + os.sep):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file path.",
        )

    with open(dest_path, "wb") as out_file:
        out_file.write(contents)

    public_url = f"/uploads/logos/{safe_name}"

    settings_row = db.query(StoreSettings).order_by(StoreSettings.id.asc()).first()
    if not settings_row:
        settings_row = StoreSettings()
        db.add(settings_row)

    settings_row.logo = public_url
    db.commit()
    db.refresh(settings_row)

    audit.log(
        db=db, admin=current_admin,
        action="settings.logo_uploaded",
        resource_type="store_settings",
        resource_id=settings_row.id,
        changes={"logo": public_url},
        request=request,
    )
    db.commit()

    return settings_row


@router.put("/two-factor", response_model=AdminSecurityResponse)
def toggle_two_factor(
    payload: AdminSecurityUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    # Only two_factor_enabled is relevant here; delegate to service
    return update_admin_security(db, current_admin, payload)
