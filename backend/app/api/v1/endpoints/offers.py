from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.offer import Offer
from app.database.session import get_db

from app.schemas.offer import (
    OfferCreate,
    OfferResponse
)

from app.services.offer_service import (
    create_offer,
    get_offers,
    get_offer,
    delete_offer
)

router = APIRouter()


from fastapi import (
    UploadFile,
    File,
    Form
)
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.offer import OfferResponse
from app.services.offer_service import create_offer

router = APIRouter()


from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    Form
)

from datetime import date, time,timezone
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.offer import OfferCreate, OfferResponse
from app.services.offer_service import (
    create_offer,
    get_offers,
    get_offer,
    delete_offer
)

router = APIRouter()


@router.post(
    "/",
    response_model=OfferResponse
)
async def create_new_offer(
    title: str = Form(...),
    percentage: str = Form(...),
    description: str = Form(""),

    status: str = Form("saved"),

    start_date: date = Form(...),
    end_date: date = Form(...),

    start_time: time = Form(...),
    end_time: time = Form(...),
    
    banner_image: UploadFile = File(None),

    db: Session = Depends(get_db)
):

    published_at: datetime | None = None
    expires_at: datetime | None = None
    image_path = None

    if banner_image:
        import os

        upload_dir = "uploads/offers"

        os.makedirs(
            upload_dir,
            exist_ok=True
        )

        file_path = (
            f"{upload_dir}/"
            f"{banner_image.filename}"
        )

        with open(
            file_path,
            "wb"
        ) as buffer:
            buffer.write(
                await banner_image.read()
            )

        image_path = file_path
        from datetime import datetime

        if status == "published":

            published_at = datetime.now(timezone.utc)

            start_dt = datetime.combine(
                start_date,
                start_time
            )

            end_dt = datetime.combine(
                end_date,
                end_time
            )

            duration = end_dt - start_dt

            expires_at = (
                published_at + duration
            )

    offer = OfferCreate(
        title=title,
        percentage=percentage,
        description=description,
        banner_image=image_path,
        status=status,

        start_date=start_date,
        end_date=end_date,

        start_time=start_time,
        end_time=end_time,

        published_at=published_at,
        expires_at=expires_at
    )

    return create_offer(
        db,
        offer
    )


@router.get(
    "/",
    response_model=list[OfferResponse]
)
def get_all_offers(
    db: Session = Depends(get_db)
):
    return get_offers(db)


@router.get(
    "/{offer_id}",
    response_model=OfferResponse
)
def get_single_offer(
    offer_id: int,
    db: Session = Depends(get_db)
):
    return get_offer(
        db,
        offer_id
    )

from datetime import datetime



@router.put("/{offer_id}")
def publish_offer(
    offer_id: int,
    db: Session = Depends(get_db)
):
    offer = (
        db.query(Offer)
        .filter(Offer.id == offer_id)
        .first()
    )

    if not offer:
        return {
            "message": "Offer not found"
        }

    offer.status = "published"

    offer.published_at = datetime.now(timezone.utc)

    start_dt = datetime.combine(
        offer.start_date,
        offer.start_time
    )

    end_dt = datetime.combine(
        offer.end_date,
        offer.end_time
    )

    duration = end_dt - start_dt

    offer.expires_at = (
        offer.published_at + duration
    )

    # print("START =", start_dt)
    # print("END =", end_dt)
    # print("DURATION =", duration)
    # print("PUBLISHED =", offer.published_at)
    # print("EXPIRES =", offer.expires_at)

    db.commit()

    db.refresh(offer)

    return offer
@router.delete(
    "/{offer_id}"
)
def remove_offer(
    offer_id: int,
    db: Session = Depends(get_db)
):
    delete_offer(
        db,
        offer_id
    )

    return {
        "message": "Offer deleted successfully"
    }