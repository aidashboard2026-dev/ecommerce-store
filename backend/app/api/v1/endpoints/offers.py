import os
import uuid
from datetime import date, datetime, time, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_admin
from app.core.config import settings
from app.database.session import get_db
from app.models.admin import Admin
from app.models.offer import Offer
from app.schemas.offer import OfferCreate, OfferResponse
from app.services.offer_service import create_offer, delete_offer, get_offer, get_offers

router = APIRouter()

# Resolved absolute path inside the Docker named volume
_OFFER_UPLOAD_DIR = os.path.join(os.path.abspath(settings.UPLOAD_DIR), "offers")
os.makedirs(_OFFER_UPLOAD_DIR, exist_ok=True)


# ── Create offer ──────────────────────────────────────────────────────────────

@router.post("/", response_model=OfferResponse)
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


# ── List all offers ───────────────────────────────────────────────────────────

@router.get("/", response_model=List[OfferResponse])
def get_all_offers(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return get_offers(db)


# ── Get single offer ──────────────────────────────────────────────────────────

@router.get("/{offer_id}", response_model=OfferResponse)
def get_single_offer(
    offer_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    # FIX C-5: was returning None directly → 500 serialization error
    offer = get_offer(db, offer_id)
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found",
        )
    return offer


# ── Publish offer (set status → published, compute expiry) ────────────────────

@router.put("/{offer_id}", response_model=OfferResponse)
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


# ── Delete offer ──────────────────────────────────────────────────────────────

@router.delete("/{offer_id}")
def remove_offer(
    offer_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    delete_offer(db, offer_id)
    return {"message": "Offer deleted successfully"}