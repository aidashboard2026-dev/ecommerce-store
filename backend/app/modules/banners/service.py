from sqlalchemy.orm import Session

from app.modules.banners.models import Banner
from app.modules.banners.schemas import BannerCreate


def create_banner(
    db: Session,
    banner: BannerCreate
):
    db_banner = Banner(
        title=banner.title,
        subtitle=banner.subtitle,
        banner_image=banner.banner_image,

        cta_text=banner.cta_text,
        cta_link=banner.cta_link,

        placement=banner.placement,
        sort_order=banner.sort_order,
        is_active=banner.is_active,
    )

    db.add(db_banner)

    db.commit()

    db.refresh(db_banner)

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

    for field, value in update_data.items():
        setattr(banner, field, value)

    db.commit()
    db.refresh(banner)

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
        db.commit()

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
