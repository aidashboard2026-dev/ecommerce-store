from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.auth.dependencies import get_current_admin
from app.core.database import get_db
from app.modules.admins.models import Admin
from app.modules.delivery_zones.models import DeliveryZone
from app.modules.delivery_zones.schemas import (
    DeliveryZoneCreate,
    DeliveryZoneResponse,
    DeliveryZoneUpdate,
    DeliveryEstimateResponse,
)

router = APIRouter()

# Default delivery days used when a city has no zone record.
_DEFAULT_DELIVERY_DAYS = 5


# ── Public ────────────────────────────────────────────────────────────────────

@router.get("/estimate", response_model=DeliveryEstimateResponse)
def get_delivery_estimate(
    city: str = Query(..., min_length=1, description="Customer city name"),
    db: Session = Depends(get_db),
):
    """
    Returns the estimated delivery days for a given city.
    Falls back to the default (5 days) when no zone record is found.
    Called by the storefront CheckoutPage to show estimated delivery date.
    """
    from app.shared.normalization import normalize_name
    try:
        norm_city = normalize_name(city).canonical_name
    except Exception:
        norm_city = city.strip()

    zone = (
        db.query(DeliveryZone)
        .filter(DeliveryZone.city == norm_city)
        .first()
    )
    days = zone.delivery_days if zone else _DEFAULT_DELIVERY_DAYS
    return DeliveryEstimateResponse(
        city=norm_city,
        delivery_days=days,
        message=f"Estimated delivery in {days} business day{'s' if days != 1 else ''}",
    )


# ── Admin ─────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[DeliveryZoneResponse])
def list_delivery_zones(
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return db.query(DeliveryZone).order_by(DeliveryZone.city).all()


@router.post("/", response_model=DeliveryZoneResponse, status_code=status.HTTP_201_CREATED)
def create_delivery_zone(
    payload: DeliveryZoneCreate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    from app.shared.normalization import normalize_name
    try:
        norm_city = normalize_name(payload.city).canonical_name
    except Exception:
        norm_city = payload.city.strip()

    zone = DeliveryZone(city=norm_city, delivery_days=payload.delivery_days)
    db.add(zone)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A delivery zone for '{norm_city}' already exists.",
        )
    db.refresh(zone)
    return zone


@router.put("/{zone_id}", response_model=DeliveryZoneResponse)
def update_delivery_zone(
    zone_id: int,
    payload: DeliveryZoneUpdate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    zone = db.query(DeliveryZone).filter(DeliveryZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")

    from app.shared.normalization import normalize_name
    if payload.city is not None:
        try:
            zone.city = normalize_name(payload.city).canonical_name
        except Exception:
            zone.city = payload.city.strip()
    if payload.delivery_days is not None:
        zone.delivery_days = payload.delivery_days

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A delivery zone for '{zone.city}' already exists.",
        )
    db.refresh(zone)
    return zone


@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_delivery_zone(
    zone_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    zone = db.query(DeliveryZone).filter(DeliveryZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")
    db.delete(zone)
    db.commit()
