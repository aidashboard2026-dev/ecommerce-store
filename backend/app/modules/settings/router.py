from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import os

from app.modules.auth.dependencies import get_current_admin
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
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return update_store_settings(db, payload)


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
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return update_admin_security(db, current_admin, payload)


@router.put("/password")
def update_password(
    payload: PasswordUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return update_admin_password(db, current_admin, payload)


_LOGO_ALLOWED_MIME   = {"image/jpeg", "image/png", "image/webp"}
_LOGO_ALLOWED_EXT    = {".jpg", ".jpeg", ".png", ".webp"}
_LOGO_MAX_BYTES      = 5 * 1024 * 1024  # 5 MB
_LOGO_MAGIC: dict    = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG":      "image/png",
    b"RIFF":         "image/webp",
}


@router.post("/logo", response_model=StoreSettingsResponse)
def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    import uuid as _uuid

    # MIME type allowlist
    if file.content_type not in _LOGO_ALLOWED_MIME:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Only JPG, PNG, and WebP images are allowed. Got: {file.content_type}",
        )

    # Extension allowlist
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in _LOGO_ALLOWED_EXT:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Extension '{ext}' not allowed. Use: {', '.join(_LOGO_ALLOWED_EXT)}",
        )

    contents = file.file.read()

    if not contents:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    if len(contents) > _LOGO_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Logo must be under {_LOGO_MAX_BYTES // (1024 * 1024)} MB.",
        )

    # Magic-byte validation — reject disguised files
    header = contents[:16]
    for magic, mime in _LOGO_MAGIC.items():
        if header[:len(magic)] == magic:
            if mime == "image/webp" and header[8:12] != b"WEBP":
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="File has RIFF header but is not a valid WebP image.",
                )
            break
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File content does not match any supported image format.",
        )

    # Safe filename — never trust the original filename from the client
    uploads_root = os.path.abspath(app_settings.UPLOAD_DIR)
    logos_dir = os.path.join(uploads_root, "logos")
    os.makedirs(logos_dir, exist_ok=True)

    safe_name = f"logo_{_uuid.uuid4().hex}{ext}"
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

    return settings_row


@router.put("/two-factor", response_model=AdminSecurityResponse)
def toggle_two_factor(
    payload: AdminSecurityUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    # Only two_factor_enabled is relevant here; delegate to service
    return update_admin_security(db, current_admin, payload)
