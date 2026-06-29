from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List
import os
import logging

from app.modules.auth.dependencies import get_current_admin
from app.modules.audit.service import audit
from app.shared.utils.image import validate_and_read_image
from app.core.database import get_db
from app.modules.admins.models import Admin
from app.shared.exceptions import AppException
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
from app.modules.settings.models import StoreSettings, AdminSecurity, PaymentMethod, NotificationSetting

logger = logging.getLogger("app.settings")
router = APIRouter()


def require_admin_or_superadmin(current_admin: Admin = Depends(get_current_admin)) -> Admin:
    if current_admin.role not in ("superadmin", "admin"):
        from app.shared.exceptions import AuthorizationError
        raise AuthorizationError(
            "Insufficient permissions. This action requires the admin or superadmin role.",
            code="INSUFFICIENT_PERMISSIONS",
        )
    return current_admin


@router.get("", response_model=SettingsBundleResponse)
def read_settings(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    try:
        result = get_settings_bundle(db, current_admin)
        db.commit()
        return result
    except HTTPException:
        db.rollback()
        raise
    except AppException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Unexpected error in read_settings")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred."
        )


@router.put("", response_model=StoreSettingsResponse)
def update_settings(
    payload: StoreSettingsUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_admin_or_superadmin),
):
    try:
        from app.modules.settings.service import get_or_create_store_settings
        previous = get_or_create_store_settings(db)
        previous_data = {
            "country": previous.country,
            "currency": previous.currency,
            "timezone": previous.timezone,
            "weight_unit": previous.weight_unit,
        }
        result = update_store_settings(db, payload)
        new_data = {
            "country": result.country,
            "currency": result.currency,
            "timezone": result.timezone,
            "weight_unit": result.weight_unit,
        }
        audit.log(
            db=db,
            admin=current_admin,
            action="settings.regional_updated",
            resource_type="store_settings",
            resource_id=result.id,
            changes={"before": previous_data, "after": new_data},
            request=request,
        )
        db.commit()
        return result
    except HTTPException:
        db.rollback()
        raise
    except AppException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Unexpected error in update_settings")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred."
        )


@router.get("/payments", response_model=List[PaymentMethodResponse])
def read_payment_methods(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    try:
        result = ensure_payment_methods(db)
        db.commit()
        return result
    except HTTPException:
        db.rollback()
        raise
    except AppException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Unexpected error in read_payment_methods")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred."
        )


@router.put("/payments/{payment_id}", response_model=PaymentMethodResponse)
def update_payment(
    payment_id: int,
    payload: PaymentMethodUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_admin_or_superadmin),
):
    try:
        payment = db.query(PaymentMethod).filter(PaymentMethod.id == payment_id).first()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment method not found.")
        previous_data = {
            "name": payment.name,
            "fee": float(payment.fee) if payment.fee is not None else 0.0,
            "is_active": payment.is_active,
        }
        result = update_payment_method(db, payment_id, payload)
        new_data = {
            "name": result.name,
            "fee": float(result.fee) if result.fee is not None else 0.0,
            "is_active": result.is_active,
        }
        audit.log(
            db=db,
            admin=current_admin,
            action="settings.payment_updated",
            resource_type="payment_method",
            resource_id=result.id,
            resource_label=result.name,
            changes={"before": previous_data, "after": new_data},
            request=request,
        )
        db.commit()
        return result
    except HTTPException:
        db.rollback()
        raise
    except AppException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Unexpected error in update_payment")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred."
        )


@router.get("/notifications", response_model=List[NotificationSettingResponse])
def read_notification_settings(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    try:
        result = ensure_notification_settings(db)
        db.commit()
        return result
    except HTTPException:
        db.rollback()
        raise
    except AppException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Unexpected error in read_notification_settings")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred."
        )


@router.put("/notifications/{notification_id}", response_model=NotificationSettingResponse)
def update_notification(
    notification_id: int,
    payload: NotificationSettingUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_admin_or_superadmin),
):
    try:
        notification = db.query(NotificationSetting).filter(NotificationSetting.id == notification_id).first()
        if not notification:
            raise HTTPException(status_code=404, detail="Notification setting not found.")
        previous_data = {
            "event_name": notification.event_name,
            "email_enabled": notification.email_enabled,
            "whatsapp_enabled": notification.whatsapp_enabled,
        }
        result = update_notification_setting(db, notification_id, payload)
        new_data = {
            "event_name": result.event_name,
            "email_enabled": result.email_enabled,
            "whatsapp_enabled": result.whatsapp_enabled,
        }
        audit.log(
            db=db,
            admin=current_admin,
            action="settings.notification_updated",
            resource_type="notification_setting",
            resource_id=result.id,
            resource_label=result.event_name,
            changes={"before": previous_data, "after": new_data},
            request=request,
        )
        db.commit()
        return result
    except HTTPException:
        db.rollback()
        raise
    except AppException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Unexpected error in update_notification")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred."
        )


def delete_logo_file(public_url: str):
    if not public_url:
        return
    if public_url.startswith("/uploads/logos/"):
        filename = public_url.replace("/uploads/logos/", "")
        if "/" not in filename and "\\" not in filename:
            uploads_root = os.path.abspath(app_settings.UPLOAD_DIR)
            logos_dir = os.path.join(uploads_root, "logos")
            file_path = os.path.join(logos_dir, filename)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception:
                    logger.exception(f"Failed to delete orphaned logo file: {file_path}")


@router.put("/profile", response_model=StoreSettingsResponse)
def update_profile(
    payload: StoreSettingsUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_admin_or_superadmin),
):
    try:
        from app.modules.settings.service import get_or_create_store_settings
        previous = get_or_create_store_settings(db)
        previous_data = {
            "store_name": previous.store_name,
            "store_url": previous.store_url,
            "support_email": previous.support_email,
            "support_phone": previous.support_phone,
            "description": previous.description,
            "logo": previous.logo,
        }
        result = update_store_settings(db, payload)
        new_data = {
            "store_name": result.store_name,
            "store_url": result.store_url,
            "support_email": result.support_email,
            "support_phone": result.support_phone,
            "description": result.description,
            "logo": result.logo,
        }
        audit.log(
            db=db,
            admin=current_admin,
            action="settings.profile_updated",
            resource_type="store_settings",
            resource_id=result.id,
            changes={"before": previous_data, "after": new_data},
            request=request,
        )
        db.commit()
        if previous_data["logo"] and previous_data["logo"] != result.logo:
            delete_logo_file(previous_data["logo"])
        return result
    except HTTPException:
        db.rollback()
        raise
    except AppException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Unexpected error in update_profile")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred."
        )


@router.put("/security", response_model=AdminSecurityResponse)
def update_security(
    payload: AdminSecurityUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    try:
        from app.modules.settings.service import get_or_create_admin_security
        security_row = get_or_create_admin_security(db, current_admin)
        previous_data = {
            "username": security_row.username,
            "email": security_row.email,
            "two_factor_enabled": security_row.two_factor_enabled,
        }
        result = update_admin_security(db, current_admin, payload)
        new_data = {
            "username": result.username,
            "email": result.email,
            "two_factor_enabled": result.two_factor_enabled,
        }
        audit.log(
            db=db,
            admin=current_admin,
            action="settings.security_updated",
            resource_type="admin_security",
            resource_id=result.id,
            changes={"before": previous_data, "after": new_data},
            request=request,
        )
        db.commit()
        return result
    except HTTPException:
        db.rollback()
        raise
    except AppException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Unexpected error in update_security")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred."
        )


@router.put("/password")
def update_password(
    payload: PasswordUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    try:
        result = update_admin_password(db, current_admin, payload)
        audit.log(
            db=db,
            admin=current_admin,
            action="settings.password_changed",
            resource_type="admin",
            resource_id=current_admin.id,
            changes={"action": "password_changed"},
            request=request,
        )
        db.commit()
        return result
    except HTTPException:
        db.rollback()
        raise
    except AppException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Unexpected error in update_password")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred."
        )


@router.post("/logo", response_model=StoreSettingsResponse)
def upload_logo(
    file: UploadFile = File(...),
    request: Request = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_admin_or_superadmin),
):
    import uuid as _uuid

    contents = validate_and_read_image(file, max_bytes=2 * 1024 * 1024)  # MIME, extension, size, magic bytes

    # Safe filename — never trust the original filename from the client
    uploads_root = os.path.abspath(app_settings.UPLOAD_DIR)
    logos_dir = os.path.join(uploads_root, "logos")
    os.makedirs(logos_dir, exist_ok=True)

    _, ext = os.path.splitext(file.filename or "")
    if not ext:
        ext = ".jpg"
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

    try:
        settings_row = db.query(StoreSettings).order_by(StoreSettings.id.asc()).first()
        if not settings_row:
            settings_row = StoreSettings()
            db.add(settings_row)

        previous_logo = settings_row.logo
        settings_row.logo = public_url
        db.flush()

        audit.log(
            db=db,
            admin=current_admin,
            action="settings.logo_uploaded",
            resource_type="store_settings",
            resource_id=settings_row.id,
            changes={"before": {"logo": previous_logo}, "after": {"logo": public_url}},
            request=request,
        )
        db.commit()
        if previous_logo and previous_logo != public_url:
            delete_logo_file(previous_logo)
        db.refresh(settings_row)
        return settings_row
    except HTTPException:
        db.rollback()
        raise
    except AppException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Unexpected error in upload_logo")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred."
        )


@router.put("/two-factor", response_model=AdminSecurityResponse)
def toggle_two_factor(
    payload: AdminSecurityUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    try:
        from app.modules.settings.service import get_or_create_admin_security
        security_row = get_or_create_admin_security(db, current_admin)
        previous_data = {
            "username": security_row.username,
            "email": security_row.email,
            "two_factor_enabled": security_row.two_factor_enabled,
        }
        result = update_admin_security(db, current_admin, payload)
        new_data = {
            "username": result.username,
            "email": result.email,
            "two_factor_enabled": result.two_factor_enabled,
        }
        audit.log(
            db=db,
            admin=current_admin,
            action="settings.security_updated",
            resource_type="admin_security",
            resource_id=result.id,
            changes={"before": previous_data, "after": new_data},
            request=request,
        )
        db.commit()
        return result
    except HTTPException:
        db.rollback()
        raise
    except AppException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Unexpected error in toggle_two_factor")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred."
        )


@router.get("/business-limits")
def read_business_limits():
    """Retrieve read-only business limits defined in app/core/constants.py.

    This endpoint is the single source of truth for all frontend limit checks.
    Frontend must NEVER hardcode any of these values — always read from here.

    Limits are grouped by domain:
    - Standard Product domain: max_categories, max_collections, max_sub_collections
    - Custom Printing domain:  max_custom_categories
    - Operational (delete-to-add semantics): max_banners, max_offers, max_product_images,
      max_product_variants, max_sizes, max_colors
    """
    from app.core import constants
    return {
        # ── Standard Product Domain ──────────────────────────────────────────
        "max_categories": constants.MAX_CATEGORIES,
        "max_collections": constants.MAX_COLLECTIONS,
        "max_sub_collections": constants.MAX_SUB_COLLECTIONS,
        # ── Custom Printing Domain ───────────────────────────────────────────
        "max_custom_categories": constants.MAX_CUSTOM_CATEGORIES,
        # ── Operational Limits ───────────────────────────────────────────────
        "max_banners": constants.MAX_BANNERS,
        "max_offers": constants.MAX_OFFERS,
        "max_product_images": constants.MAX_PRODUCT_IMAGES,
        "max_product_variants": constants.MAX_PRODUCT_VARIANTS,
        "max_sizes": constants.MAX_SIZES,
        "max_colors": constants.MAX_COLORS,
        "max_image_size": constants.MAX_IMAGE_SIZE,
    }


@router.get("/default-catalog")
def read_default_catalog():
    """Retrieve default/built-in catalog definitions and protected items.

    This endpoint isolates built-in/seeded categories and collections
    from the business limits endpoint, as required.
    """
    from app.core import constants
    return {
        "default_product_categories": constants.DEFAULT_PRODUCT_CATEGORIES,
        "default_collections": constants.DEFAULT_COLLECTIONS,
        "protected_product_categories": constants.PROTECTED_PRODUCT_CATEGORIES,
        "protected_collections": constants.PROTECTED_COLLECTIONS,
    }


@router.get("/public-payments", response_model=List[PaymentMethodResponse])
def read_public_payment_methods(db: Session = Depends(get_db)):
    """Retrieve payment methods for storefront checkout without authentication."""
    try:
        result = ensure_payment_methods(db)
        db.commit()
        return [method for method in result if method.is_active]
    except Exception as e:
        db.rollback()
        logger.exception("Unexpected error in read_public_payment_methods")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred."
        )


@router.get("/regional-options")
def read_regional_options():
    """Retrieve lists of valid regional options (countries, currencies, timezones, weight units)."""
    return {
        "countries": [
            "India",
            "United States",
            "United Kingdom",
            "Canada",
            "Australia",
            "Singapore",
            "United Arab Emirates",
        ],
        "currencies": ["INR", "USD", "GBP", "CAD", "AUD", "SGD", "AED"],
        "timezones": [
            "Asia/Kolkata",
            "UTC",
            "America/New_York",
            "America/Los_Angeles",
            "Europe/London",
            "Asia/Singapore",
            "Asia/Dubai",
        ],
        "weight_units": ["kg", "g", "lb", "oz"],
    }

