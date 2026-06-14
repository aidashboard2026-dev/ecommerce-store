"""
app/services/product.py
Production-hardened product service layer
"""

import math
import re
import uuid
from typing import Optional, List

from fastapi import HTTPException, status
from sqlalchemy import or_, func as sqla_func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

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


_SLUG_MAX_COUNTER = 99  # cap sequential attempts before falling back to UUID suffix


def _ensure_unique_slug(
    db: Session,
    base_slug: str,
    exclude_id: Optional[int] = None,
) -> str:
    """
    Ensure slug uniqueness among NON-DELETED products.

    Safety improvements over the original unbounded while-True loop:

    1. LOOP CAP: Tries base_slug, base_slug-1 … base_slug-99, then falls back
       to a 6-char hex UUID suffix (base_slug-a3f9c1). This bounds the maximum
       DB queries to 101 per call regardless of catalog size.

    2. TOCTOU MITIGATION: The SELECT→INSERT race is inherent to optimistic slug
       generation. The real guard is the UNIQUE constraint on products.slug —
       create_product() catches IntegrityError from that constraint and returns
       a clean 409, not a raw 500 traceback.

    3. EXCLUDE SOFT-DELETED: Slugs of soft-deleted products are reusable, so
       the filter includes deleted_at IS NULL. The partial unique index in
       migration 002 enforces this at the DB level.
    """
    def _slug_is_free(candidate: str) -> bool:
        q = db.query(Product.id).filter(
            Product.slug == candidate,
            Product.deleted_at.is_(None),
        )
        if exclude_id:
            q = q.filter(Product.id != exclude_id)
        return q.first() is None

    if _slug_is_free(base_slug):
        return base_slug

    for counter in range(1, _SLUG_MAX_COUNTER + 1):
        candidate = f"{base_slug}-{counter}"
        if _slug_is_free(candidate):
            return candidate

    # All sequential candidates taken — use a random hex suffix.
    # Collision probability: 1 in 16^6 = 1 in ~16M per call.
    rand_slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"
    return rand_slug


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


def generate_sku(
    product_title: str,
    size: str,
    color: Optional[str] = None,
) -> str:
    """
    FIX B-09: Generate a collision-resistant SKU using a random 6-char hex suffix
    instead of a SELECT→INSERT sequential counter.

    The old _next_sku_sequence() approach had a TOCTOU race: two concurrent
    variant creates for the same prefix both read the same "next" number, then
    race to INSERT. One would succeed; the other hit an IntegrityError with a
    confusing "concurrent request" message.

    The random suffix gives ~16M unique values per prefix (16^6). At ecommerce
    scale this is effectively collision-free, and any residual collision is caught
    cleanly by the DB UniqueConstraint on `sku`, returning a clear 409 error.
    """
    prefix     = _sku_prefix(product_title)
    color_code = _sku_color_code(color)
    size_code  = size.upper().replace(" ", "")
    rand_suffix = uuid.uuid4().hex[:6].upper()
    return f"{prefix}-{color_code}-{size_code}-{rand_suffix}"


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

    NULL-safe color comparison: SQLAlchemy's == None generates "color = NULL"
    which is always FALSE in SQL. We must use IS NULL explicitly so that two
    colorless variants (color=None) are correctly detected as duplicates.
    The DB UniqueConstraint alone cannot catch this because PostgreSQL treats
    NULLs as distinct in unique indexes.
    """
    color_filter = (
        ProductVariant.color.is_(None)
        if variant_in.color is None
        else ProductVariant.color == variant_in.color
    )

    exists = (
        db.query(ProductVariant)
        .filter(
            ProductVariant.product_id == product_id,
            ProductVariant.size == variant_in.size,
            color_filter,
        )
        .first()
    )

    if exists:
        color_label = variant_in.color or "no color"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Variant with size='{variant_in.size}' "
                f"and color='{color_label}' already exists."
            ),
        )


# ─────────────────────────────────────────────────────────────
# Product queries
# ─────────────────────────────────────────────────────────────


def get_product(
    db: Session,
    product_id: int,
) -> Optional[Product]:
    # selectinload fires a single separate SELECT for variants (IN clause)
    # instead of joinedload's LEFT OUTER JOIN, preventing duplicate product
    # rows when multiple variants exist and making count() queries safe.
    return (
        db.query(Product)
        .options(selectinload(Product.variants))
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
    Paginated product listing — production-hardened.

    Key differences from the naive version:
    - COUNT runs on a clean scalar subquery (no joinedload pollution)
    - Data query uses selectinload (two queries: products + variants IN (...))
      instead of joinedload (one query with LEFT JOIN that multiplies rows)
    - total_stock and min_price computed in SQL via GROUP BY subqueries,
      not in Python after loading all variant ORM objects into memory
    - OFFSET pagination is preserved for MVP; migrate to keyset pagination
      once the catalog exceeds ~5,000 products (OFFSET N scans N rows)
    """

    per_page = min(max(per_page, 1), MAX_PER_PAGE)

    # ── Build the base filter predicate (reused for count + data) ────────────
    base_filters = [Product.deleted_at.is_(None)]

    if search:
        term = f"%{search}%"
        # Subquery for SKU search — uses trigram index from migration 002
        sku_subq = (
            db.query(ProductVariant.product_id)
            .filter(ProductVariant.sku.ilike(term))
            .subquery()
        )
        base_filters.append(
            or_(
                Product.title.ilike(term),
                Product.slug.ilike(term),
                Product.collection.ilike(term),
                Product.id.in_(sku_subq),
            )
        )

    if status_filter:
        base_filters.append(Product.status == status_filter)

    # ── COUNT: separate clean query with no options() / joins ────────────────
    # joinedload on a count() causes SQLAlchemy to wrap in a subquery which
    # can return inflated counts when variants produce multiple rows per product.
    total = (
        db.query(sqla_func.count(Product.id))
        .filter(*base_filters)
        .scalar()
    ) or 0

    total_pages = math.ceil(total / per_page) if total else 1

    # ── DATA: paginated product rows ─────────────────────────────────────────
    # selectinload fires one extra SELECT ... WHERE product_id IN (...) for
    # the page's variants — no JOIN, no duplicate product rows, safe count().
    products = (
        db.query(Product)
        .options(selectinload(Product.variants))
        .filter(*base_filters)
        .order_by(Product.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    # ── SQL aggregates for total_stock and min_price ──────────────────────────
    # Computing these in Python requires all variant ORM objects to be loaded.
    # At 15 products × 8 variants = 120 objects per page load — fine for MVP
    # but O(n×variants) at scale. Here we compute both in a single SQL query
    # using GROUP BY, then join back to the product list by product_id.
    # This reduces the variant data needed to two integers per product.
    product_ids = [p.id for p in products]
    agg_rows = (
        db.query(
            ProductVariant.product_id,
            sqla_func.coalesce(sqla_func.sum(ProductVariant.stock_quantity), 0).label("total_stock"),
            sqla_func.min(ProductVariant.selling_price).label("min_price"),
        )
        .filter(ProductVariant.product_id.in_(product_ids))
        .group_by(ProductVariant.product_id)
        .all()
    ) if product_ids else []

    agg_by_id = {row.product_id: row for row in agg_rows}

    # ── Build response ────────────────────────────────────────────────────────
    items = []
    for p in products:
        agg = agg_by_id.get(p.id)
        item = ProductResponse(
            id=p.id,
            title=p.title,
            slug=p.slug,
            description=p.description,
            collection=p.collection,
            tags=p.tags or [],
            status=p.status.value if hasattr(p.status, "value") else p.status,
            is_featured=p.is_featured,
            thumbnail=p.thumbnail,
            images=[],  # MVP: no ProductImage model yet
            seo_title=p.seo_title,
            seo_description=p.seo_description,
            total_stock=int(agg.total_stock) if agg else 0,
            min_price=agg.min_price if agg and agg.min_price is not None else None,
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

    except IntegrityError as e:
        db.rollback()
        # Most likely cause: slug uniqueness TOCTOU — two concurrent creates
        # both passed _ensure_unique_slug, then raced to INSERT.
        # Return a clean 409 instead of a raw 500 traceback.
        err_str = str(e.orig).lower() if e.orig else ""
        if "slug" in err_str or "unique" in err_str:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "A product with a similar title already exists. "
                    "Please use a more specific title or try again."
                ),
            )
        raise

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
    Soft-delete a product and physically delete its variants.

    WHY physically delete variants:
    Variants have no independent lifecycle — they only exist as part of a product.
    A soft-delete sets `products.deleted_at` but leaves variant rows (and their SKUs)
    in `product_variants`. Because `sku` has a global UNIQUE constraint, those orphaned
    SKUs permanently block reuse on any future product, even though the owning product
    is logically gone. Physically deleting variants on product soft-delete:
      - Frees every SKU held by the deleted product immediately.
      - Keeps the SKU namespace clean without requiring a separate cleanup job.
      - Is safe: the CASCADE FK would delete them anyway on a hard-delete, and no
        other table references product_variants.id directly.
    """

    product = get_product(db, product_id)

    if not product:
        return False

    # Step 1 — physically delete variants to release their global-unique SKUs.
    db.query(ProductVariant).filter(
        ProductVariant.product_id == product_id
    ).delete(synchronize_session="fetch")

    # Step 2 — soft-delete the product itself.
    from sqlalchemy.sql import func as sqlfunc
    product.deleted_at = sqlfunc.now()

    try:
        db.commit()

    except Exception:
        db.rollback()
        raise

    return True


def delete_variant(
    db: Session,
    product_id: int,
    variant_id: int,
) -> bool:
    """
    Permanently delete a single variant.

    Verified against product_id to prevent cross-product deletions
    (an admin with a valid product token cannot delete a variant from
    a different product by guessing a variant_id).
    """
    variant = (
        db.query(ProductVariant)
        .filter(
            ProductVariant.id == variant_id,
            ProductVariant.product_id == product_id,
        )
        .first()
    )

    if not variant:
        return False

    db.delete(variant)

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


def bulk_create_variants(
    db: Session,
    product_id: int,
    variants_in: List[VariantCreate],
) -> dict:
    """
    Create multiple variants in a single transaction.
    Returns structured results with created variants and per-item failures.
    """

    product = get_product(db, product_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {product_id} not found.",
        )

    created = []
    failed = []

    for idx, variant_in in enumerate(variants_in):
        variant = None
        try:
            # Validate inputs — raises HTTPException before any DB write
            _validate_variant_input(variant_in)
            _check_duplicate_variant(db, product_id, variant_in)

            # SKU
            sku = variant_in.sku
            if not sku or not sku.strip():
                sku = generate_sku(product.title, variant_in.size, variant_in.color)

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

            # Savepoint: flush this variant in isolation.
            # An IntegrityError here rolls back only this savepoint, leaving
            # all previously-flushed variants intact in the outer transaction.
            sp = db.begin_nested()
            try:
                db.flush()
                sp.commit()
            except IntegrityError:
                sp.rollback()
                # Remove the pending object from the session to keep it clean
                try:
                    db.expunge(variant)
                except Exception:
                    pass
                failed.append({
                    "index": idx,
                    "size": variant_in.size,
                    "color": variant_in.color,
                    "error": "SKU conflict or duplicate variant.",
                })
                continue

            created.append(variant)

        except HTTPException as e:
            # Validation failed before any DB write — no savepoint needed
            failed.append({
                "index": idx,
                "size": variant_in.size,
                "color": variant_in.color,
                "error": e.detail,
            })

    # Commit all successful variants
    if created:
        try:
            db.commit()
            for v in created:
                db.refresh(v)
        except Exception:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to commit variants. Please retry.",
            )

    return {
        "created": created,
        "failed": failed,
        "total_requested": len(variants_in),
        "total_created": len(created),
        "total_failed": len(failed),
    }


def get_products_public(
    db: Session,
    *,
    search: str = "",
    collection: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: str = "newest",
    page: int = 1,
    per_page: int = 15,
) -> ProductListResponse:
    per_page = min(max(per_page, 1), MAX_PER_PAGE)
    base_filters = [
        Product.deleted_at.is_(None),
        Product.status == ProductStatus.published,
    ]

    if search:
        term = f"%{search}%"
        sku_subq = (
            db.query(ProductVariant.product_id)
            .filter(ProductVariant.sku.ilike(term))
            .subquery()
        )
        base_filters.append(
            or_(
                Product.title.ilike(term),
                Product.description.ilike(term),
                Product.collection.ilike(term),
                Product.id.in_(sku_subq),
            )
        )

    if collection:
        base_filters.append(Product.collection == collection)

    subq = (
        db.query(
            ProductVariant.product_id,
            sqla_func.coalesce(sqla_func.sum(ProductVariant.stock_quantity), 0).label("total_stock"),
            sqla_func.min(ProductVariant.selling_price).label("min_price"),
        )
        .group_by(ProductVariant.product_id)
        .subquery()
    )

    query = db.query(Product).outerjoin(subq, Product.id == subq.c.product_id)

    if min_price is not None:
        query = query.filter(subq.c.min_price >= min_price)
    if max_price is not None:
        query = query.filter(subq.c.min_price <= max_price)

    for f in base_filters:
        query = query.filter(f)

    total = query.count()
    total_pages = math.ceil(total / per_page) if total else 1

    if sort_by == "price_asc":
        query = query.order_by(subq.c.min_price.asc(), Product.id.desc())
    elif sort_by == "price_desc":
        query = query.order_by(subq.c.min_price.desc(), Product.id.desc())
    else:
        query = query.order_by(Product.created_at.desc(), Product.id.desc())

    products = (
        query.options(selectinload(Product.variants))
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    items = []
    for p in products:
        variants = p.variants
        total_stock = sum(v.stock_quantity for v in variants)
        prices = [v.selling_price for v in variants if v.selling_price is not None]
        min_p = min(prices) if prices else None

        item = ProductResponse(
            id=p.id,
            title=p.title,
            slug=p.slug,
            description=p.description,
            collection=p.collection,
            tags=p.tags or [],
            status=p.status.value if hasattr(p.status, "value") else p.status,
            is_featured=p.is_featured,
            thumbnail=p.thumbnail,
            images=[],
            seo_title=p.seo_title,
            seo_description=p.seo_description,
            total_stock=total_stock,
            min_price=min_p,
            created_at=p.created_at,
            updated_at=p.updated_at,
            variants=variants,
        )
        items.append(item)

    return ProductListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


def get_product_by_slug(db: Session, slug: str) -> Optional[Product]:
    return (
        db.query(Product)
        .options(selectinload(Product.variants))
        .filter(
            Product.slug == slug,
            Product.deleted_at.is_(None),
            Product.status == ProductStatus.published,
        )
        .first()
    )