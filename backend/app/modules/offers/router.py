"""
app/modules/offers/router.py

Offers router — admin and public storefront endpoints.

Phase 5 changes:
  - Image validation now uses shared utility (was duplicated inline)
  - Raw SQL queries in router moved to service layer
  - Audit logging added to all admin write operations
  - import buried inside function removed
"""

import os
from datetime import date, datetime, time, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.admins.models import Admin
from app.modules.audit.service import audit
from app.modules.auth.dependencies import get_current_admin
from app.modules.offers.models import Offer
from app.modules.offers.schemas import OfferCreate, OfferResponse
from app.modules.offers.service import (
    create_offer, delete_offer, get_offer, get_offers,
    get_active_offers, publish_offer as svc_publish_offer,
    update_offer,
)
from app.shared.storage import supabase_storage
from app.shared.utils.image import validate_and_read_image

router = APIRouter()

COOKIE_SECURE = os.getenv("AUTH_COOKIE_SECURE", "true").lower() != "false"


def _upload_offer_image(file: UploadFile) -> str:
    """Validate and upload an offer banner image. Returns the public URL."""
    contents = validate_and_read_image(file)
    return supabase_storage.upload_banner_image(
        contents=contents,
        original_filename=file.filename or "offer.jpg",
        content_type=file.content_type,
    )


# ── Public storefront — MUST be registered before /{offer_id} ────────────────

@router.get("/active/all", response_model=List[OfferResponse])
def get_active_offers_storefront(db: Session = Depends(get_db)):
    """Public — active non-expired offers for the storefront."""
    return get_active_offers(db)


# ── Admin: List all offers ────────────────────────────────────────────────────

@router.get("/admin/all", response_model=List[OfferResponse])
def get_all_offers(
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    return get_offers(db)


# ── Create offer ──────────────────────────────────────────────────────────────

@router.post("/admin", response_model=OfferResponse)
async def create_new_offer(
    request:      Request,
    title:        Optional[str]          = Form(None),
    percentage:   Optional[str]          = Form(None),
    description:  str                    = Form(""),
    status_field: str                    = Form("saved", alias="status"),
    start_date:   date                   = Form(...),
    end_date:     date                   = Form(...),
    start_time:   time                   = Form(...),
    end_time:     time                   = Form(...),
    banner_image: Optional[UploadFile]   = File(None),
    db:           Session                = Depends(get_db),
    current_admin:Admin                  = Depends(get_current_admin),
):
    image_path:   Optional[str]      = None
    published_at: Optional[datetime] = None
    expires_at:   Optional[datetime] = None

    if banner_image and banner_image.filename:
        image_path = _upload_offer_image(banner_image)

    if status_field == "published":
        published_at = datetime.now(timezone.utc)
        duration     = datetime.combine(end_date, end_time) - datetime.combine(start_date, start_time)
        if duration.total_seconds() > 0:
            expires_at = published_at + duration

    offer_data = OfferCreate(
        title=title, percentage=percentage, description=description,
        banner_image=image_path, status=status_field,
        start_date=start_date, end_date=end_date,
        start_time=start_time, end_time=end_time,
        published_at=published_at, expires_at=expires_at,
    )
    result = create_offer(db, offer_data)

    audit.created(
        db=db, admin=current_admin,
        resource_type="offer",
        resource_id=result.id,
        resource_label=result.title or f"Offer #{result.id}",
        payload={"status": result.status},
        request=request,
    )
    db.commit()
    return result


# ── Get single offer (admin) ──────────────────────────────────────────────────

@router.get("/admin/{offer_id}", response_model=OfferResponse)
def get_single_offer(
    offer_id: int,
    db:       Session = Depends(get_db),
    _:        Admin   = Depends(get_current_admin),
):
    offer = get_offer(db, offer_id)
    if not offer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offer not found.")
    return offer


# ── Publish offer ─────────────────────────────────────────────────────────────

@router.put("/admin/{offer_id}", response_model=OfferResponse)
def publish_offer(
    offer_id:     int,
    request:      Request,
    db:           Session = Depends(get_db),
    current_admin:Admin   = Depends(get_current_admin),
):
    result = svc_publish_offer(db, offer_id)
    if not result:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offer not found.")

    audit.updated(
        db=db, admin=current_admin,
        resource_type="offer",
        resource_id=offer_id,
        resource_label=result.title or f"Offer #{offer_id}",
        after={"status": "published"},
        request=request,
    )
    db.commit()
    return result


# ── Edit offer ────────────────────────────────────────────────────────────────

@router.patch("/admin/{offer_id}", response_model=OfferResponse)
async def edit_offer(
    offer_id:     int,
    request:      Request,
    title:        Optional[str]        = Form(None),
    percentage:   Optional[str]        = Form(None),
    description:  Optional[str]        = Form(None),
    status_field: Optional[str]        = Form(None, alias="status"),
    start_date:   Optional[date]       = Form(None),
    end_date:     Optional[date]       = Form(None),
    start_time:   Optional[time]       = Form(None),
    end_time:     Optional[time]       = Form(None),
    banner_image: Optional[UploadFile] = File(None),
    db:           Session              = Depends(get_db),
    current_admin:Admin                = Depends(get_current_admin),
):
    offer = get_offer(db, offer_id)
    if not offer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offer not found.")

    update_fields: dict = {}

    for field, value in [
        ("title", title), ("percentage", percentage), ("description", description),
        ("start_date", start_date), ("end_date", end_date),
        ("start_time", start_time), ("end_time", end_time),
    ]:
        if value is not None:
            update_fields[field] = value

    if banner_image and banner_image.filename:
        old_image = offer.banner_image
        update_fields["banner_image"] = _upload_offer_image(banner_image)
        if old_image:
            supabase_storage.delete_banner_image(old_image)

    effective_status     = status_field    if status_field is not None else offer.status
    effective_start_date = start_date      if start_date   is not None else offer.start_date
    effective_end_date   = end_date        if end_date     is not None else offer.end_date
    effective_start_time = start_time      if start_time   is not None else offer.start_time
    effective_end_time   = end_time        if end_time     is not None else offer.end_time

    if status_field is not None:
        update_fields["status"] = status_field

    if effective_status == "published":
        if status_field == "published" and offer.status != "published":
            update_fields["published_at"] = datetime.now(timezone.utc)
        published_at = update_fields.get("published_at", offer.published_at) or datetime.now(timezone.utc)
        if all([effective_start_date, effective_start_time, effective_end_date, effective_end_time]):
            duration = (
                datetime.combine(effective_end_date, effective_end_time)
                - datetime.combine(effective_start_date, effective_start_time)
            )
            if duration.total_seconds() > 0:
                update_fields["expires_at"] = published_at + duration

    if not update_fields:
        return offer

    result = update_offer(db, offer_id, update_fields)
    if not result:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offer not found.")

    audit.updated(
        db=db, admin=current_admin,
        resource_type="offer",
        resource_id=offer_id,
        resource_label=result.title or f"Offer #{offer_id}",
        after={k: str(v) for k, v in update_fields.items()},
        request=request,
    )
    db.commit()
    return result


# ── Delete offer ──────────────────────────────────────────────────────────────

@router.delete("/admin/{offer_id}")
def remove_offer(
    offer_id:     int,
    request:      Request,
    db:           Session = Depends(get_db),
    current_admin:Admin   = Depends(get_current_admin),
):
    offer = get_offer(db, offer_id)
    label = (offer.title if offer else None) or f"Offer #{offer_id}"
    delete_offer(db, offer_id)

    audit.deleted(
        db=db, admin=current_admin,
        resource_type="offer",
        resource_id=offer_id,
        resource_label=label,
        request=request,
    )
    db.commit()
    return {"message": "Offer deleted successfully."}
