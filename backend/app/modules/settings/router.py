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
    SUPPORTED_COUNTRIES,
    SUPPORTED_CURRENCIES,
    SUPPORTED_TIMEZONES,
    SUPPORTED_WEIGHT_UNITS,
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
            if not result.logo:
                try:
                    from app.shared.storage import supabase_storage
                    supabase_storage.delete_store_logo()
                except Exception:
                    logger.exception("Failed to delete store logo from Supabase in update_profile")
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
    contents = validate_and_read_image(file, max_bytes=2 * 1024 * 1024)  # MIME, extension, size, magic bytes

    from app.shared.storage import supabase_storage
    public_url = supabase_storage.upload_store_logo(contents, file.content_type)

    try:
        from app.modules.settings.service import get_or_create_store_settings
        settings_row = get_or_create_store_settings(db)

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
    except Exception as e:
        db.rollback()
        # If database update fails: delete the newly uploaded logo from Supabase Storage
        try:
            supabase_storage.delete_store_logo()
        except Exception:
            logger.exception("Failed to delete store logo from Supabase after DB update failure")
        if isinstance(e, (HTTPException, AppException)):
            raise
        logger.exception("Unexpected error in upload_logo during DB update")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while saving the logo to database."
        )

    try:
        db.refresh(settings_row)
        return settings_row
    except Exception:
        return db.query(StoreSettings).order_by(StoreSettings.id.asc()).first()


@router.delete("/logo", response_model=StoreSettingsResponse)
def remove_logo(
    request: Request = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(require_admin_or_superadmin),
):
    try:
        from app.modules.settings.service import get_or_create_store_settings
        settings_row = get_or_create_store_settings(db)
        previous_logo = settings_row.logo

        settings_row.logo = None
        db.flush()

        audit.log(
            db=db,
            admin=current_admin,
            action="settings.logo_removed",
            resource_type="store_settings",
            resource_id=settings_row.id,
            changes={"before": {"logo": previous_logo}, "after": {"logo": None}},
            request=request,
        )
        db.commit()
    except Exception as e:
        db.rollback()
        logger.exception("Unexpected error in remove_logo during DB update")
        if isinstance(e, (HTTPException, AppException)):
            raise
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while removing the logo from database."
        )

    # ONLY AFTER a successful commit: delete the old logo file from Supabase
    if previous_logo:
        try:
            from app.shared.storage import supabase_storage
            supabase_storage.delete_store_logo()
        except Exception:
            logger.exception("Failed to delete store logo from Supabase after successful commit")

    try:
        db.refresh(settings_row)
        return settings_row
    except Exception:
        return db.query(StoreSettings).order_by(StoreSettings.id.asc()).first()



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
    - Standard Product domain: max_categories, max_collections
    - Custom Printing domain:  max_custom_categories
    - Operational (delete-to-add semantics): max_banners, max_offers, max_product_images,
      max_product_variants, max_sizes, max_colors
    """
    from app.core import constants
    return {
        # ── Standard Product Domain ──────────────────────────────────────────
        "max_categories": constants.MAX_CATEGORIES,
        "max_collections": constants.MAX_COLLECTIONS,
        "max_homepage_categories": constants.MAX_HOMEPAGE_CATEGORIES,
        # ── Custom Printing Domain ───────────────────────────────────────────
        "max_custom_categories": constants.MAX_CUSTOM_CATEGORIES,
        # ── Operational Limits ───────────────────────────────────────────────
        "max_banners": constants.MAX_BANNERS,
        "max_offers": constants.MAX_OFFERS,
        "max_product_images": constants.MAX_PRODUCT_IMAGES,
        "max_product_variants": constants.MAX_PRODUCT_VARIANTS,
        "max_sizes": 999999,
        "max_colors": 999999,
        "max_image_size": constants.MAX_IMAGE_SIZE,
    }


@router.get("/default-catalog")
def read_default_catalog():
    """Retrieve default/built-in catalog definitions and protected items.

    This endpoint isolates built-in/seeded categories and collections
    from the business limits endpoint, as required.
    """
    return {
        "default_product_categories": [],
        "default_collections": [],
        "protected_product_categories": [],
        "protected_collections": [],
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
        "countries": SUPPORTED_COUNTRIES,
        "currencies": SUPPORTED_CURRENCIES,
        "timezones": SUPPORTED_TIMEZONES,
        "weight_units": SUPPORTED_WEIGHT_UNITS,
    }


@router.get("/public")
def read_public_settings(db: Session = Depends(get_db)):
    """Retrieve public store settings (name, logo, description, country, currency, etc.) without authentication."""
    try:
        from app.modules.settings.service import get_or_create_store_settings
        settings_row = get_or_create_store_settings(db)
        db.commit()

        logo_url = settings_row.logo
        if logo_url and "?t=" not in logo_url:
            from datetime import datetime
            ts = int(settings_row.updated_at.timestamp()) if settings_row.updated_at else int(datetime.utcnow().timestamp())
            logo_url = f"{logo_url}?t={ts}"

        return {
            "store_name": settings_row.store_name,
            "store_url": settings_row.store_url,
            "logo": logo_url,
            "description": settings_row.description,
            "country": settings_row.country,
            "currency": settings_row.currency,
            "timezone": settings_row.timezone,
            "weight_unit": settings_row.weight_unit,
        }
    except Exception as e:
        db.rollback()
        logger.exception("Unexpected error in read_public_settings")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred."
        )


