from math import ceil
from slugify import slugify

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.products.models import Category, Collection
from app.modules.custom_products.models import CustomProduct
from app.modules.custom_products.schemas import (
    CustomProductCreate,
    CustomProductUpdate,
)


def get_custom_product(db: Session, product_id: int):
    product = (
        db.query(CustomProduct)
        .filter(
            CustomProduct.id == product_id,
            CustomProduct.deleted_at.is_(None)
        )
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom Product not found"
        )

    return product

def create_custom_product(
    db: Session,
    data: CustomProductCreate
):
    slug = slugify(data.title)

    product = CustomProduct(
        title=data.title,
        slug=slug,

        description=data.description,
        short_description=data.short_description,

        category_id=data.category_id,
        collection_id=data.collection_id,
        collection=data.collection,

        tags=data.tags,

        sku=data.sku,
        size=data.size,

        status=data.status,

        is_featured=data.is_featured,
        is_trending=data.is_trending,
        is_best_seller=data.is_best_seller,
        is_new_arrival=data.is_new_arrival,

        seo_title=data.seo_title,
        seo_description=data.seo_description,

        original_price_min=data.original_price_min,
        original_price_max=data.original_price_max,

        selling_price_min=data.selling_price_min,
        selling_price_max=data.selling_price_max,

        stock_quantity=data.stock_quantity,
        low_stock_threshold=data.low_stock_threshold,

        thumbnail=data.thumbnail,

        image_front=data.image_front,

        image_back=data.image_back,

        image_size_chart=data.image_size_chart,

        gallery_images=data.gallery_images,
        )

    db.add(product)
    db.commit()
    db.refresh(product)

    return product


def update_custom_product(
    db: Session,
    product_id: int,
    data: CustomProductUpdate
):
    product = get_custom_product(db, product_id)

    update_data = data.model_dump(exclude_unset=True)

    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(product, key, value)

    for key, value in update_data.items():
        setattr(product, key, value)

    if "title" in update_data:
        product.slug = slugify(product.title)

    db.commit()
    db.refresh(product)

    return product

def delete_custom_product(
    db: Session,
    product_id: int
):
    product = get_custom_product(db, product_id)

    db.delete(product)

    db.commit()

    return True

def get_custom_products(
    db: Session,
    page: int = 1,
    per_page: int = 15,
    search: str | None = None,
    category_id: int | None = None,
):
    query = db.query(CustomProduct).filter(
        CustomProduct.deleted_at.is_(None)
    )

    if search:
        query = query.filter(
            CustomProduct.title.ilike(f"%{search}%")
        )

    if category_id:
        query = query.filter(
            CustomProduct.category_id == category_id
        )

    total = query.count()

    items = (
        query.order_by(CustomProduct.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": ceil(total / per_page) if total else 1,
    }

def get_public_custom_products(
    db: Session,
    page: int = 1,
    per_page: int = 15,
    search: str | None = None,
    category_id: int | None = None,
):
    query = (
        db.query(CustomProduct)
        .filter(
            CustomProduct.deleted_at.is_(None),
            CustomProduct.status == "published"
        )
    )

    if search:
        query = query.filter(
            CustomProduct.title.ilike(f"%{search}%")
        )

    if category_id:
        query = query.filter(
            CustomProduct.category_id == category_id
        )

    total = query.count()

    items = (
        query.order_by(CustomProduct.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": ceil(total / per_page) if total else 1,
    }    