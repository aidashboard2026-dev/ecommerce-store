"""
app/services/product.py
Production-hardened product service layer
"""

import math
import re
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models.product import Product, ProductVariant, ProductStatus
from app.schemas.product import (
    ProductCreate,
    ProductListResponse,
    ProductResponse,
    ProductUpdate,
    VariantCreate,
)

# ─────────────────────────────────────────────────────────────
# Pagination protection
# ─────────────────────────────────────────────────────────────

MAX_PER_PAGE = 100

# ─────────────────────────────────────────────────────────────
# Slug helpers
# ─────────────────────────────────────────────────────────────


def _slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    return re.sub(r"-+", "-", slug).strip("-")


def _ensure_unique_slug(
    db: Session,
    base_slug: str,
    exclude_id: Optional[int] = None,
) -> str:
    """
    Ensure slug uniqueness among NON-DELETED products.
    """

    slug = base_slug
    counter = 1

    while True:
        query = db.query(Product).filter(
            Product.slug == slug,
            Product.deleted_at.is_(None),
        )

        if exclude_id:
            query = query.filter(Product.id != exclude_id)

        if not query.first():
            return slug

        slug = f"{base_slug}-{counter}"
        counter += 1


# ─────────────────────────────────────────────────────────────
# SKU generation
# ─────────────────────────────────────────────────────────────


def _sku_prefix(title: str) -> str:
    words = re.findall(r"[a-zA-Z0-9]+", title)

    if len(words) >= 2:
        return "".join(w[0] for w in words[:4]).upper()

    return words[0][:3].upper() if words else "PRD"


def _sku_color_code(color: Optional[str]) -> str:
    COMMON = {
        "black": "BLK",
        "white": "WHT",
        "red": "RED",
        "blue": "BLU",
        "navy": "NVY",
        "navy blue": "NVY",
        "green": "GRN",
        "yellow": "YLW",
        "orange": "ORG",
        "pink": "PNK",
        "purple": "PRP",
        "grey": "GRY",
        "gray": "GRY",
        "brown": "BRN",
        "beige": "BGE",
        "cream": "CRM",
        "maroon": "MRN",
        "olive": "OLV",
        "teal": "TEL",
        "coral": "CRL",
        "lavender": "LVD",
        "mint": "MNT",
        "khaki": "KHK",
        "indigo": "IND",
    }

    if not color:
        return "XXX"

    key = color.lower().strip()

    if key in COMMON:
        return COMMON[key]

    letters = re.sub(r"[^a-zA-Z]", "", color)

    return letters[:3].upper() if letters else "XXX"


def _next_sku_sequence(db: Session, base: str) -> str:
    """
    Find next available SKU sequence.
    """

    pattern = f"{base}-%"

    existing = (
        db.query(ProductVariant.sku)
        .filter(ProductVariant.sku.like(pattern))
        .all()
    )

    used_numbers: set[int] = set()

    for (sku,) in existing:
        parts = sku.rsplit("-", 1)

        if len(parts) == 2 and parts[1].isdigit():
            used_numbers.add(int(parts[1]))

    seq = 1

    while seq in used_numbers:
        seq += 1

    return f"{seq:03d}"


def generate_sku(
    db: Session,
    product_title: str,
    size: str,
    color: Optional[str] = None,
) -> str:
    prefix = _sku_prefix(product_title)
    color_code = _sku_color_code(color)
    size_code = size.upper().replace(" ", "")

    base = f"{prefix}-{color_code}-{size_code}"

    seq = _next_sku_sequence(db, base)

    return f"{base}-{seq}"


# ─────────────────────────────────────────────────────────────
# Variant validation
# ─────────────────────────────────────────────────────────────

_HEX_RE = re.compile(r"^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$")


def _validate_variant_input(variant_in: VariantCreate) -> None:
    """
    Validate prices, stock, and HEX color.
    """

    # Price validation
    if variant_in.original_price <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="original_price must be greater than zero.",
        )

    if variant_in.selling_price <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="selling_price must be greater than zero.",
        )

    if variant_in.selling_price > variant_in.original_price:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"selling_price ({variant_in.selling_price}) "
                f"cannot exceed original_price ({variant_in.original_price})."
            ),
        )

    # Stock validation
    if variant_in.stock_quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="stock_quantity cannot be negative.",
        )

    if variant_in.low_stock_threshold < 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="low_stock_threshold cannot be negative.",
        )

    # HEX validation
    if variant_in.color_hex and not _HEX_RE.match(variant_in.color_hex):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"color_hex '{variant_in.color_hex}' is invalid. "
                "Use #RGB or #RRGGBB format."
            ),
        )


def _check_duplicate_variant(
    db: Session,
    product_id: int,
    variant_in: VariantCreate,
) -> None:
    """
    Prevent duplicate size+color variants.
    """

    exists = (
        db.query(ProductVariant)
        .filter(
            ProductVariant.product_id == product_id,
            ProductVariant.size == variant_in.size,
            ProductVariant.color == variant_in.color,
        )
        .first()
    )

    if exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Variant with size='{variant_in.size}' "
                f"and color='{variant_in.color}' already exists."
            ),
        )


# ─────────────────────────────────────────────────────────────
# Product queries
# ─────────────────────────────────────────────────────────────


def get_product(
    db: Session,
    product_id: int,
) -> Optional[Product]:
    return (
        db.query(Product)
        .options(joinedload(Product.variants))
        .filter(
            Product.id == product_id,
            Product.deleted_at.is_(None),
        )
        .first()
    )


def get_products_count(db: Session) -> int:
    return (
        db.query(Product)
        .filter(Product.deleted_at.is_(None))
        .count()
    )


def get_published_products_count(db: Session) -> int:
    return (
        db.query(Product)
        .filter(
            Product.deleted_at.is_(None),
            Product.status == ProductStatus.published,
        )
        .count()
    )


def get_products_paginated(
    db: Session,
    *,
    search: str = "",
    status_filter: Optional[ProductStatus] = None,
    page: int = 1,
    per_page: int = 15,
) -> ProductListResponse:
    """
    Paginated product listing.
    """

    per_page = min(max(per_page, 1), MAX_PER_PAGE)

    query = (
        db.query(Product)
        .options(joinedload(Product.variants))
        .filter(Product.deleted_at.is_(None))
    )

    if search:
        term = f"%{search}%"

        # Search by title, slug, collection, and variant SKU
        sku_subq = (
            db.query(ProductVariant.product_id)
            .filter(ProductVariant.sku.ilike(term))
            .subquery()
        )

        query = query.filter(
            or_(
                Product.title.ilike(term),
                Product.slug.ilike(term),
                Product.collection.ilike(term),
                Product.id.in_(sku_subq),
            )
        )

    if status_filter:
        query = query.filter(Product.status == status_filter)

    total = query.count()

    total_pages = math.ceil(total / per_page) if total else 1

    products = (
        query.order_by(Product.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    items = []

    for p in products:
        item = ProductResponse(
            id=p.id,
            title=p.title,
            slug=p.slug,
            description=p.description,
            collection=p.collection,
            tags=p.tags or [],
            status=p.status.value if hasattr(p.status, 'value') else p.status,
            is_featured=p.is_featured,
            thumbnail=p.thumbnail,
            images=[],  # MVP: no ProductImage model yet
            seo_title=p.seo_title,
            seo_description=p.seo_description,
            total_stock=p.total_stock,
            min_price=float(p.min_price) if p.min_price is not None else None,
            created_at=p.created_at,
            updated_at=p.updated_at,
            variants=p.variants,
        )

        items.append(item)

    return ProductListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


# ─────────────────────────────────────────────────────────────
# Product CRUD
# ─────────────────────────────────────────────────────────────


def create_product(
    db: Session,
    product_in: ProductCreate,
) -> Product:
    slug = _ensure_unique_slug(
        db,
        _slugify(product_in.title),
    )

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

    try:
        db.commit()

    except Exception:
        db.rollback()
        raise

    db.refresh(product)

    return product


def update_product(
    db: Session,
    product: Product,
    product_in: ProductUpdate,
) -> Product:
    update_data = product_in.model_dump(exclude_unset=True)

    if "title" in update_data:
        update_data["slug"] = _ensure_unique_slug(
            db,
            _slugify(update_data["title"]),
            exclude_id=product.id,
        )

    for field, value in update_data.items():
        setattr(product, field, value)

    try:
        db.commit()

    except Exception:
        db.rollback()
        raise

    db.refresh(product)

    return product


def delete_product(
    db: Session,
    product_id: int,
) -> bool:
    """
    Soft delete product.
    """

    product = get_product(db, product_id)

    if not product:
        return False

    from sqlalchemy.sql import func as sqlfunc

    product.deleted_at = sqlfunc.now()

    try:
        db.commit()

    except Exception:
        db.rollback()
        raise

    return True


# ─────────────────────────────────────────────────────────────
# Variant operations
# ─────────────────────────────────────────────────────────────


def create_variant(
    db: Session,
    product_id: int,
    variant_in: VariantCreate,
) -> ProductVariant:
    """
    Create product variant safely.
    """

    # Product existence
    product = get_product(db, product_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {product_id} not found.",
        )

    # Validation
    _validate_variant_input(variant_in)

    # Duplicate prevention
    _check_duplicate_variant(db, product_id, variant_in)

    # SKU generation
    sku = variant_in.sku

    if not sku or not sku.strip():
        sku = generate_sku(
            db,
            product.title,
            variant_in.size,
            variant_in.color,
        )

    variant = ProductVariant(
        product_id=product_id,
        size=variant_in.size,
        color=variant_in.color,
        color_hex=variant_in.color_hex,
        sku=sku,
        original_price=variant_in.original_price,
        selling_price=variant_in.selling_price,
        discount_percentage=variant_in.discount_percentage,
        stock_quantity=variant_in.stock_quantity,
        low_stock_threshold=variant_in.low_stock_threshold,
    )

    db.add(variant)

    try:
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"SKU '{sku}' already exists. "
                "Concurrent request detected. Please retry."
            ),
        )

    except Exception:
        db.rollback()
        raise

    db.refresh(variant)

    return variant
