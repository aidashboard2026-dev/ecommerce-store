import os
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_admin
from app.core.config import settings
from app.database.session import get_db
from app.models.admin import Admin
from app.models.banner import Banner
from app.schemas.banner import BannerCreate, BannerResponse
from app.services.banner_service import (
    create_banner,
    delete_banner,
    get_banner,
    get_banners,
    update_banner,
)

router = APIRouter()

# Resolved absolute path inside the Docker named volume
_BANNER_UPLOAD_DIR = os.path.join(os.path.abspath(settings.UPLOAD_DIR), "banners")
os.makedirs(_BANNER_UPLOAD_DIR, exist_ok=True)


def _save_banner_image(banner_image: UploadFile) -> str:
    """Persist an uploaded banner image and return its root-relative path."""
    ext = os.path.splitext(banner_image.filename)[1].lower() or ".jpg"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(_BANNER_UPLOAD_DIR, unique_name)
    try:
        with open(file_path, "wb") as buf:
            buf.write(banner_image.file.read())
    except OSError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save banner image.",
        )
    return f"/uploads/banners/{unique_name}"


def _delete_banner_image_file(image_path: Optional[str]) -> None:
    if not image_path:
        return
    old_path = os.path.join(
        os.path.abspath(settings.UPLOAD_DIR),
        image_path.lstrip("/").removeprefix("uploads/"),
    )
    if os.path.isfile(old_path):
        try:
            os.remove(old_path)
        except OSError:
            pass


# ── Create banner ───────────────────────────────────────────────────────────

@router.post("/", response_model=BannerResponse)
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
        image_path = _save_banner_image(banner_image)

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


# ── List all banners ──────────────────────────────────────────────────────────

@router.get("/", response_model=List[BannerResponse])
def get_all_banners(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return get_banners(db)


# ── Get single banner ─────────────────────────────────────────────────────────

@router.get("/{banner_id}", response_model=BannerResponse)
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


# ── Edit banner (title, fields, image, placement, sort order, status) ─────────

@router.patch("/{banner_id}", response_model=BannerResponse)
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

    # Save new banner image (same upload pattern as offers) and clean up the
    # old file so it doesn't become orphaned.
    if banner_image and banner_image.filename:
        old_image = banner.banner_image
        update_fields["banner_image"] = _save_banner_image(banner_image)
        _delete_banner_image_file(old_image)

    if not update_fields:
        return banner

    updated = update_banner(db, banner_id, update_fields)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Banner not found",
        )
    return updated


# ── Toggle banner active/inactive ──────────────────────────────────────────────

@router.put("/{banner_id}/toggle", response_model=BannerResponse)
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


# ── Delete banner ───────────────────────────────────────────────────────────────

@router.delete("/{banner_id}")
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


# ── Public banners for storefront ─────────────────────────────────────────────

@router.get("/active/all", response_model=List[BannerResponse])
def get_active_banners_storefront(
    db: Session = Depends(get_db),
):
    return (
        db.query(Banner)
        .filter(Banner.is_active == True)
        .order_by(Banner.sort_order.asc(), Banner.id.desc())
        .all()
    )