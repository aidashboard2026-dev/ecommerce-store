import logging
import math
import re
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import HTTPException, status
from app.shared.normalization import (
    normalize_name,
    generate_slug,
    get_search_terms,
    ValidationError as NormalizationValidationError,
    ReservedWordError as NormalizationReservedWordError,
    AliasConflictError as NormalizationAliasConflictError,
)
from app.shared.exceptions import (
    NotFoundError, ConflictError, BusinessRuleError,
    ValidationError as DomainValidationError,
)
from sqlalchemy import and_, or_, select, func as sqla_func, cast, Text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.modules.products.models import (
    Category, Collection, Product, ProductVariant, ProductStatus, ProductGender
)
from app.modules.products.schemas import (
    BulkActionPayload,
    CategoryCreate, CategoryUpdate,
    CollectionCreate, CollectionUpdate,
    ProductCreate, ProductListResponse, ProductResponse, ProductUpdate,
    VariantCreate, CategoryResponse, CollectionResponse,
)
from app.core.constants import (
    MAX_CATEGORIES,
    MAX_COLLECTIONS,
    MAX_PRODUCT_IMAGES,
    MAX_PRODUCT_VARIANTS,
    MAX_PRODUCTS,
)

MAX_PER_PAGE = 100

logger = logging.getLogger(__name__)


def _check_duplicate_catalog_item(
    query: Session.query,
    name_to_check: str,
    name_attr: str = "name",
    id_attr: str = "id",
    exclude_id: Optional[int] = None,
    item_type: str = "Category"
) -> None:
    """
    Validates duplicates using the centralized normalization engine.
    """
    entity = normalize_name(name_to_check)
    norm_new = entity.canonical_name
    if not norm_new:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{item_type} name cannot be empty or whitespace only."
        )
        
    if exclude_id is not None:
        model_class = query.column_descriptions[0]['expr']
        query = query.filter(getattr(model_class, id_attr) != exclude_id)
        
    for item in query.all():
        item_name = getattr(item, name_attr)
        if normalize_name(item_name).canonical_name.lower() == norm_new.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{item_type} already exists."
            )





# ─────────────────────────────────────────────────────────────
# Slug helpers (legacy _slugify removed; generate_slug used directly)
# ─────────────────────────────────────────────────────────────


def _unique_slug(db: Session, model, base_slug: str, exclude_id: Optional[int] = None) -> str:
    """Generic unique-slug finder for any SQLAlchemy model with a `slug` column."""
    def free(candidate: str) -> bool:
        q = db.query(model.id).filter(model.slug == candidate)
        if exclude_id:
            q = q.filter(model.id != exclude_id)
        return q.first() is None

    if free(base_slug):
        return base_slug
    for i in range(1, 100):
        c = f"{base_slug}-{i}"
        if free(c):
            return c
    return f"{base_slug}-{uuid.uuid4().hex[:6]}"


def _ensure_unique_slug(db: Session, base_slug: str, exclude_id: Optional[int] = None) -> str:
    """Unique slug for products — excludes soft-deleted rows."""
    def free(candidate: str) -> bool:
        q = db.query(Product.id).filter(
            Product.slug == candidate,
            Product.deleted_at.is_(None),
        )
        if exclude_id:
            q = q.filter(Product.id != exclude_id)
        return q.first() is None

    if free(base_slug):
        return base_slug
    for i in range(1, 100):
        c = f"{base_slug}-{i}"
        if free(c):
            return c
    return f"{base_slug}-{uuid.uuid4().hex[:6]}"


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
        "black": "BLK", "white": "WHT", "red": "RED", "blue": "BLU",
        "navy": "NVY", "navy blue": "NVY", "green": "GRN", "yellow": "YLW",
        "orange": "ORG", "pink": "PNK", "purple": "PRP", "grey": "GRY",
        "gray": "GRY", "brown": "BRN", "beige": "BGE", "cream": "CRM",
        "maroon": "MRN", "olive": "OLV", "teal": "TEL", "coral": "CRL",
        "lavender": "LVD", "mint": "MNT", "khaki": "KHK", "indigo": "IND",
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
    product_id: Optional[int] = None,
    product_slug: Optional[str] = None,
    attempt: int = 0
) -> str:
    # 1. Determine prefix/base
    if product_slug:
        base = product_slug.upper().replace("_", "-")
    elif product_id:
        base = f"P{product_id}"
    else:
        base = _sku_prefix(product_title)

    # 2. Size code
    size_code = size.upper().strip().replace(" ", "")

    # 3. Color code
    color_code = _sku_color_code(color)

    # 4. Suffix (first attempt: sequence/deterministic, subsequent: random)
    if attempt == 0:
        suffix = "001"
    else:
        # Use a random 4-character hex suffix to keep total SKU length short
        suffix = uuid.uuid4().hex[:4].upper()

    # Combine
    sku = f"{base}-{size_code}-{color_code}-{suffix}"

    # Ensure total length never exceeds 20 characters
    if len(sku) > 20:
        # Shorten base to fit within 20 chars
        # Total allowed length for base: 20 - (len(size_code) + len(color_code) + len(suffix) + 3 hyphens)
        allowed_base_len = 20 - len(size_code) - len(color_code) - len(suffix) - 3
        if allowed_base_len > 0:
            short_base = base[:allowed_base_len]
            sku = f"{short_base}-{size_code}-{color_code}-{suffix}"
        else:
            sku = sku[:20]

    return sku


# ─────────────────────────────────────────────────────────────
# Variant validation
# ─────────────────────────────────────────────────────────────

_HEX_RE = re.compile(r"^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$")


def _validate_variant_input(variant_in: VariantCreate) -> None:
    if variant_in.original_price <= 0:
        raise DomainValidationError("original_price must be greater than zero.", field="original_price")
    if variant_in.selling_price <= 0:
        raise DomainValidationError("selling_price must be greater than zero.", field="selling_price")
    if variant_in.selling_price > variant_in.original_price:
        raise DomainValidationError(
            f"selling_price ({variant_in.selling_price}) cannot exceed original_price ({variant_in.original_price}).",
            field="selling_price",
        )
    if variant_in.stock_quantity < 0:
        raise DomainValidationError("stock_quantity cannot be negative.", field="stock_quantity")
    if variant_in.color_hex and not _HEX_RE.match(variant_in.color_hex):
        raise DomainValidationError(
            f"color_hex must be a valid CSS hex colour (e.g. #FF0000). Got: {variant_in.color_hex}",
            field="color_hex",
        )


# ─────────────────────────────────────────────────────────────
# Response builder helper
# ─────────────────────────────────────────────────────────────

def _build_product_response(
    p: Product,
    agg=None,
    category_map: dict = None,
    collection_map: dict = None,
) -> ProductResponse:
    category_map   = category_map or {}
    collection_map = collection_map or {}
    return ProductResponse(
        id=p.id,
        title=p.title,
        slug=p.slug,
        description=p.description,
        short_description=p.short_description,
        category_id=p.category_id,
        collection_id=p.collection_id,
        genders=[g.gender for g in p.genders_rel],
        material=p.material,
        tags=p.tags or [],
        status=p.status.value if hasattr(p.status, "value") else p.status,
        is_featured=p.is_featured,
        is_trending=p.is_trending,
        is_best_seller=p.is_best_seller,
        is_new_arrival=p.is_new_arrival,
        thumbnail=p.thumbnail,
        image_front=p.image_front,
        image_back=p.image_back,
        image_size_chart=p.image_size_chart,
        gallery_images=p.gallery_images or [],
        images=[],
        seo_title=p.seo_title,
        seo_description=p.seo_description,
        total_stock=int(agg.total_stock) if agg else 0,
        min_price=agg.min_price if agg and agg.min_price is not None else None,
        view_count=p.view_count or 0,
        orders_count=p.orders_count or 0,
        sales_count=p.sales_count or 0,
        category_name=category_map.get(p.category_id),
        collection_name=collection_map.get(p.collection_id),
        created_at=p.created_at,
        updated_at=p.updated_at,
        variants=p.variants,
    )


# ─────────────────────────────────────────────────────────────
# CATEGORY CRUD
# ─────────────────────────────────────────────────────────────

def get_categories(db: Session, status_filter: Optional[str] = None) -> List[CategoryResponse]:
    q = db.query(Category)
    if status_filter:
        q = q.filter(Category.status == status_filter)
    rows = q.order_by(Category.sort_order, Category.name).all()
    return [CategoryResponse.model_validate(r) for r in rows]


def get_category(db: Session, category_id: int) -> Category:
    cat = db.get(Category, category_id)
    if not cat:
        raise NotFoundError(f"Category {category_id} not found.", code="CATEGORY_NOT_FOUND")
    return cat


def check_duplicate_category(db: Session, name: str, exclude_id: int = None):
    _check_duplicate_catalog_item(
        query=db.query(Category),
        name_to_check=name,
        name_attr="name",
        id_attr="id",
        exclude_id=exclude_id,
        item_type="Category"
    )


def create_category(db: Session, data: CategoryCreate) -> CategoryResponse:
    existing_count = db.query(sqla_func.count(Category.id)).scalar() or 0
    if existing_count >= MAX_CATEGORIES:
        logger.warning("Attempted to create category beyond limit")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your current store configuration has reached the maximum allowed limit. Please contact the system administrator if you need additional categories or collections."
        )

    try:
        entity = normalize_name(data.name)
    except (NormalizationValidationError, NormalizationReservedWordError, NormalizationAliasConflictError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    check_duplicate_category(db, entity.canonical_name)

    slug = _unique_slug(db, Category, entity.slug)
    cat = Category(
        name=entity.canonical_name,
        slug=slug,
        description=data.description,
        status=data.status,
        sort_order=data.sort_order,
    )
    db.add(cat)
    try:
        db.commit()
        db.refresh(cat)
    except Exception as e:
        db.rollback()
        raise e
    logger.info("Product category created: id=%s name=%s", cat.id, cat.name)
    return CategoryResponse.model_validate(cat)


def update_category(db: Session, category_id: int, data: CategoryUpdate) -> CategoryResponse:
    cat = get_category(db, category_id)
    patch = data.model_dump(exclude_unset=True)

    if "name" in patch:
        try:
            entity = normalize_name(patch["name"])
        except (NormalizationValidationError, NormalizationReservedWordError, NormalizationAliasConflictError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        check_duplicate_category(db, entity.canonical_name, exclude_id=category_id)
        patch["name"] = entity.canonical_name
        patch["slug"] = _unique_slug(db, Category, entity.slug, exclude_id=category_id)

    for k, v in patch.items():
        setattr(cat, k, v)
    try:
        db.commit()
        db.refresh(cat)
    except Exception as e:
        db.rollback()
        raise e
    return CategoryResponse.model_validate(cat)


def delete_category(db: Session, category_id: int) -> None:
    cat = get_category(db, category_id)
    # Check if category is assigned to products
    assigned_products = db.query(Product).filter(Product.category_id == category_id, Product.deleted_at.is_(None)).first()
    if assigned_products:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This category is currently assigned to products. Remove or reassign those products before deleting the category."
        )
    db.delete(cat)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise e


# ─────────────────────────────────────────────────────────────
# COLLECTION CRUD
# ─────────────────────────────────────────────────────────────

import json

def _parse_collection_description(description: Optional[str]) -> Optional[str]:
    if not description:
        return None
    try:
        data = json.loads(description)
        if isinstance(data, dict):
            return data.get("description")
    except Exception:
        pass
    return description


def get_collections(
    db: Session,
    category_id: Optional[int] = None,
    status_filter: Optional[str] = None,
) -> List[CollectionResponse]:
    q = db.query(Collection)
    if category_id:
        q = q.filter(Collection.category_id == category_id)
    if status_filter:
        q = q.filter(Collection.status == status_filter)
    rows = q.order_by(Collection.name).all()

    cat_ids = {r.category_id for r in rows if r.category_id}
    cat_map: dict = {}
    if cat_ids:
        cats = db.query(Category.id, Category.name).filter(Category.id.in_(cat_ids)).all()
        cat_map = {c.id: c.name for c in cats}

    return [
        CollectionResponse(
            id=r.id,
            name=r.name,
            slug=r.slug,
            description=_parse_collection_description(r.description),
            status=r.status,
            category_id=r.category_id,
            category_name=cat_map.get(r.category_id),
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rows
    ]


def get_collection(db: Session, collection_id: int) -> Collection:
    col = db.get(Collection, collection_id)
    if not col:
        raise NotFoundError(f"Collection {collection_id} not found.", code="COLLECTION_NOT_FOUND")
    return col


def check_duplicate_collection(db: Session, name: str, exclude_id: int = None):
    _check_duplicate_catalog_item(
        query=db.query(Collection),
        name_to_check=name,
        name_attr="name",
        id_attr="id",
        exclude_id=exclude_id,
        item_type="Collection"
    )


def create_collection(db: Session, data: CollectionCreate) -> CollectionResponse:
    existing_count = db.query(sqla_func.count(Collection.id)).scalar() or 0
    if existing_count >= MAX_COLLECTIONS:
        logger.warning("Attempted to create collection beyond limit")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your current store configuration has reached the maximum allowed limit. Please contact the system administrator if you need additional categories or collections."
        )

    try:
        entity = normalize_name(data.name)
    except (NormalizationValidationError, NormalizationReservedWordError, NormalizationAliasConflictError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    check_duplicate_collection(db, entity.canonical_name)

    if data.category_id:
        get_category(db, data.category_id)
    slug = _unique_slug(db, Collection, entity.slug)
    col = Collection(
        name=entity.canonical_name,
        slug=slug,
        description=data.description,
        status=data.status,
        category_id=data.category_id,
    )
    db.add(col)
    try:
        db.commit()
        db.refresh(col)
    except Exception as e:
        db.rollback()
        raise e

    cat_name = None
    if col.category_id:
        cat = db.get(Category, col.category_id)
        cat_name = cat.name if cat else None

    return CollectionResponse(
        id=col.id, name=col.name, slug=col.slug,
        description=_parse_collection_description(col.description),
        status=col.status, category_id=col.category_id,
        category_name=cat_name, created_at=col.created_at, updated_at=col.updated_at,
    )


def update_collection(db: Session, collection_id: int, data: CollectionUpdate) -> CollectionResponse:
    col = get_collection(db, collection_id)
    patch = data.model_dump(exclude_unset=True)

    if "category_id" in patch and patch["category_id"]:
        get_category(db, patch["category_id"])
    if "name" in patch:
        try:
            entity = normalize_name(patch["name"])
        except (NormalizationValidationError, NormalizationReservedWordError, NormalizationAliasConflictError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        check_duplicate_collection(db, entity.canonical_name, exclude_id=collection_id)
        patch["name"] = entity.canonical_name
        patch["slug"] = _unique_slug(db, Collection, entity.slug, exclude_id=collection_id)

    for k, v in patch.items():
        setattr(col, k, v)
    try:
        db.commit()
        db.refresh(col)
    except Exception as e:
        db.rollback()
        raise e

    cat_name = None
    if col.category_id:
        cat = db.get(Category, col.category_id)
        cat_name = cat.name if cat else None

    return CollectionResponse(
        id=col.id, name=col.name, slug=col.slug,
        description=_parse_collection_description(col.description),
        status=col.status, category_id=col.category_id,
        category_name=cat_name, created_at=col.created_at, updated_at=col.updated_at,
    )


def delete_collection(db: Session, collection_id: int) -> None:
    col = get_collection(db, collection_id)
    # Check if collection is assigned to products
    assigned_products = db.query(Product).filter(Product.collection_id == collection_id, Product.deleted_at.is_(None)).first()
    if assigned_products:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This collection is currently assigned to products. Remove or reassign those products before deleting the collection."
        )
    db.delete(col)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise e


# ─────────────────────────────────────────────────────────────
# PRODUCT QUERIES
# ─────────────────────────────────────────────────────────────

def get_products_count(db: Session) -> int:
    """Total product count (all non-deleted, any status)."""
    return db.query(sqla_func.count(Product.id)).filter(Product.deleted_at.is_(None)).scalar() or 0


def get_published_products_count(db: Session) -> int:
    """Published product count only."""
    return (
        db.query(sqla_func.count(Product.id))
        .filter(Product.deleted_at.is_(None), Product.status == ProductStatus.published)
        .scalar()
    ) or 0


# ─────────────────────────────────────────────────────────────
# Stock helpers
# ─────────────────────────────────────────────────────────────

def _stock_having_clause(stock_status: str, threshold_col):
    """
    Return a HAVING expression for the given stock_status string.
    threshold_col is the aggregated low_stock_threshold expression.
    """
    if stock_status == "out_of_stock":
        return sqla_func.min(ProductVariant.stock_quantity) == 0
    if stock_status == "low_stock":
        return sqla_func.min(ProductVariant.stock_quantity - ProductVariant.low_stock_threshold) <= 0
    if stock_status == "in_stock":
        return sqla_func.min(ProductVariant.stock_quantity - ProductVariant.low_stock_threshold) > 0
    return None


def _build_agg_subquery(db: Session, product_ids: list, stock_status: Optional[str] = None):
    """
    Return aggregation rows for the given product IDs, optionally filtered
    by stock_status via HAVING — not post-query Python filtering.
    """
    if not product_ids:
        return []

    threshold_col = sqla_func.coalesce(
        sqla_func.min(ProductVariant.low_stock_threshold), 5
    )
    q = (
        db.query(
            ProductVariant.product_id,
            sqla_func.coalesce(sqla_func.sum(ProductVariant.stock_quantity), 0).label("total_stock"),
            sqla_func.min(ProductVariant.selling_price).label("min_price"),
        )
        .filter(ProductVariant.product_id.in_(product_ids))
        .group_by(ProductVariant.product_id)
    )
    if stock_status:
        clause = _stock_having_clause(stock_status, threshold_col)
        if clause is not None:
            q = q.having(clause)
    return q.all()


# ─────────────────────────────────────────────────────────────
# Admin filter builder  (the core of the filtering system)
# ─────────────────────────────────────────────────────────────

_VALID_STOCK_STATUSES = frozenset({"in_stock", "low_stock", "out_of_stock"})
_VALID_SORT_OPTIONS = frozenset({
    "newest", "oldest", "price_asc", "price_desc", "alpha_asc", "updated",
})


def _build_admin_filters(
    db: Session,
    *,
    search: str = "",
    status_filter: Optional[ProductStatus] = None,
    category_id: Optional[int] = None,
    collection_id: Optional[int] = None,
    genders: Optional[List[str]] = None,
    is_featured: Optional[bool] = None,
    is_trending: Optional[bool] = None,
    is_best_seller: Optional[bool] = None,
    is_new_arrival: Optional[bool] = None,
    stock_status: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    created_after: Optional[datetime] = None,
    created_before: Optional[datetime] = None,
    updated_after: Optional[datetime] = None,
    updated_before: Optional[datetime] = None,
) -> list:
    """
    Build a flat list of SQLAlchemy filter expressions for admin product queries.

    Design principles:
    - Every condition is appended independently — no elif chains.
    - All conditions combine with AND (SQLAlchemy default for .filter(*list)).
    - Search matches product-level fields only; catalog-level matching is intentionally
      excluded so that a category/collection filter is not semantically polluted by
      search matching the category/collection *name* in a separate OR branch.
    - Stock-status uses a HAVING subquery so COUNT and LIMIT both see the correct universe.
    - Adding a new filter is a single append — no restructuring needed.
    """
    conditions: list = [Product.deleted_at.is_(None)]

    # ── Catalog classification ───────────────────────────────────────────────
    if category_id:
        conditions.append(Product.category_id == category_id)

    if collection_id:
        conditions.append(Product.collection_id == collection_id)

    if genders:
        # Semi-join: products that have at least one matching gender row.
        gender_subq = (
            db.query(ProductGender.product_id)
            .filter(ProductGender.gender.in_(genders))
            .subquery()
        )
        conditions.append(Product.id.in_(select(gender_subq.c.product_id)))

    # ── Publishing / status ─────────────────────────────────────────────────
    if status_filter:
        conditions.append(Product.status == status_filter)

    # ── Merchandising flags ─────────────────────────────────────────────────
    if is_featured is not None:
        conditions.append(Product.is_featured == is_featured)
    if is_trending is not None:
        conditions.append(Product.is_trending == is_trending)
    if is_best_seller is not None:
        conditions.append(Product.is_best_seller == is_best_seller)
    if is_new_arrival is not None:
        conditions.append(Product.is_new_arrival == is_new_arrival)

    # ── Price range (via variant aggregation subquery) ───────────────────────
    # We use a correlated EXISTS instead of a join so we never get duplicate rows.
    if min_price is not None or max_price is not None:
        price_conds = [ProductVariant.product_id == Product.id]
        if min_price is not None:
            price_conds.append(ProductVariant.selling_price >= min_price)
        if max_price is not None:
            price_conds.append(ProductVariant.selling_price <= max_price)
        conditions.append(
            db.query(ProductVariant)
            .filter(*price_conds)
            .exists()
        )

    # ── Stock status ─────────────────────────────────────────────────────────
    if stock_status and stock_status in _VALID_STOCK_STATUSES:
        if stock_status == "out_of_stock":
            conditions.append(
                or_(
                    ~Product.variants.any(),
                    Product.variants.any(ProductVariant.stock_quantity == 0)
                )
            )
        elif stock_status == "low_stock":
            conditions.append(
                or_(
                    ~Product.variants.any(),
                    Product.variants.any(ProductVariant.stock_quantity <= ProductVariant.low_stock_threshold)
                )
            )
        elif stock_status == "in_stock":
            conditions.append(
                Product.variants.any(
                    ProductVariant.stock_quantity > 0
                )
            )

    # ── Date range filters ───────────────────────────────────────────────────
    if created_after is not None:
        conditions.append(Product.created_at >= created_after)
    if created_before is not None:
        conditions.append(Product.created_at <= created_before)
    if updated_after is not None:
        conditions.append(Product.updated_at >= updated_after)
    if updated_before is not None:
        conditions.append(Product.updated_at <= updated_before)

    # ── Full-text search ─────────────────────────────────────────────────────
    # Intentionally scoped to product-level fields only (title, description, SKU).
    # Matching against category/collection names is excluded: when those dimension
    # filters are also active the AND would still be correct, but the OR branch
    # inside search would allow wrong rows to pass when no dimension filter is set.
    if search:
        search_terms = get_search_terms(search)
        for term in search_terms:
            w = f"%{term}%"
            sku_subq = (
                db.query(ProductVariant.product_id)
                .filter(ProductVariant.sku.ilike(w))
                .subquery()
            )
            conditions.append(
                or_(
                    Product.title.ilike(w),
                    Product.description.ilike(w),
                    Product.short_description.ilike(w),
                    Product.id.in_(sku_subq),
                )
            )

    return conditions


def _apply_admin_sort(query, sort_by: Optional[str] = None):
    """
    Apply an ORDER BY clause to an admin product query.
    Falls back to newest-first for unknown/missing values.
    """
    if sort_by == "oldest":
        return query.order_by(Product.created_at.asc())
    if sort_by == "alpha_asc":
        return query.order_by(Product.title.asc())
    if sort_by == "updated":
        return query.order_by(Product.updated_at.desc())
    # price_asc / price_desc require a join/subquery — kept simple here;
    # the aggregation subquery is built after pagination so we sort by created_at
    # and let callers add price sorting via a post-query step if needed.
    return query.order_by(Product.created_at.desc())  # default: newest


# ─────────────────────────────────────────────────────────────
# PRODUCT QUERIES
# ─────────────────────────────────────────────────────────────


def get_products_paginated(
    db: Session,
    *,
    search: str = "",
    status_filter: Optional[ProductStatus] = None,
    category_id: Optional[int] = None,
    collection_id: Optional[int] = None,
    genders: Optional[List[str]] = None,
    stock_status: Optional[str] = None,
    is_featured: Optional[bool] = None,
    is_trending: Optional[bool] = None,
    is_best_seller: Optional[bool] = None,
    is_new_arrival: Optional[bool] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    created_after: Optional[datetime] = None,
    created_before: Optional[datetime] = None,
    updated_after: Optional[datetime] = None,
    updated_before: Optional[datetime] = None,
    sort_by: Optional[str] = None,
    page: int = 1,
    per_page: int = 15,
) -> ProductListResponse:
    """
    Paginated admin product listing with dynamic, composable filters.

    All filter arguments are optional and independent — every combination
    is handled by _build_admin_filters() which appends conditions to a flat
    list. SQLAlchemy combines them with AND via .filter(*conditions).
    """
    per_page = min(max(per_page, 1), MAX_PER_PAGE)

    conditions = _build_admin_filters(
        db,
        search=search,
        status_filter=status_filter,
        category_id=category_id,
        collection_id=collection_id,
        genders=genders,
        is_featured=is_featured,
        is_trending=is_trending,
        is_best_seller=is_best_seller,
        is_new_arrival=is_new_arrival,
        stock_status=stock_status,
        min_price=min_price,
        max_price=max_price,
        created_after=created_after,
        created_before=created_before,
        updated_after=updated_after,
        updated_before=updated_before,
    )

    # ── Count (uses same conditions — no double-query risk) ──────────────────
    total = (
        db.query(sqla_func.count(Product.id))
        .filter(*conditions)
        .scalar()
    ) or 0

    total_pages = math.ceil(total / per_page) if total else 1

    # ── Paginated fetch ──────────────────────────────────────────────────────
    product_query = (
        db.query(Product)
        .options(selectinload(Product.variants), selectinload(Product.genders_rel))
        .filter(*conditions)
    )
    product_query = _apply_admin_sort(product_query, sort_by)
    products = (
        product_query
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    # ── Aggregations (stock / price) — one query for the whole page ──────────
    product_ids = [p.id for p in products]
    agg_rows = _build_agg_subquery(db, product_ids)
    agg_by_id = {row.product_id: row for row in agg_rows}

    # ── Resolve category / collection names — one query each ────────────────
    cat_ids = {p.category_id for p in products if p.category_id}
    col_ids = {p.collection_id for p in products if p.collection_id}

    category_map: dict = {}
    if cat_ids:
        cats = db.query(Category.id, Category.name).filter(Category.id.in_(cat_ids)).all()
        category_map = {c.id: c.name for c in cats}

    collection_map: dict = {}
    if col_ids:
        cols = db.query(Collection.id, Collection.name).filter(Collection.id.in_(col_ids)).all()
        collection_map = {c.id: c.name for c in cols}

    items = [
        _build_product_response(p, agg_by_id.get(p.id), category_map, collection_map)
        for p in products
    ]

    return ProductListResponse(
        items=items, total=total, page=page,
        per_page=per_page, total_pages=total_pages,
    )


# ─────────────────────────────────────────────────────────────
# PRODUCT CRUD
# ─────────────────────────────────────────────────────────────


def create_product(db: Session, product_in: ProductCreate) -> ProductResponse:
    existing_products_count = db.query(sqla_func.count(Product.id)).filter(Product.deleted_at.is_(None)).scalar() or 0
    if existing_products_count >= MAX_PRODUCTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum product limit reached. You can only maintain up to {MAX_PRODUCTS} products. Please delete an existing product before adding a new one."
        )

    try:
        base_slug = generate_slug(product_in.title)
    except (NormalizationValidationError, NormalizationReservedWordError, NormalizationAliasConflictError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    slug = _ensure_unique_slug(db, base_slug)

    product = Product(
        title=product_in.title,
        slug=slug,
        description=product_in.description,
        short_description=product_in.short_description,
        category_id=product_in.category_id,
        collection_id=product_in.collection_id,
        material=product_in.material,
        tags=product_in.tags or [],
        status=ProductStatus(product_in.status),
        is_featured=product_in.is_featured,
        is_trending=product_in.is_trending,
        is_best_seller=product_in.is_best_seller,
        is_new_arrival=product_in.is_new_arrival,
        seo_title=product_in.seo_title,
        seo_description=product_in.seo_description,
        gallery_images=[],
    )

    if product_in.genders:
        for g in product_in.genders:
            product.genders_rel.append(ProductGender(gender=g))

    db.add(product)
    try:
        db.commit()
        db.refresh(product)     # single refresh — commit already flushed
    except IntegrityError as exc:
        db.rollback()
        logger.error(f"IntegrityError in create_product: {exc}", exc_info=True)
        if "slug" in str(exc).lower():
            raise HTTPException(status.HTTP_409_CONFLICT, "A product with this slug already exists.")
        raise HTTPException(status.HTTP_409_CONFLICT, "Database integrity constraint violation during product creation.")
    except Exception as exc:
        db.rollback()
        logger.error(f"Unexpected error in create_product: {exc}", exc_info=True)
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "An unexpected error occurred while creating the product.")

    return get_product_response(db, product.id)


def get_product(db: Session, product_id: int) -> Product:
    product = (
        db.query(Product)
        .options(selectinload(Product.variants), selectinload(Product.genders_rel))
        .filter(Product.id == product_id, Product.deleted_at.is_(None))
        .first()
    )
    if not product:
        raise NotFoundError(f"Product {product_id} not found.", code="PRODUCT_NOT_FOUND")
    return product


def get_product_response(db: Session, product_id: int) -> ProductResponse:
    product = get_product(db, product_id)
    cat_map: dict = {}
    col_map: dict = {}
    if product.category_id:
        cat = db.get(Category, product.category_id)
        if cat:
            cat_map[cat.id] = cat.name
    if product.collection_id:
        col = db.get(Collection, product.collection_id)
        if col:
            col_map[col.id] = col.name
    return _build_product_response(product, category_map=cat_map, collection_map=col_map)


def update_product(db: Session, product_id: int, product_in: ProductUpdate) -> ProductResponse:
    product = get_product(db, product_id)
    patch = product_in.model_dump(exclude_unset=True)

    # Normalize image fields to relative database paths before saving
    from app.shared.storage.supabase_storage import _object_path_from_public_url, is_supabase_configured
    from app.core.config import settings

    def normalize_img(val: Optional[str]) -> Optional[str]:
        if not val:
            return val
        if val.startswith("http://") or val.startswith("https://"):
            if is_supabase_configured():
                path = _object_path_from_public_url(val, settings.SUPABASE_PRODUCT_BUCKET)
                if path:
                    return path
            return val
        if val.startswith("/uploads/products/"):
            return val.replace("/uploads/products/", "", 1)
        return val

    for img_field in ["thumbnail", "image_front", "image_back", "image_size_chart"]:
        if img_field in patch:
            patch[img_field] = normalize_img(patch[img_field])

    if "title" in patch and patch["title"]:
        try:
            base_slug = generate_slug(patch["title"])
        except (NormalizationValidationError, NormalizationReservedWordError, NormalizationAliasConflictError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        patch["slug"] = _ensure_unique_slug(db, base_slug, exclude_id=product_id)

    if "status" in patch and patch["status"]:
        patch["status"] = ProductStatus(patch["status"])

    if "genders" in patch:
        product.genders_rel.clear()
        if patch["genders"]:
            for g in patch["genders"]:
                product.genders_rel.append(ProductGender(gender=g))
        del patch["genders"]

    for k, v in patch.items():
        setattr(product, k, v)

    try:
        db.commit()
        db.refresh(product)
    except IntegrityError as exc:
        db.rollback()
        logger.error(f"IntegrityError in update_product: {exc}", exc_info=True)
        if "slug" in str(exc).lower():
            raise HTTPException(status.HTTP_409_CONFLICT, "A product with this slug already exists.")
        raise HTTPException(status.HTTP_409_CONFLICT, "Database integrity constraint violation during product update.")
    except Exception as exc:
        db.rollback()
        logger.error(f"Unexpected error in update_product: {exc}", exc_info=True)
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "An unexpected error occurred while updating the product.")

    return get_product_response(db, product_id)


def soft_delete_product(db: Session, product_id: int) -> None:
    from datetime import datetime, timezone
    product = get_product(db, product_id)
    product.deleted_at = datetime.now(timezone.utc)
    db.commit()


def increment_view_count(db: Session, product_id: int) -> None:
    """Increment view counter via raw UPDATE (no ORM object needed)."""
    db.query(Product).filter(Product.id == product_id).update(
        {Product.view_count: Product.view_count + 1}
    )
    db.commit()


# ─────────────────────────────────────────────────────────────
# BULK ACTIONS
# ─────────────────────────────────────────────────────────────

def bulk_action(db: Session, payload: BulkActionPayload) -> dict:
    from datetime import datetime, timezone

    ids = payload.product_ids
    products = db.query(Product).filter(Product.id.in_(ids), Product.deleted_at.is_(None)).all()
    found_ids = {p.id for p in products}
    not_found = [i for i in ids if i not in found_ids]

    action = payload.action

    if action == "publish":
        for p in products:
            p.status = ProductStatus.published
    elif action == "unpublish":
        for p in products:
            p.status = ProductStatus.draft
    elif action == "archive":
        for p in products:
            p.status = ProductStatus.archived
    elif action == "delete":
        now = datetime.now(timezone.utc)
        for p in products:
            p.deleted_at = now
    elif action == "move_category":
        if not payload.category_id:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "category_id required for move_category.")
        get_category(db, payload.category_id)
        for p in products:
            p.category_id = payload.category_id
    elif action == "move_collection":
        if not payload.collection_id:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "collection_id required for move_collection.")
        get_collection(db, payload.collection_id)
        for p in products:
            p.collection_id = payload.collection_id
    else:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Unknown action: {action}")

    db.commit()
    return {"updated": len(products), "not_found": not_found}


# ─────────────────────────────────────────────────────────────
# VARIANT CRUD
# ─────────────────────────────────────────────────────────────

def validate_product_variant_limits(
    product: Product,
    new_variants: List[VariantCreate],
    updating_variant_id: Optional[int] = None,
    patch: Optional[dict] = None,
) -> None:
    current_variants = [v for v in product.variants if v.id != updating_variant_id]
    
    # 1. Variant Count Check
    total_variants = len(current_variants) + (1 if updating_variant_id else len(new_variants))
    if total_variants > MAX_PRODUCT_VARIANTS:
        logger.warning(f"Attempted to add variant exceeding limit for product {product.id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You have reached the maximum allowed limit of {MAX_PRODUCT_VARIANTS} variants for this product. Please delete an existing variant before adding a new one."
        )


def add_variant(db: Session, product_id: int, variant_in: VariantCreate) -> ProductResponse:
    product = get_product(db, product_id)
    _validate_variant_input(variant_in)
    validate_product_variant_limits(product, [variant_in])

    # ── Manual SKU: validate uniqueness against the database ────────────────
    if variant_in.sku:
        norm_sku = variant_in.sku.strip().lower()
        existing_sku = db.query(ProductVariant).filter(
            sqla_func.lower(ProductVariant.sku) == norm_sku
        ).first()
        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"SKU '{variant_in.sku}' is already in use."
            )

    norm_size = variant_in.size.strip().upper()
    norm_color = variant_in.color.strip().lower() if variant_in.color else ""

    existing_variants = db.query(ProductVariant).filter(ProductVariant.product_id == product_id).all()
    for ev in existing_variants:
        ev_size = ev.size.strip().upper()
        ev_color = ev.color.strip().lower() if ev.color else ""
        if ev_size == norm_size and ev_color == norm_color:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Variant with size='{variant_in.size}' and color='{variant_in.color or ''}' already exists.",
            )

    # ── SKU resolution: use provided SKU or generate + deduplicate ──────────
    # Strategy: iterate attempts 0..9 (attempt=0 → deterministic suffix "001",
    # attempts 1..9 → random hex suffix). For each candidate, check the DB.
    # Only raise after ALL attempts are exhausted — never reject the first
    # candidate without checking it first.
    if variant_in.sku:
        sku = variant_in.sku.strip()
    else:
        _MAX_SKU_ATTEMPTS = 10
        sku = None
        for attempt in range(_MAX_SKU_ATTEMPTS):
            candidate = generate_sku(
                product_title=product.title,
                size=variant_in.size,
                color=variant_in.color,
                product_id=product.id,
                product_slug=product.slug,
                attempt=attempt,
            )
            candidate_lower = candidate.lower()
            in_db = db.query(ProductVariant.id).filter(
                sqla_func.lower(ProductVariant.sku) == candidate_lower
            ).first()
            if not in_db:
                sku = candidate
                logger.debug(
                    "SKU resolved for product_id=%s size=%s color=%s: '%s' (attempt %d)",
                    product_id, variant_in.size, variant_in.color, sku, attempt,
                )
                break
        if sku is None:
            logger.error(
                "SKU exhaustion for product_id=%s size=%s color=%s after %d attempts",
                product_id, variant_in.size, variant_in.color, _MAX_SKU_ATTEMPTS,
            )
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Could not generate a unique SKU for {variant_in.size}/"
                    f"{variant_in.color or ''} after {_MAX_SKU_ATTEMPTS} attempts. "
                    "Please supply a manual SKU."
                ),
            )

    variant = ProductVariant(
        product_id=product_id,
        sku=sku,
        size=variant_in.size,
        color=variant_in.color,
        color_hex=variant_in.color_hex,
        original_price=variant_in.original_price,
        selling_price=variant_in.selling_price,
        discount_percentage=variant_in.discount_percentage,
        stock_quantity=variant_in.stock_quantity,
        reserved_stock=0,
        low_stock_threshold=variant_in.low_stock_threshold,
    )
    db.add(variant)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise e

    return get_product_response(db, product_id)


def add_variants_bulk(db: Session, product_id: int, variants_in: list) -> ProductResponse:
    """
    Bulk-create variants for a product.

    Design — three clean phases:
      Phase 1 (validate):  For each variant, validate fields, check size+color
                           uniqueness, resolve/generate SKU.  All checks use
                           db.execute(select(...)) — bypassing the ORM identity
                           map — so only committed DB rows are seen.  Valid
                           variants are accumulated into `pending_variants`;
                           failed ones append to `errors` and are skipped.
      Phase 2 (add):       db.add_all(pending_variants) — no flush, no savepoint.
      Phase 3 (commit):    Single db.commit().  If a race-condition IntegrityError
                           occurs here, it is caught, rolled back, and re-raised
                           as an HTTPException with an actionable message.

    This avoids the SQLAlchemy identity-map poisoning that occurs when
    begin_nested()+flush() raises an IntegrityError: after a savepoint
    rollback the failed ORM objects remain in the session's unit-of-work,
    causing subsequent db.query() calls to see them (via autoflush or the
    in-memory identity map) and falsely report SKU collisions that do not
    exist in the committed database.
    """
    _MAX_SKU_ATTEMPTS = 10

    product = get_product(db, product_id)
    validate_product_variant_limits(product, variants_in)
    errors: list[str] = []

    # Track SKUs and size+color combos accepted in this request (in-memory only).
    # The DB cannot see uncommitted rows; this set bridges that gap.
    session_skus: set[str] = set()           # lower-cased for case-insensitive compare
    session_combos: set[tuple[str, str]] = set()
    pending_variants: list[ProductVariant] = []  # built during Phase 1

    # ------------------------------------------------------------------
    # Phase 1 — validate every variant and resolve its SKU
    # ------------------------------------------------------------------
    for v in variants_in:
        # ── Field-level validation ────────────────────────────────────
        try:
            _validate_variant_input(v)
        except (HTTPException, DomainValidationError) as e:
            msg = e.detail if hasattr(e, 'detail') else str(e)
            errors.append(str(msg))
            logger.warning(
                "Variant validation failed — product_id=%s size=%s color=%s: %s",
                product_id, v.size, v.color, msg,
            )
            continue

        norm_size  = v.size.strip().upper()
        norm_color = (v.color or "").strip().lower()
        combo_key  = (norm_size, norm_color)

        # ── Duplicate size+color guard (in-session + DB) ──────────────
        if combo_key in session_combos:
            errors.append(f"Duplicate size+color in this request: {v.size}/{v.color or ''}")
            logger.warning(
                "Duplicate size+color in-session — product_id=%s size=%s color=%s",
                product_id, v.size, v.color,
            )
            continue

        # Use core SELECT to skip ORM identity map and query committed rows only.
        existing_combo_row = db.execute(
            select(ProductVariant.id).where(
                ProductVariant.product_id == product_id,
                sqla_func.upper(ProductVariant.size)  == norm_size,
                sqla_func.lower(
                    sqla_func.coalesce(ProductVariant.color, "")
                ) == norm_color,
            )
        ).first()
        if existing_combo_row:
            errors.append(f"Duplicate size+color already exists: {v.size}/{v.color or ''}")
            logger.warning(
                "Duplicate size+color in DB — product_id=%s size=%s color=%s",
                product_id, v.size, v.color,
            )
            continue

        # ── SKU resolution ────────────────────────────────────────────
        if v.sku:  # caller supplied a manual SKU
            norm_sku = v.sku.strip().lower()
            if norm_sku in session_skus:
                errors.append(
                    f"SKU conflict: '{v.sku}' is already staged in this request."
                )
                logger.warning(
                    "Manual SKU '%s' already staged — product_id=%s size=%s color=%s",
                    v.sku, product_id, v.size, v.color,
                )
                continue
            # Core SELECT — bypasses identity map.
            in_db_row = db.execute(
                select(ProductVariant.id).where(
                    sqla_func.lower(ProductVariant.sku) == norm_sku
                )
            ).first()
            if in_db_row:
                errors.append(f"SKU conflict: '{v.sku}' is already in use.")
                logger.warning(
                    "Manual SKU '%s' already in DB — product_id=%s size=%s color=%s",
                    v.sku, product_id, v.size, v.color,
                )
                continue
            sku = v.sku.strip()
            logger.info(
                "[SKU] Manual '%s' accepted — product_id=%s size=%s color=%s",
                sku, product_id, v.size, v.color,
            )

        else:  # auto-generate SKU
            sku = None
            for attempt in range(_MAX_SKU_ATTEMPTS):
                candidate = generate_sku(
                    product_title=product.title,
                    size=v.size,
                    color=v.color,
                    product_id=product.id,
                    product_slug=product.slug,
                    attempt=attempt,
                )
                candidate_lower = candidate.lower()
                logger.debug(
                    "[SKU] Candidate '%s' attempt=%d — product_id=%s size=%s color=%s",
                    candidate, attempt, product_id, v.size, v.color,
                )

                # in-session check first (cheap)
                if candidate_lower in session_skus:
                    logger.debug(
                        "[SKU] '%s' found in session_skus, retrying", candidate
                    )
                    continue

                # Core SELECT — bypasses ORM identity map entirely.
                in_db_row = db.execute(
                    select(ProductVariant.id).where(
                        sqla_func.lower(ProductVariant.sku) == candidate_lower
                    )
                ).first()
                if in_db_row:
                    logger.debug(
                        "[SKU] '%s' found in committed DB (id=%s), retrying",
                        candidate, in_db_row[0],
                    )
                    continue

                # Candidate is free — accept it.
                sku = candidate
                logger.info(
                    "[SKU] Auto-generated '%s' accepted (attempt=%d) — "
                    "product_id=%s size=%s color=%s",
                    sku, attempt, product_id, v.size, v.color,
                )
                break

            if sku is None:
                errors.append(
                    f"Could not generate a unique SKU for {v.size}/{v.color or ''} "
                    f"after {_MAX_SKU_ATTEMPTS} attempts. Please supply a manual SKU."
                )
                logger.error(
                    "[SKU] Exhausted %d attempts — product_id=%s size=%s color=%s",
                    _MAX_SKU_ATTEMPTS, product_id, v.size, v.color,
                )
                continue

        # ── Variant accepted: register in session sets and queue for add ───
        session_skus.add(sku.lower())
        session_combos.add(combo_key)
        pending_variants.append(
            ProductVariant(
                product_id=product_id,
                sku=sku,
                size=v.size,
                color=v.color,
                color_hex=v.color_hex,
                original_price=v.original_price,
                selling_price=v.selling_price,
                discount_percentage=v.discount_percentage,
                stock_quantity=v.stock_quantity,
                reserved_stock=0,
                low_stock_threshold=v.low_stock_threshold,
            )
        )
        logger.info(
            "[Bulk] Variant queued: product_id=%s size=%s color=%s sku='%s'",
            product_id, v.size, v.color, sku,
        )

    # ------------------------------------------------------------------
    # Reject entirely only when no variant could be accepted.
    # ------------------------------------------------------------------
    if not pending_variants and errors:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"errors": errors},
        )

    # ------------------------------------------------------------------
    # Phase 2 — add all accepted variants to the session (no flush).
    # ------------------------------------------------------------------
    db.add_all(pending_variants)

    # ------------------------------------------------------------------
    # Phase 3 — single commit; handle any last-moment race conditions.
    # ------------------------------------------------------------------
    try:
        db.commit()
        logger.info(
            "[Bulk] Commit OK — product_id=%s queued=%d errors=%d",
            product_id, len(pending_variants), len(errors),
        )
    except IntegrityError as exc:
        db.rollback()
        exc_str = str(exc).lower()
        logger.error(
            "[Bulk] IntegrityError on final commit — product_id=%s: %r",
            product_id, exc, exc_info=True,
        )
        if "uq_variant_product_size_color" in exc_str or "size_color" in exc_str:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail=(
                    "A concurrent request created a variant with the same "
                    "size+color combination. Please retry."
                ),
            )
        if "sku" in exc_str:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail=(
                    "A concurrent request created a variant with the same SKU. "
                    "Please retry."
                ),
            )
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database integrity error during variant creation. Please retry.",
        )
    except Exception as exc:
        db.rollback()
        logger.error(
            "[Bulk] Unexpected commit error — product_id=%s: %r",
            product_id, exc, exc_info=True,
        )
        raise

    return get_product_response(db, product_id)


def delete_variant(db: Session, product_id: int, variant_id: int) -> ProductResponse:
    get_product(db, product_id)
    variant = db.query(ProductVariant).filter(
        ProductVariant.id == variant_id,
        ProductVariant.product_id == product_id,
    ).first()
    if not variant:
        raise NotFoundError(f"Variant {variant_id} not found on product {product_id}.", code="VARIANT_NOT_FOUND")
    db.delete(variant)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    return get_product_response(db, product_id)


def update_variant(db: Session, product_id: int, variant_id: int, data) -> ProductResponse:
    """Partially update an existing variant. Only provided fields are changed."""
    product = get_product(db, product_id)
    variant = db.query(ProductVariant).filter(
        ProductVariant.id == variant_id,
        ProductVariant.product_id == product_id,
    ).first()
    if not variant:
        raise NotFoundError(f"Variant {variant_id} not found on product {product_id}.", code="VARIANT_NOT_FOUND")

    patch = data.model_dump(exclude_unset=True)
    validate_product_variant_limits(
        product=product,
        new_variants=[],
        updating_variant_id=variant_id,
        patch=patch
    )

    # Price cross-validation using effective values (new or existing)
    eff_orig = patch.get("original_price", variant.original_price)
    eff_sell = patch.get("selling_price", variant.selling_price)
    if eff_orig is not None and eff_orig <= 0:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "original_price must be greater than zero.")
    if eff_sell is not None and eff_sell <= 0:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "selling_price must be greater than zero.")
    if eff_orig is not None and eff_sell is not None and eff_sell > eff_orig:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"selling_price ({eff_sell}) cannot exceed original_price ({eff_orig})."
        )
    if "stock_quantity" in patch and patch["stock_quantity"] < 0:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "stock_quantity cannot be negative.")
    if "color_hex" in patch and patch["color_hex"] and not _HEX_RE.match(patch["color_hex"]):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"color_hex must be a valid CSS hex colour (e.g. #FF0000). Got: {patch['color_hex']}"
        )

    # Size + Color duplicate validation on update
    eff_size = patch.get("size", variant.size)
    eff_color = patch.get("color", variant.color)
    if eff_size is not None or eff_color is not None:
        norm_size = (eff_size or "").strip().upper()
        norm_color = (eff_color or "").strip().lower()

        other_variants = db.query(ProductVariant).filter(
            ProductVariant.product_id == product_id,
            ProductVariant.id != variant_id
        ).all()
        for ov in other_variants:
            ov_size = ov.size.strip().upper()
            ov_color = ov.color.strip().lower() if ov.color else ""
            if ov_size == norm_size and ov_color == norm_color:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Variant with size='{eff_size}' and color='{eff_color or ''}' already exists.",
                )

    # If SKU is being changed, ensure uniqueness
    if "sku" in patch and patch["sku"] and patch["sku"] != variant.sku:
        norm_sku = patch["sku"].strip().lower()
        existing_sku = db.query(ProductVariant).filter(
            sqla_func.lower(ProductVariant.sku) == norm_sku,
            ProductVariant.id != variant_id,
        ).first()
        if existing_sku:
            raise HTTPException(status.HTTP_409_CONFLICT, f"SKU '{patch['sku']}' is already in use.")

    for k, v in patch.items():
        setattr(variant, k, v)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise e

    return get_product_response(db, product_id)


# ─────────────────────────────────────────────────────────────
# STOREFRONT QUERIES
# ─────────────────────────────────────────────────────────────

def get_products_public(
    db: Session,
    *,
    search: str = "",
    collection: Optional[str] = None,
    genders: Optional[List[str]] = None,
    collection_id: Optional[int] = None,
    category: Optional[str] = None,
    category_id: Optional[int] = None,
    is_featured: Optional[bool] = None,
    is_trending: Optional[bool] = None,
    is_best_seller: Optional[bool] = None,
    is_new_arrival: Optional[bool] = None,
    on_offer: Optional[bool] = None,
    sort_by: str = "newest",
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    page: int = 1,
    per_page: int = 12,
) -> ProductListResponse:
    per_page = min(max(per_page, 1), MAX_PER_PAGE)

    base_filters = [
        Product.deleted_at.is_(None),
        Product.status == ProductStatus.published,
    ]

    if search:
        search_terms = get_search_terms(search)
        for term in search_terms:
            w_term = f"%{term}%"
            sku_subq = db.query(ProductVariant.product_id).filter(ProductVariant.sku.ilike(w_term)).subquery()
            cat_subq = db.query(Category.id).filter(Category.name.ilike(w_term)).subquery()
            col_subq = db.query(Collection.id).filter(Collection.name.ilike(w_term)).subquery()
            base_filters.append(or_(
                Product.title.ilike(w_term),
                Product.slug.ilike(w_term),
                Product.description.ilike(w_term),
                Product.short_description.ilike(w_term),
                cast(Product.tags, Text).ilike(w_term),
                Product.id.in_(sku_subq),
                Product.category_id.in_(cat_subq),
                Product.collection_id.in_(col_subq),
            ))
    if collection:
        try:
            entity = normalize_name(collection)
            norm_col = entity.canonical_name
            col_slug = entity.slug
        except Exception:
            norm_col = collection
            try:
                col_slug = generate_slug(collection)
            except Exception:
                col_slug = ""
        col_db = (
            db.query(Collection.id)
            .filter(or_(Collection.name.ilike(norm_col), Collection.slug == col_slug))
            .first()
        )
        if col_db:
            base_filters.append(Product.collection_id == col_db.id)
        else:
            base_filters.append(Product.collection_id == -1)
    if collection_id:
        base_filters.append(Product.collection_id == collection_id)
    if genders:
        # Normalize incoming gender values to title-case to match stored format (Men/Women/Kids)
        normalized_genders = [g.strip().title() for g in genders if g and g.strip()]
        if normalized_genders:
            gender_subq = db.query(ProductGender.product_id).filter(ProductGender.gender.in_(normalized_genders)).subquery()
            base_filters.append(Product.id.in_(select(gender_subq.c.product_id)))
    if category:
        try:
            entity = normalize_name(category)
            norm_cat = entity.canonical_name
            cat_slug = entity.slug
        except Exception:
            norm_cat = category
            try:
                cat_slug = generate_slug(category)
            except Exception:
                cat_slug = ""
        cat_db = (
            db.query(Category.id)
            .filter(or_(Category.name.ilike(norm_cat), Category.slug == cat_slug))
            .first()
        )
        if cat_db:
            base_filters.append(Product.category_id == cat_db.id)
        else:
            # If no match at all, ensure zero results rather than all results
            base_filters.append(Product.category_id == -1)
    if category_id:
        base_filters.append(Product.category_id == category_id)
    if is_featured is not None:
        base_filters.append(Product.is_featured == is_featured)
    if is_trending is not None:
        base_filters.append(Product.is_trending == is_trending)
    if is_best_seller is not None:
        base_filters.append(Product.is_best_seller == is_best_seller)
    if is_new_arrival is not None:
        base_filters.append(Product.is_new_arrival == is_new_arrival)
    if on_offer is not None:
        if on_offer:
            base_filters.append(
                db.query(ProductVariant)
                .filter(
                    ProductVariant.product_id == Product.id,
                    ProductVariant.selling_price < ProductVariant.original_price
                )
                .exists()
            )
        else:
            base_filters.append(
                ~db.query(ProductVariant)
                .filter(
                    ProductVariant.product_id == Product.id,
                    ProductVariant.selling_price < ProductVariant.original_price
                )
                .exists()
            )

    # ── Price filter: push into SQL via a HAVING subquery ───────────────────
    # This ensures COUNT and LIMIT both operate on the price-filtered universe.
    if min_price is not None or max_price is not None:
        price_q = (
            db.query(ProductVariant.product_id)
            .group_by(ProductVariant.product_id)
        )
        min_price_agg = sqla_func.min(ProductVariant.selling_price)
        if min_price is not None:
            price_q = price_q.having(min_price_agg >= min_price)
        if max_price is not None:
            price_q = price_q.having(min_price_agg <= max_price)
        price_subq = price_q.subquery()
        base_filters.append(Product.id.in_(price_subq))

    total = (
        db.query(sqla_func.count(Product.id))
        .filter(*base_filters)
        .scalar()
    ) or 0

    total_pages = math.ceil(total / per_page) if total else 1

    

    # --------------------------------------------------
    # Sorting
    # --------------------------------------------------

    min_price_sub = (
        db.query(sqla_func.min(ProductVariant.selling_price))
        .filter(ProductVariant.product_id == Product.id)
        .correlate(Product)
        .scalar_subquery()
    )

    if sort_by == "featured":
        order_by = [
            Product.is_featured.desc(),
            Product.created_at.desc(),
        ]

    elif sort_by == "best_seller":
        order_by = [
            Product.is_best_seller.desc(),
            Product.sales_count.desc(),
            Product.created_at.desc(),
        ]

    elif sort_by == "trending":
        order_by = [
            Product.is_trending.desc(),
            Product.view_count.desc(),
            Product.created_at.desc(),
        ]

    elif sort_by == "new_arrival":
        order_by = [
            Product.is_new_arrival.desc(),
            Product.created_at.desc(),
        ]

    elif sort_by == "newest":
        order_by = [
            Product.created_at.desc(),
        ]

    elif sort_by == "oldest":
        order_by = [
            Product.created_at.asc(),
        ]

    elif sort_by == "name_asc":
        order_by = [
            Product.title.asc(),
        ]

    elif sort_by == "name_desc":
        order_by = [
            Product.title.desc(),
        ]

    elif sort_by == "price_asc":
        order_by = [
            min_price_sub.asc(),
        ]

    elif sort_by == "price_desc":
        order_by = [
            min_price_sub.desc(),
        ]

    else:
        order_by = [
            Product.created_at.desc(),
        ]

    products = (
        db.query(Product)
        .options(selectinload(Product.variants), selectinload(Product.genders_rel))
        .filter(*base_filters)
        .order_by(*order_by)
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    product_ids = [p.id for p in products]
    agg_rows = _build_agg_subquery(db, product_ids)
    agg_by_id = {row.product_id: row for row in agg_rows}

    cat_ids = {p.category_id for p in products if p.category_id}
    col_ids = {p.collection_id for p in products if p.collection_id}
    cat_map: dict = {}
    col_map: dict = {}
    if cat_ids:
        cats = db.query(Category.id, Category.name).filter(Category.id.in_(cat_ids)).all()
        cat_map = {c.id: c.name for c in cats}
    if col_ids:
        cols = db.query(Collection.id, Collection.name).filter(Collection.id.in_(col_ids)).all()
        col_map = {c.id: c.name for c in cols}

    items = [_build_product_response(p, agg_by_id.get(p.id), cat_map, col_map) for p in products]

    return ProductListResponse(items=items, total=total, page=page, per_page=per_page, total_pages=total_pages)


def get_product_by_slug(db: Session, slug: str) -> ProductResponse:
    try:
        from app.shared.normalization import normalize_name
        norm_slug = normalize_name(slug).slug
    except Exception:
        norm_slug = slug

    product = (
        db.query(Product)
        .options(selectinload(Product.variants), selectinload(Product.genders_rel))
        .filter(
            Product.slug == norm_slug,
            Product.deleted_at.is_(None),
            Product.status == ProductStatus.published,
        )
        .first()
    )
    if not product:
        raise NotFoundError(f"Product '{slug}' not found.", code="PRODUCT_NOT_FOUND")

    # Increment view count via raw UPDATE, then expire the cached attribute
    # on the loaded object so the response reflects the new value.
    increment_view_count(db, product.id)
    db.expire(product, ["view_count"])

    cat_map: dict = {}
    col_map: dict = {}
    if product.category_id:
        cat = db.get(Category, product.category_id)
        if cat:
            cat_map[cat.id] = cat.name
    if product.collection_id:
        col = db.get(Collection, product.collection_id)
        if col:
            col_map[col.id] = col.name

    return _build_product_response(product, category_map=cat_map, collection_map=col_map)


def get_related_products(db: Session, product: ProductResponse, limit: int = 6) -> List[ProductResponse]:
    """
    Priority 1: Same collection_id
    Priority 2: Same category_id
    Priority 3: Best sellers
    """
    base = [
        Product.deleted_at.is_(None),
        Product.status == ProductStatus.published,
        Product.id != product.id,
    ]

    def fetch(extra_filters, n) -> List[ProductResponse]:
        rows = (
            db.query(Product)
            .options(selectinload(Product.variants), selectinload(Product.genders_rel))
            .filter(*base, *extra_filters)
            .limit(n)
            .all()
        )
        if not rows:
            return []
        ids = [r.id for r in rows]
        agg_rows = _build_agg_subquery(db, ids)
        agg_by_id = {r.product_id: r for r in agg_rows}

        # Resolve category/collection names for the fetched batch
        c_ids = {r.category_id for r in rows if r.category_id}
        co_ids = {r.collection_id for r in rows if r.collection_id}
        c_map: dict = {}
        co_map: dict = {}
        if c_ids:
            cats = db.query(Category.id, Category.name).filter(Category.id.in_(c_ids)).all()
            c_map = {c.id: c.name for c in cats}
        if co_ids:
            cols = db.query(Collection.id, Collection.name).filter(Collection.id.in_(co_ids)).all()
            co_map = {c.id: c.name for c in cols}

        return [_build_product_response(p, agg_by_id.get(p.id), c_map, co_map) for p in rows]

    results: List[ProductResponse] = []
    seen_ids: set = set()

    if product.collection_id:
        for r in fetch([Product.collection_id == product.collection_id], limit):
            if r.id not in seen_ids:
                results.append(r)
                seen_ids.add(r.id)

    if len(results) < limit and product.category_id:
        for r in fetch(
            [Product.category_id == product.category_id, Product.id.not_in(seen_ids)],
            limit - len(results),
        ):
            if r.id not in seen_ids:
                results.append(r)
                seen_ids.add(r.id)

    if len(results) < limit:
        for r in fetch(
            [Product.is_best_seller == True, Product.id.not_in(seen_ids)],  # noqa: E712
            limit - len(results),
        ):
            if r.id not in seen_ids:
                results.append(r)
                seen_ids.add(r.id)

    return results[:limit]