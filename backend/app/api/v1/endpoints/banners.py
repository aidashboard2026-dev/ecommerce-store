import os
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_admin
from app.database.session import get_db
from app.models.admin import Admin
from app.models.banner import Banner
from app.schemas.banner import BannerCreate, BannerResponse
from app.services import supabase_storage
from app.services.banner_service import (
    create_banner,
    delete_banner,
    get_banner,
    get_banners,
    update_banner,
)

router = APIRouter()

# ─────────────────────────────────────────────────────────────
# Image validation — same constraints as product images
# ─────────────────────────────────────────────────────────────

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_BANNER_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB


async def _save_banner_image(banner_image: UploadFile) -> str:
    """
    Validates and uploads a banner image directly to Supabase Storage,
    returning its public URL. No file is ever written to local disk.
    """
    if banner_image.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Only JPG, PNG, and WebP images are allowed. Got: {banner_image.content_type}",
        )

    ext = os.path.splitext(banner_image.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"File extension '{ext}' is not allowed. Use: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    contents = await banner_image.read()

    if not contents:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    if len(contents) > MAX_BANNER_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image must be under {MAX_BANNER_IMAGE_SIZE // (1024 * 1024)} MB.",
        )

    return supabase_storage.upload_banner_image(
        contents=contents,
        original_filename=banner_image.filename or "banner.jpg",
        content_type=banner_image.content_type,
    )


def _delete_banner_image_file(image_url: Optional[str]) -> None:
    """
    Best-effort delete of a banner image from Supabase Storage. Safe to
    call with None or with a legacy local path (e.g. /uploads/banners/...)
    left over from before this migration — those simply won't match the
    Supabase public-URL shape and will be skipped.
    """
    supabase_storage.delete_banner_image(image_url)


# ── Public storefront endpoint (MUST be registered BEFORE /admin/{banner_id}) ─
#
# FastAPI matches routes in registration order. Static path segments registered
# after /{banner_id} are shadowed by the dynamic route. Keeping /active/all and
# /admin/* named routes here, before any dynamic segment, guarantees they are
# matched correctly without any parameter coercion.

@router.get("/active/all", response_model=List[BannerResponse])
def get_active_banners_storefront(
    db: Session = Depends(get_db),
):
    """
    Public endpoint — no authentication required.
    Returns all active banners ordered for display on the storefront.
    """
    return (
        db.query(Banner)
        .filter(Banner.is_active == True)
        .order_by(Banner.sort_order.asc(), Banner.id.desc())
        .all()
    )


# ── Admin: List all banners ────────────────────────────────────────────────────

@router.get("/admin/all", response_model=List[BannerResponse])
def get_all_banners(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Admin-only: returns every banner regardless of active status."""
    return get_banners(db)


# ── Create banner ─────────────────────────────────────────────────────────────

@router.post("/admin", response_model=BannerResponse)
async def create_new_banner(
    title: str = Form(...),
    subtitle: str = Form(""),
    cta_text: str = Form(""),
    cta_link: str = Form(""),
    placement: str = Form("hero"),
    sort_order: int = Form(0),
    is_active: bool = Form(True),
    banner_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    image_path: Optional[str] = None

    if banner_image and banner_image.filename:
        image_path = await _save_banner_image(banner_image)

    banner_data = BannerCreate(
        title=title,
        subtitle=subtitle or None,
        banner_image=image_path,
        cta_text=cta_text or None,
        cta_link=cta_link or None,
        placement=placement,
        sort_order=sort_order,
        is_active=is_active,
    )
    return create_banner(db, banner_data)


# ── Get single banner (admin) ─────────────────────────────────────────────────

@router.get("/admin/{banner_id}", response_model=BannerResponse)
def get_single_banner(
    banner_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    banner = get_banner(db, banner_id)
    if not banner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Banner not found",
        )
    return banner


# ── Toggle banner active/inactive ─────────────────────────────────────────────

@router.put("/admin/{banner_id}/toggle", response_model=BannerResponse)
def toggle_banner_status(
    banner_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Banner not found",
        )

    banner.is_active = not banner.is_active
    db.commit()
    db.refresh(banner)
    return banner


# ── Edit banner (title, fields, image, placement, sort order, status) ─────────

@router.patch("/admin/{banner_id}", response_model=BannerResponse)
async def edit_banner(
    banner_id: int,
    title: Optional[str] = Form(None),
    subtitle: Optional[str] = Form(None),
    cta_text: Optional[str] = Form(None),
    cta_link: Optional[str] = Form(None),
    placement: Optional[str] = Form(None),
    sort_order: Optional[int] = Form(None),
    is_active: Optional[bool] = Form(None),
    banner_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    banner = get_banner(db, banner_id)
    if not banner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Banner not found",
        )

    update_fields: dict = {}

    if title is not None:
        update_fields["title"] = title
    if subtitle is not None:
        update_fields["subtitle"] = subtitle
    if cta_text is not None:
        update_fields["cta_text"] = cta_text
    if cta_link is not None:
        update_fields["cta_link"] = cta_link
    if placement is not None:
        update_fields["placement"] = placement
    if sort_order is not None:
        update_fields["sort_order"] = sort_order
    if is_active is not None:
        update_fields["is_active"] = is_active

    # Upload the new image first, then only delete the old one after the
    # DB update has committed successfully — avoids losing the old image
    # if the update fails partway through.
    old_image_to_delete: Optional[str] = None
    if banner_image and banner_image.filename:
        old_image_to_delete = banner.banner_image
        update_fields["banner_image"] = await _save_banner_image(banner_image)

    if not update_fields:
        return banner

    updated = update_banner(db, banner_id, update_fields)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Banner not found",
        )

    if old_image_to_delete:
        _delete_banner_image_file(old_image_to_delete)

    return updated


# ── Delete banner ──────────────────────────────────────────────────────────────

@router.delete("/admin/{banner_id}")
def remove_banner(
    banner_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    banner = get_banner(db, banner_id)
    if not banner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Banner not found",
        )

    _delete_banner_image_file(banner.banner_image)
    delete_banner(db, banner_id)
    return {"message": "Banner deleted successfully"}