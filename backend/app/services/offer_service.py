from sqlalchemy.orm import Session

from app.models.offer import Offer
from app.schemas.offer import OfferCreate


def create_offer(
    db: Session,
    offer: OfferCreate
):
    db_offer = Offer(
        title=offer.title,
        percentage=offer.percentage,
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

    db.commit()

    db.refresh(db_offer)

    return db_offer


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
        db.commit()

    return offer