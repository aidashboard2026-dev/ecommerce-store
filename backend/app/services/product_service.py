import re
import math
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import Optional

from app.models.product import Product, ProductVariant
from app.schemas.product import (
    ProductCreate, ProductUpdate, VariantCreate, ProductListResponse, ProductResponse
)


def _slugify(text: str) -> str:
    """Generate a URL-friendly slug from text."""
    slug = text.lower().strip()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    return re.sub(r'-+', '-', slug).strip('-')


def _ensure_unique_slug(db: Session, base_slug: str, exclude_id: Optional[int] = None) -> str:
    """Append a numeric suffix if the slug already exists."""
    slug = base_slug
    counter = 1
    while True:
        query = db.query(Product).filter(Product.slug == slug)
        if exclude_id:
            query = query.filter(Product.id != exclude_id)
        if not query.first():
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1


# ── CRUD ─────────────────────────────────────────────────────────────────────

def get_products_paginated(
    db: Session,
    *,
    search: str = "",
    status: str = "",
    page: int = 1,
    per_page: int = 15,
) -> ProductListResponse:
    query = db.query(Product).options(joinedload(Product.variants))

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(Product.title.ilike(term), Product.slug.ilike(term))
        )
    if status:
        query = query.filter(Product.status == status)

    total = query.count()
    total_pages = math.ceil(total / per_page) if total else 1

    products = (
        query.order_by(Product.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    # Manually build response to include computed properties
    items = []
    for p in products:
        item = ProductResponse(
            id=p.id,
            title=p.title,
            slug=p.slug,
            description=p.description,
            collection=p.collection,
            tags=p.tags or [],
            status=p.status,
            is_featured=p.is_featured,
            thumbnail=p.thumbnail,
            seo_title=p.seo_title,
            seo_description=p.seo_description,
            total_stock=p.total_stock,
            min_price=p.min_price,
            created_at=p.created_at,
            updated_at=p.updated_at,
            variants=[],
        )
        items.append(item)

    return ProductListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


def get_product(db: Session, product_id: int) -> Optional[Product]:
    return (
        db.query(Product)
        .options(joinedload(Product.variants))
        .filter(Product.id == product_id)
        .first()
    )


def get_products_count(db: Session) -> int:
    return db.query(Product).count()


def create_product(db: Session, product_in: ProductCreate) -> Product:
    slug = _ensure_unique_slug(db, _slugify(product_in.title))
    product = Product(
        title=product_in.title,
        slug=slug,
        description=product_in.description,
        collection=product_in.collection,
        tags=product_in.tags,
        status=product_in.status,
        is_featured=product_in.is_featured,
        seo_title=product_in.seo_title,
        seo_description=product_in.seo_description,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, product: Product, product_in: ProductUpdate) -> Product:
    update_data = product_in.model_dump(exclude_unset=True)
    if "title" in update_data:
        update_data["slug"] = _ensure_unique_slug(
            db, _slugify(update_data["title"]), exclude_id=product.id
        )
    for field, value in update_data.items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product_id: int) -> bool:
    product = get_product(db, product_id)
    if not product:
        return False
    db.delete(product)
    db.commit()
    return True


# ── Variants ─────────────────────────────────────────────────────────────────

def create_variant(db: Session, product_id: int, variant_in: VariantCreate) -> ProductVariant:
    variant = ProductVariant(
        product_id=product_id,
        size=variant_in.size,
        color=variant_in.color,
        color_hex=variant_in.color_hex,
        sku=variant_in.sku,
        original_price=variant_in.original_price,
        selling_price=variant_in.selling_price,
        discount_percentage=variant_in.discount_percentage,
        stock_quantity=variant_in.stock_quantity,
        low_stock_threshold=variant_in.low_stock_threshold,
    )
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return variant
