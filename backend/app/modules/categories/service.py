from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.constants import MAX_HOMEPAGE_CATEGORIES
from app.modules.categories.models import HomepageCategory
from app.modules.categories.schemas import (
    HomepageCategoryCreate,
    HomepageCategoryUpdate,
)


def list_categories(db: Session) -> list[HomepageCategory]:
    return db.query(HomepageCategory).order_by(HomepageCategory.id.asc()).all()


def get_category(db: Session, category_id: int) -> HomepageCategory:
    category = db.get(HomepageCategory, category_id)
    if not category:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found.")
    return category


def create_category(db: Session, data: HomepageCategoryCreate) -> HomepageCategory:
    current_homepage_categories = db.query(HomepageCategory).count()
    if current_homepage_categories >= MAX_HOMEPAGE_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum of {MAX_HOMEPAGE_CATEGORIES} homepage categories are allowed."
        )
    category = HomepageCategory(**data.model_dump())
    db.add(category)
    db.flush()
    db.refresh(category)
    return category


def update_category(
    db: Session,
    category_id: int,
    data: HomepageCategoryUpdate,
) -> HomepageCategory:
    category = get_category(db, category_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    db.flush()
    db.refresh(category)
    return category


def delete_category(db: Session, category_id: int) -> HomepageCategory:
    category = get_category(db, category_id)
    db.delete(category)
    db.flush()
    return category

