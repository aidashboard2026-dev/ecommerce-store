"""
app/modules/banners/router.py

Banners router — admin and public storefront endpoints.

Phase 5 changes:
  - Image validation now uses shared utility (was duplicated inline)
  - Direct db.query() in router moved to service calls
  - Audit logging added to all admin write operations
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.constants import MAX_BANNERS
from app.modules.admins.models import Admin
from app.modules.audit.service import audit
from app.modules.auth.dependencies import get_current_admin
from app.modules.banners.models import Banner
from app.modules.banners.schemas import BannerCreate, BannerResponse
from app.modules.banners.service import (
    create_banner, delete_banner, get_active_banners,
    get_banner, get_banners, toggle_banner, update_banner,
)
from app.shared.storage import supabase_storage
from app.shared.utils.image import validate_and_read_image

router = APIRouter()
logger = logging.getLogger(__name__)


def _upload_banner_image(file: UploadFile) -> str:
    """Validate and upload a banner image. Returns the public URL."""
    contents = validate_and_read_image(file)
    return supabase_storage.upload_banner_image(
        contents=contents,
        original_filename=file.filename or "banner.jpg",
        content_type=file.content_type,
    )


# ── Public — MUST be registered before /admin/{banner_id} ────────────────────

@router.get("/active/all", response_model=List[BannerResponse])
def get_active_banners_storefront(db: Session = Depends(get_db)):
    """Public — active banners ordered for storefront display."""
    return get_active_banners(db)


# ── Admin: List ───────────────────────────────────────────────────────────────

@router.get("/admin/all", response_model=List[BannerResponse])
def get_all_banners(
    db: Session = Depends(get_db),
    _:  Admin   = Depends(get_current_admin),
):
    return get_banners(db)


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("/admin", response_model=BannerResponse)
async def create_new_banner(
    request:      Request,
    title:        str                  = Form(...),
    subtitle:     str                  = Form(""),
    cta_text:     str                  = Form(""),
    cta_link:     str                  = Form(""),
    destination_type: Optional[str]    = Form(None),
    destination_id:   Optional[int]    = Form(None),
    placement:    str                  = Form("hero"),
    sort_order:   int                  = Form(0),
    is_active:    bool                 = Form(True),
    banner_image: Optional[UploadFile] = File(None),
    db:           Session              = Depends(get_db),
    current_admin:Admin                = Depends(get_current_admin),
):
    existing_count = db.query(Banner).count()
    if existing_count >= MAX_BANNERS:
        logger.warning(f"Attempted to upload {existing_count + 1}th banner")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You have reached the maximum allowed limit of {MAX_BANNERS} banners. Please delete an existing banner before creating a new one."
        )

    existing_sort = db.query(Banner).filter(Banner.sort_order == sort_order).first()
    if existing_sort:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Banner sort order {sort_order} is already in use."
        )

    image_path: Optional[str] = None
    if banner_image and banner_image.filename:
        image_path = _upload_banner_image(banner_image)

    from app.shared.routing.utils import is_valid_route, is_valid_destination

    if destination_type and destination_type.strip():
        dst_type = destination_type.strip()
        if not is_valid_destination(db, dst_type, destination_id):
            if image_path:
                supabase_storage.delete_banner_image(image_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Destination '{dst_type}' with ID {destination_id} is not valid or active."
            )
    elif cta_link and cta_link.strip():
        if not is_valid_route(db, cta_link.strip()):
            if image_path:
                supabase_storage.delete_banner_image(image_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Route '{cta_link}' is not a valid destination."
            )

    banner_data = BannerCreate(
        title=title, subtitle=subtitle or None,
        banner_image=image_path,
        cta_text=cta_text or None, cta_link=cta_link or None,
        destination_type=destination_type, destination_id=destination_id,
        placement=placement, sort_order=sort_order, is_active=is_active,
    )

    try:
        result = create_banner(db, banner_data)
        audit.created(
            db=db, admin=current_admin,
            resource_type="banner",
            resource_id=result.id,
            resource_label=result.title,
            payload={"placement": result.placement, "is_active": result.is_active},
            request=request,
        )
        db.commit()
    except Exception as e:
        db.rollback()
        if image_path:
            supabase_storage.delete_banner_image(image_path)
        raise e

    return result


# ── Get single ────────────────────────────────────────────────────────────────

@router.get("/admin/{banner_id}", response_model=BannerResponse)
def get_single_banner(
    banner_id: int,
    db: Session = Depends(get_db),
    _:  Admin   = Depends(get_current_admin),
):
    banner = get_banner(db, banner_id)
    if not banner:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Banner not found.")
    return banner


# ── Toggle active/inactive ────────────────────────────────────────────────────

@router.put("/admin/{banner_id}/toggle", response_model=BannerResponse)
def toggle_banner_status(
    banner_id:    int,
    request:      Request,
    db:           Session = Depends(get_db),
    current_admin:Admin   = Depends(get_current_admin),
):
    result = toggle_banner(db, banner_id)
    if not result:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Banner not found.")

    audit.updated(
        db=db, admin=current_admin,
        resource_type="banner",
        resource_id=banner_id,
        resource_label=result.title,
        after={"is_active": result.is_active},
        request=request,
    )
    db.commit()
    return result


# ── Edit ──────────────────────────────────────────────────────────────────────

@router.patch("/admin/{banner_id}", response_model=BannerResponse)
async def edit_banner(
    banner_id:    int,
    request:      Request,
    title:        Optional[str]        = Form(None),
    subtitle:     Optional[str]        = Form(None),
    cta_text:     Optional[str]        = Form(None),
    cta_link:     Optional[str]        = Form(None),
    destination_type: Optional[str]    = Form(None),
    destination_id:   Optional[int]    = Form(None),
    placement:    Optional[str]        = Form(None),
    sort_order:   Optional[int]        = Form(None),
    is_active:    Optional[bool]       = Form(None),
    banner_image: Optional[UploadFile] = File(None),
    db:           Session              = Depends(get_db),
    current_admin:Admin                = Depends(get_current_admin),
):
    banner = get_banner(db, banner_id)
    if not banner:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Banner not found.")

    if sort_order is not None:
        existing_sort = db.query(Banner).filter(Banner.sort_order == sort_order, Banner.id != banner_id).first()
        if existing_sort:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Banner sort order {sort_order} is already in use."
            )

    update_fields: dict = {}
    for field, value in [
        ("title", title), ("subtitle", subtitle), ("cta_text", cta_text),
        ("cta_link", cta_link), ("placement", placement),
        ("sort_order", sort_order), ("is_active", is_active),
    ]:
        if value is not None:
            update_fields[field] = value

    if destination_type is not None:
        val = destination_type.strip()
        if not val or val.lower() in ("none", "null", "undefined"):
            update_fields["destination_type"] = None
            update_fields["destination_id"] = None
        else:
            update_fields["destination_type"] = val
            if destination_id is not None:
                update_fields["destination_id"] = destination_id
    elif destination_id is not None:
        update_fields["destination_id"] = destination_id

    from app.shared.routing.utils import is_valid_route, is_valid_destination

    effective_type = update_fields.get("destination_type", banner.destination_type)
    effective_id = update_fields.get("destination_id", banner.destination_id)

    if effective_type:
        if not is_valid_destination(db, effective_type, effective_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Destination '{effective_type}' with ID {effective_id} is not valid or active."
            )
    elif cta_link is not None:
        cta_link_stripped = cta_link.strip()
        if cta_link_stripped and cta_link_stripped != banner.cta_link:
            if not is_valid_route(db, cta_link_stripped):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Route '{cta_link_stripped}' is not a valid destination."
                )

    # Upload new image before clearing old — never lose an image on DB error
    old_image: Optional[str] = None
    if banner_image and banner_image.filename:
        old_image                      = banner.banner_image
        update_fields["banner_image"]  = _upload_banner_image(banner_image)

    if not update_fields:
        return banner

    try:
        result = update_banner(db, banner_id, update_fields)
        if not result:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Banner not found.")

        if old_image:
            supabase_storage.delete_banner_image(old_image)

        audit.updated(
            db=db, admin=current_admin,
            resource_type="banner",
            resource_id=banner_id,
            resource_label=result.title,
            after={k: str(v) for k, v in update_fields.items()},
            request=request,
        )
        db.commit()
    except Exception as e:
        db.rollback()
        if "banner_image" in update_fields:
            supabase_storage.delete_banner_image(update_fields["banner_image"])
        raise e
    return result


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/admin/{banner_id}")
def remove_banner(
    banner_id:    int,
    request:      Request,
    db:           Session = Depends(get_db),
    current_admin:Admin   = Depends(get_current_admin),
):
    banner = get_banner(db, banner_id)
    if not banner:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Banner not found.")

    try:
        label = banner.title
        banner_img = banner.banner_image
        delete_banner(db, banner_id)
        if banner_img:
            supabase_storage.delete_banner_image(banner_img)

        audit.deleted(
            db=db, admin=current_admin,
            resource_type="banner",
            resource_id=banner_id,
            resource_label=label,
            request=request,
        )
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    return {"message": "Banner deleted successfully."}
