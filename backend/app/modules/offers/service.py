import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.core.constants import MAX_OFFERS
from app.modules.offers.models import Offer
from app.modules.offers.schemas import OfferCreate

logger = logging.getLogger(__name__)


def create_offer(
    db: Session,
    offer: OfferCreate
):
    existing_count = db.query(Offer).count()
    if existing_count >= MAX_OFFERS:
        logger.warning(f"Attempted to create {existing_count + 1}th offer")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You have reached the maximum allowed limit of {MAX_OFFERS} offers. Please delete an existing offer before creating a new one."
        )
    db_offer = Offer(
        title=offer.title or "",
        percentage=offer.percentage or "",
        description=offer.description,
        banner_image=offer.banner_image,

        status=offer.status,

        start_date=offer.start_date,
        end_date=offer.end_date,

        start_time=offer.start_time,
        end_time=offer.end_time,

        published_at=offer.published_at,
        expires_at=offer.expires_at
    )

    db.add(db_offer)

    try:
        db.commit()
        db.refresh(db_offer)
    except Exception as e:
        db.rollback()
        raise e

    return db_offer


def update_offer(
    db: Session,
    offer_id: int,
    update_data: dict,
):
    offer = (
        db.query(Offer)
        .filter(Offer.id == offer_id)
        .first()
    )

    if not offer:
        return None

    for field, value in update_data.items():
        setattr(offer, field, value)

    try:
        db.commit()
        db.refresh(offer)
    except Exception as e:
        db.rollback()
        raise e

    return offer


def get_offers(db: Session):
    return db.query(Offer).all()


def get_offer(
    db: Session,
    offer_id: int
):
    return (
        db.query(Offer)
        .filter(Offer.id == offer_id)
        .first()
    )


def delete_offer(
    db: Session,
    offer_id: int
):
    offer = (
        db.query(Offer)
        .filter(Offer.id == offer_id)
        .first()
    )

    if offer:
        db.delete(offer)
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            raise e

    return offer

def get_active_offers(db):
    """
    Return all published, non-expired offers.
    Extracted from the router where it was a raw db.query() call.
    """
    from datetime import datetime, timezone
    from sqlalchemy import or_
    now = datetime.now(timezone.utc)
    return (
        db.query(Offer)
        .filter(
            Offer.status == "published",
            or_(Offer.expires_at.is_(None), Offer.expires_at > now),
        )
        .all()
    )


def publish_offer(db, offer_id: int):
    """
    Set an offer's status to published and compute its expiry.
    Extracted from the router where it was a raw db.query() + commit.
    """
    from datetime import datetime, timezone
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        return None

    offer.status       = "published"
    offer.published_at = datetime.now(timezone.utc)

    if offer.start_date and offer.start_time and offer.end_date and offer.end_time:
        start_dt = __import__("datetime").datetime.combine(offer.start_date, offer.start_time)
        end_dt   = __import__("datetime").datetime.combine(offer.end_date,   offer.end_time)
        duration = end_dt - start_dt
        if duration.total_seconds() > 0:
            offer.expires_at = offer.published_at + duration

    db.commit()
    db.refresh(offer)
    return offer
