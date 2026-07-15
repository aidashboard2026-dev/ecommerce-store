import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.core.constants import MAX_BANNERS
from app.modules.banners.models import Banner
from app.modules.banners.schemas import BannerCreate

logger = logging.getLogger(__name__)


def create_banner(
    db: Session,
    banner: BannerCreate
):
    existing_count = db.query(Banner).count()
    if existing_count >= MAX_BANNERS:
        logger.warning(f"Attempted to upload {existing_count + 1}th banner")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You have reached the maximum allowed limit of {MAX_BANNERS} banners. Please delete an existing banner before creating a new one."
        )

    # Automatically manage sort_order for creation: assign max + 1
    max_sort_order = db.query(Banner).order_by(Banner.sort_order.desc()).first()
    next_order = (max_sort_order.sort_order + 1) if max_sort_order else 1

    db_banner = Banner(
        title=banner.title,
        subtitle=banner.subtitle,
        banner_image=banner.banner_image,

        cta_text=banner.cta_text,
        cta_link=banner.cta_link,
        destination_type=banner.destination_type,
        destination_id=banner.destination_id,

        placement=banner.placement,
        sort_order=next_order,
        is_active=banner.is_active,
    )

    db.add(db_banner)

    try:
        db.commit()
        db.refresh(db_banner)
    except Exception as e:
        db.rollback()
        raise e

    return db_banner


def update_banner(
    db: Session,
    banner_id: int,
    update_data: dict,
):
    banner = (
        db.query(Banner)
        .filter(Banner.id == banner_id)
        .first()
    )

    if not banner:
        return None

    # Editing a banner must not change its sort position
    update_data.pop("sort_order", None)

    for field, value in update_data.items():
        setattr(banner, field, value)

    try:
        db.commit()
        db.refresh(banner)
    except Exception as e:
        db.rollback()
        raise e

    return banner


def get_banners(db: Session):
    return (
        db.query(Banner)
        .order_by(Banner.sort_order.asc(), Banner.id.desc())
        .all()
    )


def get_banner(
    db: Session,
    banner_id: int
):
    return (
        db.query(Banner)
        .filter(Banner.id == banner_id)
        .first()
    )


def delete_banner(
    db: Session,
    banner_id: int
):
    banner = (
        db.query(Banner)
        .filter(Banner.id == banner_id)
        .first()
    )

    if banner:
        db.delete(banner)
        try:
            db.commit()
            
            # Re-sequence all remaining banners automatically
            remaining_banners = (
                db.query(Banner)
                .order_by(Banner.sort_order.asc(), Banner.id.asc())
                .all()
            )
            for idx, b in enumerate(remaining_banners, start=1):
                b.sort_order = idx
            db.commit()
        except Exception as e:
            db.rollback()
            raise e

    return banner

def get_active_banners(db):
    """Active banners ordered for storefront display. Extracted from router."""
    return (
        db.query(Banner)
        .filter(Banner.is_active == True)  # noqa: E712
        .order_by(Banner.sort_order.asc(), Banner.id.desc())
        .all()
    )


def toggle_banner(db, banner_id: int):
    """Toggle a banner's is_active flag. Extracted from router."""
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        return None
    banner.is_active = not banner.is_active
    db.commit()
    db.refresh(banner)
    return banner
