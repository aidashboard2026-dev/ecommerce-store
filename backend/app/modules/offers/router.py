import os
import uuid
from datetime import date, datetime, time, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.modules.auth.dependencies import get_current_admin
from app.core.config import settings
from app.core.database import get_db
from app.modules.admins.models import Admin
from app.modules.offers.models import Offer
from app.modules.offers.schemas import OfferCreate, OfferResponse
from app.modules.offers.service import create_offer, delete_offer, get_offer, get_offers, update_offer

router = APIRouter()

# Resolved absolute path inside the Docker named volume
_OFFER_UPLOAD_DIR = os.path.join(os.path.abspath(settings.UPLOAD_DIR), "offers")
os.makedirs(_OFFER_UPLOAD_DIR, exist_ok=True)


# ── Public storefront endpoint (MUST be registered BEFORE /{offer_id}) ────────
#
# FastAPI matches routes in registration order. Any static path segment like
# "active" or "admin" placed after /{offer_id} would be shadowed because
# FastAPI would try to convert "active" to int → 422 Unprocessable Entity.
# Registering these named routes first guarantees correct path resolution.

@router.get("/active/all", response_model=List[OfferResponse])
def get_active_offers_storefront(
    db: Session = Depends(get_db),
):
    """
    Public endpoint — no authentication required.
    Returns all currently published, non-expired offers for the storefront.
    """
    now = datetime.now(timezone.utc)
    return (
        db.query(Offer)
        .filter(
            Offer.status == "published",
            or_(
                Offer.expires_at.is_(None),
                Offer.expires_at > now
            )
        )
        .all()
    )


# ── Admin: List all offers ────────────────────────────────────────────────────

@router.get("/admin/all", response_model=List[OfferResponse])
def get_all_offers(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Admin-only: returns every offer regardless of status."""
    return get_offers(db)


# ── Create offer ──────────────────────────────────────────────────────────────

@router.post("/admin", response_model=OfferResponse)
async def create_new_offer(
    title: str = Form(...),
    percentage: str = Form(...),
    description: str = Form(""),
    status_field: str = Form("saved", alias="status"),
    start_date: date = Form(...),
    end_date: date = Form(...),
    start_time: time = Form(...),
    end_time: time = Form(...),
    banner_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    published_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    image_path: Optional[str] = None

    # Save banner image to the named-volume path with a UUID filename
    if banner_image and banner_image.filename:
        ext = os.path.splitext(banner_image.filename)[1].lower() or ".jpg"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(_OFFER_UPLOAD_DIR, unique_name)
        try:
            contents = await banner_image.read()
            with open(file_path, "wb") as buf:
                buf.write(contents)
            image_path = f"/uploads/offers/{unique_name}"
        except OSError:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save banner image.",
            )

    # Compute published_at / expires_at when publishing immediately
    if status_field == "published":
        published_at = datetime.now(timezone.utc)
        start_dt = datetime.combine(start_date, start_time)
        end_dt = datetime.combine(end_date, end_time)
        duration = end_dt - start_dt
        if duration.total_seconds() > 0:
            expires_at = published_at + duration

    offer_data = OfferCreate(
        title=title,
        percentage=percentage,
        description=description,
        banner_image=image_path,
        status=status_field,
        start_date=start_date,
        end_date=end_date,
        start_time=start_time,
        end_time=end_time,
        published_at=published_at,
        expires_at=expires_at,
    )
    return create_offer(db, offer_data)


# ── Get single offer (admin) ──────────────────────────────────────────────────

@router.get("/admin/{offer_id}", response_model=OfferResponse)
def get_single_offer(
    offer_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    offer = get_offer(db, offer_id)
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found",
        )
    return offer


# ── Publish offer (set status → published, compute expiry) ────────────────────

@router.put("/admin/{offer_id}", response_model=OfferResponse)
def publish_offer(
    offer_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found",
        )

    offer.status = "published"
    offer.published_at = datetime.now(timezone.utc)

    if offer.start_date and offer.start_time and offer.end_date and offer.end_time:
        start_dt = datetime.combine(offer.start_date, offer.start_time)
        end_dt = datetime.combine(offer.end_date, offer.end_time)
        duration = end_dt - start_dt
        if duration.total_seconds() > 0:
            offer.expires_at = offer.published_at + duration

    db.commit()
    db.refresh(offer)
    return offer


# ── Edit offer (title, description, dates, image, status) ─────────────────────

@router.patch("/admin/{offer_id}", response_model=OfferResponse)
async def edit_offer(
    offer_id: int,
    title: Optional[str] = Form(None),
    percentage: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    status_field: Optional[str] = Form(None, alias="status"),
    start_date: Optional[date] = Form(None),
    end_date: Optional[date] = Form(None),
    start_time: Optional[time] = Form(None),
    end_time: Optional[time] = Form(None),
    banner_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    offer = get_offer(db, offer_id)
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found",
        )

    update_fields: dict = {}

    if title is not None:
        update_fields["title"] = title
    if percentage is not None:
        update_fields["percentage"] = percentage
    if description is not None:
        update_fields["description"] = description
    if start_date is not None:
        update_fields["start_date"] = start_date
    if end_date is not None:
        update_fields["end_date"] = end_date
    if start_time is not None:
        update_fields["start_time"] = start_time
    if end_time is not None:
        update_fields["end_time"] = end_time

    # Save new banner image (same upload pattern as create) and clean up the
    # old file so it doesn't become orphaned.
    if banner_image and banner_image.filename:
        ext = os.path.splitext(banner_image.filename)[1].lower() or ".jpg"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(_OFFER_UPLOAD_DIR, unique_name)
        try:
            contents = await banner_image.read()
            with open(file_path, "wb") as buf:
                buf.write(contents)
        except OSError:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save banner image.",
            )

        old_image = offer.banner_image
        update_fields["banner_image"] = f"/uploads/offers/{unique_name}"

        if old_image:
            old_path = os.path.join(
                os.path.abspath(settings.UPLOAD_DIR),
                old_image.lstrip("/").removeprefix("uploads/"),
            )
            if os.path.isfile(old_path):
                try:
                    os.remove(old_path)
                except OSError:
                    pass

    # Resolve effective values (new value if provided, else existing offer value)
    effective_status = status_field if status_field is not None else offer.status
    effective_start_date = start_date if start_date is not None else offer.start_date
    effective_end_date = end_date if end_date is not None else offer.end_date
    effective_start_time = start_time if start_time is not None else offer.start_time
    effective_end_time = end_time if end_time is not None else offer.end_time

    if status_field is not None:
        update_fields["status"] = status_field

    # Recompute published_at / expires_at if the offer is (or becomes) published
    # and any date/time/status field changed.
    if effective_status == "published":
        if status_field == "published" and offer.status != "published":
            update_fields["published_at"] = datetime.now(timezone.utc)

        published_at = update_fields.get("published_at", offer.published_at) \
            or datetime.now(timezone.utc)

        if effective_start_date and effective_start_time and effective_end_date and effective_end_time:
            start_dt = datetime.combine(effective_start_date, effective_start_time)
            end_dt = datetime.combine(effective_end_date, effective_end_time)
            duration = end_dt - start_dt
            if duration.total_seconds() > 0:
                update_fields["expires_at"] = published_at + duration

    if not update_fields:
        return offer

    updated = update_offer(db, offer_id, update_fields)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found",
        )
    return updated


# ── Delete offer ──────────────────────────────────────────────────────────────

@router.delete("/admin/{offer_id}")
def remove_offer(
    offer_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    delete_offer(db, offer_id)
    return {"message": "Offer deleted successfully"}