import logging
import math
import re
import uuid
from typing import Optional, List

from fastapi import HTTPException, status
from app.shared.exceptions import (
    NotFoundError, ConflictError, BusinessRuleError,
    ValidationError as DomainValidationError,
)
from sqlalchemy import or_, func as sqla_func, cast, Text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.modules.products.models import (
    Category, Collection, Product, ProductVariant, ProductStatus
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
    MAX_SUB_COLLECTIONS,
    MAX_PRODUCT_IMAGES,
    MAX_SIZES,
    MAX_COLORS,
    MAX_PRODUCT_VARIANTS,
    DEFAULT_PRODUCT_CATEGORIES,
    DEFAULT_COLLECTIONS,
    PROTECTED_PRODUCT_CATEGORIES,
    PROTECTED_COLLECTIONS,
)

MAX_PER_PAGE = 100

logger = logging.getLogger(__name__)


def normalize_category_name(name: str) -> Optional[str]:
    # Strip and convert to lowercase, remove space, hyphen, underscore
    val = name.strip().lower()
    val = re.sub(r'[\s_-]+', '', val)
    for allowed in DEFAULT_PRODUCT_CATEGORIES:
        allowed_stripped = re.sub(r'[\s_-]+', '', allowed.lower())
        if val == allowed_stripped or val == allowed_stripped + "s" or (allowed_stripped == "tshirt" and val in {"tee", "tees"}):
            return allowed
    return None


def validate_main_product_category(db: Session, category_id: Optional[int]) -> None:
    if category_id is None:
        return
    cat = db.get(Category, category_id)
    allowed_list_str = ", ".join(DEFAULT_PRODUCT_CATEGORIES)
    if not cat:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Invalid category. Allowed categories are {allowed_list_str}."
        )
    APPROVED_SET = set(DEFAULT_PRODUCT_CATEGORIES)
    if cat.name not in APPROVED_SET:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Invalid category. Allowed categories are {allowed_list_str}."
        )


def normalize_collection_name(name: str) -> Optional[str]:
    val = name.strip().lower()
    val = re.sub(r'[\s_\-\'\"]+', '', val)
    for allowed in DEFAULT_COLLECTIONS:
        allowed_stripped = re.sub(r'[\s_\-\'\"]+', '', allowed.lower())
        if allowed_stripped in val or val in allowed_stripped:
            return allowed
    return None


def validate_main_product_collection(db: Session, collection_id: Optional[int], category_id: Optional[int] = None) -> None:
    is_main_product = False
    APPROVED_SET = set(DEFAULT_PRODUCT_CATEGORIES)
    if category_id is not None:
        cat = db.get(Category, category_id)
        if cat and cat.name in APPROVED_SET:
            is_main_product = True
    else:
        is_main_product = True

    if not is_main_product:
        return

    if collection_id is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Collection is required for Main Products."
        )
    coll = db.get(Collection, collection_id)
    allowed_list_str = ", ".join(DEFAULT_COLLECTIONS)
    if not coll:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Invalid collection. Allowed collections are {allowed_list_str}."
        )
    norm = normalize_collection_name(coll.name)
    APPROVED_COLLECTIONS = set(DEFAULT_COLLECTIONS)
    if norm not in APPROVED_COLLECTIONS:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Invalid collection '{coll.name}'. Allowed collections are {allowed_list_str}."
        )


# ─────────────────────────────────────────────────────────────
# Slug helpers
# ─────────────────────────────────────────────────────────────

def _slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    return re.sub(r"-+", "-", slug).strip("-")


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


def generate_sku(product_title: str, size: str, color: Optional[str] = None) -> str:
    prefix      = _sku_prefix(product_title)
    color_code  = _sku_color_code(color)
    size_code   = size.upper().replace(" ", "")
    rand_suffix = uuid.uuid4().hex[:6].upper()
    return f"{prefix}-{color_code}-{size_code}-{rand_suffix}"


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
        collection=p.collection,
        sub_collection=p.collection,
        category_id=p.category_id,
        collection_id=p.collection_id,
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
    norm_new = " ".join(name.strip().split()).lower()
    query = db.query(Category)
    if exclude_id is not None:
        query = query.filter(Category.id != exclude_id)
    for cat in query.all():
        norm_cat = " ".join(cat.name.strip().split()).lower()
        if norm_cat == norm_new:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category with name '{name}' already exists (matches '{cat.name}')."
            )


def create_category(db: Session, data: CategoryCreate) -> CategoryResponse:
    existing_count = db.query(sqla_func.count(Category.id)).scalar() or 0
    if existing_count >= MAX_CATEGORIES:
        logger.warning("Attempted to create category beyond limit")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your current store configuration has reached the maximum allowed limit. Please contact the system administrator if you need additional categories or collections."
        )

    check_duplicate_category(db, data.name)

    norm_name = normalize_category_name(data.name)
    if norm_name:
        raise BusinessRuleError(
            f"Category creation is disabled for Main Products. '{norm_name}' already exists.",
            code="CATEGORY_RESERVED",
        )
    slug = _unique_slug(db, Category, _slugify(data.name))
    cat = Category(
        name=data.name.strip(),
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
    PROTECTED_SET = set(PROTECTED_PRODUCT_CATEGORIES)
    patch = data.model_dump(exclude_unset=True)

    if cat.name in PROTECTED_SET:
        # Only the name field is protected — status, description, sort_order can change
        if "name" in patch and patch["name"] != cat.name:
            raise BusinessRuleError(
                "Category renaming is disabled for Main Product categories.",
                code="CATEGORY_RENAME_BLOCKED",
            )
        # Remove name from patch to be safe; allow all other fields
        patch.pop("name", None)
        patch.pop("slug", None)

    else:
        if "name" in patch:
            norm_name = normalize_category_name(patch["name"])
            if norm_name:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    f"Cannot rename category to '{norm_name}' as it is a reserved Main Product category."
                )
            check_duplicate_category(db, patch["name"], exclude_id=category_id)
            patch["slug"] = _unique_slug(db, Category, _slugify(patch["name"]), exclude_id=category_id)

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
    PROTECTED_SET = set(PROTECTED_PRODUCT_CATEGORIES)
    if cat.name in PROTECTED_SET:
        raise BusinessRuleError(
            "Category deletion is disabled for Main Product categories.",
            code="CATEGORY_DELETE_BLOCKED",
        )
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

def _parse_collection_description(description: Optional[str]) -> tuple[Optional[str], list[str]]:
    if not description:
        return None, []
    try:
        data = json.loads(description)
        if isinstance(data, dict):
            desc = data.get("description")
            sub_cols = data.get("sub_collections", [])
            if isinstance(sub_cols, list):
                return desc, [str(s) for s in sub_cols]
    except Exception:
        pass
    return description, []

def _serialize_collection_description(description: Optional[str], sub_collections: list[str]) -> str:
    return json.dumps({
        "description": description,
        "sub_collections": sub_collections
    })

def get_sub_collections_for_collection(db: Session, collection_id: int) -> list[str]:
    col = db.get(Collection, collection_id)
    if not col:
        return []
    
    _, predefined = _parse_collection_description(col.description)
    
    query = db.query(Product.collection).filter(
        Product.collection_id == collection_id,
        Product.collection.isnot(None),
        Product.collection != "",
        Product.deleted_at.is_(None),
    )
    dynamic = [row[0].strip() for row in query.distinct().all() if row[0]]
    
    seen = set()
    combined = []
    for item in predefined:
        item_clean = item.strip()
        if item_clean and item_clean.lower() not in seen:
            seen.add(item_clean.lower())
            combined.append(item_clean)
    for item in dynamic:
        item_clean = item.strip()
        if item_clean and item_clean.lower() not in seen:
            seen.add(item_clean.lower())
            combined.append(item_clean)
            
    return combined

def create_sub_collection(db: Session, collection_id: int, name: str) -> list[str]:
    col = get_collection(db, collection_id)
    name_clean = name.strip()
    
    from app.core.constants import MIN_SUB_COLLECTION_NAME_LENGTH, MAX_SUB_COLLECTION_NAME_LENGTH
    if len(name_clean) < MIN_SUB_COLLECTION_NAME_LENGTH or len(name_clean) > MAX_SUB_COLLECTION_NAME_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sub Collection name must be between {MIN_SUB_COLLECTION_NAME_LENGTH} and {MAX_SUB_COLLECTION_NAME_LENGTH} characters"
        )
        
    current = get_sub_collections_for_collection(db, collection_id)
    if name_clean.lower() in {c.lower() for c in current}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sub-collection '{name_clean}' already exists."
        )
        
    if len(current) >= MAX_SUB_COLLECTIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your current store configuration has reached the maximum allowed limit. Please contact the system administrator if you need additional categories or collections."
        )
        
    desc_text, predefined = _parse_collection_description(col.description)
    predefined.append(name_clean)
    col.description = _serialize_collection_description(desc_text, predefined)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
        
    return get_sub_collections_for_collection(db, collection_id)

def update_sub_collection(db: Session, collection_id: int, old_name: str, new_name: str) -> list[str]:
    col = get_collection(db, collection_id)
    old_clean = old_name.strip()
    new_clean = new_name.strip()
    
    from app.core.constants import MIN_SUB_COLLECTION_NAME_LENGTH, MAX_SUB_COLLECTION_NAME_LENGTH
    if len(new_clean) < MIN_SUB_COLLECTION_NAME_LENGTH or len(new_clean) > MAX_SUB_COLLECTION_NAME_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sub Collection name must be between {MIN_SUB_COLLECTION_NAME_LENGTH} and {MAX_SUB_COLLECTION_NAME_LENGTH} characters"
        )
        
    current = get_sub_collections_for_collection(db, collection_id)
    if old_clean.lower() not in {c.lower() for c in current}:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sub-collection '{old_clean}' not found."
        )
        
    if old_clean.lower() != new_clean.lower() and new_clean.lower() in {c.lower() for c in current}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sub-collection '{new_clean}' already exists."
        )
        
    desc_text, predefined = _parse_collection_description(col.description)
    predefined = [new_clean if s.strip().lower() == old_clean.lower() else s for s in predefined]
    col.description = _serialize_collection_description(desc_text, predefined)
    
    products = db.query(Product).filter(
        Product.collection_id == collection_id,
        Product.collection == old_clean,
        Product.deleted_at.is_(None)
    ).all()
    for p in products:
        p.collection = new_clean
        
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
        
    return get_sub_collections_for_collection(db, collection_id)

def delete_sub_collection(db: Session, collection_id: int, name: str) -> list[str]:
    col = get_collection(db, collection_id)
    name_clean = name.strip()
    
    assigned_products = db.query(Product).filter(
        Product.collection_id == collection_id,
        Product.collection == name_clean,
        Product.deleted_at.is_(None)
    ).first()
    if assigned_products:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This sub-collection is currently assigned to products. Remove or reassign those products before deleting the sub-collection."
        )
        
    desc_text, predefined = _parse_collection_description(col.description)
    predefined = [s for s in predefined if s.strip().lower() != name_clean.lower()]
    col.description = _serialize_collection_description(desc_text, predefined)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
        
    return get_sub_collections_for_collection(db, collection_id)


def get_collections(
    db: Session,
    category_id: Optional[int] = None,
    status_filter: Optional[str] = None,
) -> List[CollectionResponse]:
    q = db.query(Collection)
    if category_id:
        cat = db.get(Category, category_id)
        if cat and cat.name in set(DEFAULT_PRODUCT_CATEGORIES):
            q = q.filter(or_(Collection.category_id == category_id, Collection.category_id.is_(None)))
        else:
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
            description=_parse_collection_description(r.description)[0],
            status=r.status,
            category_id=r.category_id,
            category_name=cat_map.get(r.category_id),
            created_at=r.created_at,
            updated_at=r.updated_at,
            sub_collections=get_sub_collections_for_collection(db, r.id),
        )
        for r in rows
    ]


def get_collection(db: Session, collection_id: int) -> Collection:
    col = db.get(Collection, collection_id)
    if not col:
        raise NotFoundError(f"Collection {collection_id} not found.", code="COLLECTION_NOT_FOUND")
    return col


def check_duplicate_collection(db: Session, name: str, exclude_id: int = None):
    norm_new = name.strip().lower()
    query = db.query(Collection)
    if exclude_id is not None:
        query = query.filter(Collection.id != exclude_id)
    for col in query.all():
        norm_col = col.name.strip().lower()
        if norm_col == norm_new:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Collection with name '{name}' already exists (matches '{col.name}')."
            )


def create_collection(db: Session, data: CollectionCreate) -> CollectionResponse:
    existing_count = db.query(sqla_func.count(Collection.id)).scalar() or 0
    if existing_count >= MAX_COLLECTIONS:
        logger.warning("Attempted to create collection beyond limit")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your current store configuration has reached the maximum allowed limit. Please contact the system administrator if you need additional categories or collections."
        )

    check_duplicate_collection(db, data.name)

    norm_name = normalize_collection_name(data.name)
    if norm_name:
        raise BusinessRuleError(
            f"Collection creation is disabled for Main Products. '{norm_name}' already exists.",
            code="COLLECTION_RESERVED",
        )

    if data.category_id:
        get_category(db, data.category_id)
    slug = _unique_slug(db, Collection, _slugify(data.name))
    desc_wrapped = _serialize_collection_description(data.description, [])
    col = Collection(
        name=data.name,
        slug=slug,
        description=desc_wrapped,
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
        description=_parse_collection_description(col.description)[0],
        status=col.status, category_id=col.category_id,
        category_name=cat_name, created_at=col.created_at, updated_at=col.updated_at,
        sub_collections=get_sub_collections_for_collection(db, col.id),
    )


def update_collection(db: Session, collection_id: int, data: CollectionUpdate) -> CollectionResponse:
    col = get_collection(db, collection_id)
    PROTECTED_SET = set(PROTECTED_COLLECTIONS)
    patch = data.model_dump(exclude_unset=True)

    if col.name in PROTECTED_SET:
        if "name" in patch and patch["name"] != col.name:
            raise BusinessRuleError(
                "Collection renaming is disabled for Main Product collections.",
                code="COLLECTION_RENAME_BLOCKED",
            )
        patch.pop("name", None)
        patch.pop("slug", None)

    else:
        if "category_id" in patch and patch["category_id"]:
            get_category(db, patch["category_id"])
        if "name" in patch:
            norm_name = normalize_collection_name(patch["name"])
            if norm_name:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    f"Cannot rename collection to '{norm_name}' as it is a reserved Main Product collection."
                )
            check_duplicate_collection(db, patch["name"], exclude_id=collection_id)
            patch["slug"] = _unique_slug(db, Collection, _slugify(patch["name"]), exclude_id=collection_id)

    _, current_sub_cols = _parse_collection_description(col.description)
    if "description" in patch:
        new_desc = patch["description"]
        patch["description"] = _serialize_collection_description(new_desc, current_sub_cols)

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
        description=_parse_collection_description(col.description)[0],
        status=col.status, category_id=col.category_id,
        category_name=cat_name, created_at=col.created_at, updated_at=col.updated_at,
        sub_collections=get_sub_collections_for_collection(db, col.id),
    )


def delete_collection(db: Session, collection_id: int) -> None:
    col = get_collection(db, collection_id)
    PROTECTED_SET = set(PROTECTED_COLLECTIONS)
    if col.name in PROTECTED_SET:
        raise BusinessRuleError(
            "Collection deletion is disabled for Main Product collections.",
            code="COLLECTION_DELETE_BLOCKED",
        )
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


def _stock_having_clause(stock_status: str, threshold_col):
    """
    Return a HAVING expression for the given stock_status string.
    threshold_col is the aggregated low_stock_threshold expression.
    """
    total = sqla_func.coalesce(sqla_func.sum(ProductVariant.stock_quantity), 0)
    if stock_status == "out_of_stock":
        return total == 0
    if stock_status == "low_stock":
        # 0 < total_stock <= threshold
        return (total > 0) & (total <= threshold_col)
    if stock_status == "in_stock":
        return total > threshold_col
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


def get_products_paginated(
    db: Session,
    *,
    search: str = "",
    status_filter: Optional[ProductStatus] = None,
    category_id: Optional[int] = None,
    collection_id: Optional[int] = None,
    sub_collection: Optional[str] = None,
    stock_status: Optional[str] = None,   # "in_stock" | "low_stock" | "out_of_stock"
    is_featured: Optional[bool] = None,
    is_trending: Optional[bool] = None,
    is_best_seller: Optional[bool] = None,
    is_new_arrival: Optional[bool] = None,
    page: int = 1,
    per_page: int = 15,
) -> ProductListResponse:
    per_page = min(max(per_page, 1), MAX_PER_PAGE)

    base_filters = [Product.deleted_at.is_(None)]

    if search:
        words = [w.strip() for w in search.split() if w.strip()]
        if len(words) > 1:
            for word in words:
                w_term = f"%{word}%"
                w_sku_subq = db.query(ProductVariant.product_id).filter(ProductVariant.sku.ilike(w_term)).subquery()
                w_cat_subq = db.query(Category.id).filter(Category.name.ilike(w_term)).subquery()
                w_col_subq = db.query(Collection.id).filter(Collection.name.ilike(w_term)).subquery()
                base_filters.append(or_(
                    Product.title.ilike(w_term),
                    Product.slug.ilike(w_term),
                    Product.collection.ilike(w_term),
                    Product.description.ilike(w_term),
                    Product.short_description.ilike(w_term),
                    cast(Product.tags, Text).ilike(w_term),
                    Product.id.in_(w_sku_subq),
                    Product.category_id.in_(w_cat_subq),
                    Product.collection_id.in_(w_col_subq),
                ))
        else:
            term = f"%{search.strip()}%"
            sku_subq = db.query(ProductVariant.product_id).filter(ProductVariant.sku.ilike(term)).subquery()
            cat_subq  = db.query(Category.id).filter(Category.name.ilike(term)).subquery()
            col_subq  = db.query(Collection.id).filter(Collection.name.ilike(term)).subquery()
            base_filters.append(or_(
                Product.title.ilike(term),
                Product.slug.ilike(term),
                Product.collection.ilike(term),
                Product.description.ilike(term),
                Product.short_description.ilike(term),
                cast(Product.tags, Text).ilike(term),
                Product.id.in_(sku_subq),
                Product.category_id.in_(cat_subq),
                Product.collection_id.in_(col_subq),
            ))
    if status_filter:
        base_filters.append(Product.status == status_filter)
    if category_id:
        base_filters.append(Product.category_id == category_id)
    if collection_id:
        base_filters.append(Product.collection_id == collection_id)
    if sub_collection:
        base_filters.append(Product.collection == sub_collection)
    if is_featured is not None:
        base_filters.append(Product.is_featured == is_featured)
    if is_trending is not None:
        base_filters.append(Product.is_trending == is_trending)
    if is_best_seller is not None:
        base_filters.append(Product.is_best_seller == is_best_seller)
    if is_new_arrival is not None:
        base_filters.append(Product.is_new_arrival == is_new_arrival)

    # ── stock_status: filter in SQL via a HAVING subquery ───────────────────
    # Build the set of product IDs that pass the stock filter before paginating,
    # so COUNT and LIMIT both operate on the correctly-filtered universe.
    if stock_status:
        threshold_col = sqla_func.coalesce(sqla_func.min(ProductVariant.low_stock_threshold), 5)
        stock_subq = (
            db.query(ProductVariant.product_id)
            .group_by(ProductVariant.product_id)
        )
        clause = _stock_having_clause(stock_status, threshold_col)
        if clause is not None:
            stock_subq = stock_subq.having(clause)
        stock_subq = stock_subq.subquery()
        base_filters.append(Product.id.in_(stock_subq))

    total = (
        db.query(sqla_func.count(Product.id))
        .filter(*base_filters)
        .scalar()
    ) or 0

    total_pages = math.ceil(total / per_page) if total else 1

    products = (
        db.query(Product)
        .options(selectinload(Product.variants))
        .filter(*base_filters)
        .order_by(Product.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    product_ids = [p.id for p in products]
    agg_rows = _build_agg_subquery(db, product_ids)  # no stock_status here; already filtered above
    agg_by_id = {row.product_id: row for row in agg_rows}

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

    return ProductListResponse(items=items, total=total, page=page, per_page=per_page, total_pages=total_pages)


# ─────────────────────────────────────────────────────────────
# PRODUCT CRUD
# ─────────────────────────────────────────────────────────────

def validate_sub_collection_limit(db: Session, collection_id: Optional[int], new_sub_col: Optional[str], exclude_product_ids: List[int] = None) -> None:
    if not collection_id or not new_sub_col:
        return
    
    new_sub_col_clean = new_sub_col.strip()
    if not new_sub_col_clean:
        return
        
    # Get all unique sub-collection strings for this collection_id
    query = db.query(Product.collection).filter(
        Product.collection_id == collection_id,
        Product.collection.isnot(None),
        Product.collection != "",
        Product.deleted_at.is_(None),
    )
    if exclude_product_ids:
        query = query.filter(Product.id.notin_(exclude_product_ids))
        
    existing_sub_cols = {row[0].strip().lower() for row in query.distinct().all() if row[0]}
    
    # If the new one is not already in the existing set
    if new_sub_col_clean.lower() not in existing_sub_cols:
        if len(existing_sub_cols) >= MAX_SUB_COLLECTIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You have reached the maximum allowed limit of {MAX_SUB_COLLECTIONS} sub collections for this collection. Please delete an existing sub collection before creating a new one."
            )


def create_product(db: Session, product_in: ProductCreate) -> ProductResponse:
    # Determine if it's a main product
    cat_id = product_in.category_id
    is_main_product = False
    if cat_id:
        cat = db.get(Category, cat_id)
        if cat and cat.name in set(DEFAULT_PRODUCT_CATEGORIES):
            is_main_product = True

    if is_main_product:
        validate_main_product_category(db, cat_id)
        validate_main_product_collection(db, product_in.collection_id, cat_id)

    db_collection = product_in.sub_collection if product_in.sub_collection is not None else product_in.collection
    validate_sub_collection_limit(db, product_in.collection_id, db_collection)

    base_slug = _slugify(product_in.title)
    slug = _ensure_unique_slug(db, base_slug)

    product = Product(
        title=product_in.title,
        slug=slug,
        description=product_in.description,
        short_description=product_in.short_description,
        collection=db_collection,
        category_id=product_in.category_id,
        collection_id=product_in.collection_id,
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

    db.add(product)
    try:
        db.commit()
        db.refresh(product)     # single refresh — commit already flushed
    except IntegrityError as exc:
        db.rollback()
        if "slug" in str(exc).lower():
            raise HTTPException(status.HTTP_409_CONFLICT, "A product with this slug already exists.")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to create product.")

    return get_product_response(db, product.id)


def get_product(db: Session, product_id: int) -> Product:
    product = (
        db.query(Product)
        .options(selectinload(Product.variants))
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

    # Determine if it's a main product
    cat_id = patch.get("category_id", product.category_id)
    is_main_product = False
    if cat_id:
        cat = db.get(Category, cat_id)
        if cat and cat.name in set(DEFAULT_PRODUCT_CATEGORIES):
            is_main_product = True

    if is_main_product:
        if "category_id" in patch:
            validate_main_product_category(db, patch["category_id"])
        if "collection_id" in patch or "category_id" in patch:
            coll_id = patch.get("collection_id", product.collection_id)
            validate_main_product_collection(db, coll_id, cat_id)

    if "title" in patch and patch["title"]:
        base_slug = _slugify(patch["title"])
        patch["slug"] = _ensure_unique_slug(db, base_slug, exclude_id=product_id)

    if "status" in patch and patch["status"]:
        patch["status"] = ProductStatus(patch["status"])

    if "sub_collection" in patch:
        patch["collection"] = patch["sub_collection"]
        del patch["sub_collection"]

    target_col_id = patch.get("collection_id", product.collection_id)
    target_sub_col = patch.get("collection", product.collection)
    validate_sub_collection_limit(db, target_col_id, target_sub_col, exclude_product_ids=[product.id])

    for k, v in patch.items():
        setattr(product, k, v)

    try:
        db.commit()
        db.refresh(product)
    except IntegrityError as exc:
        db.rollback()
        if "slug" in str(exc).lower():
            raise HTTPException(status.HTTP_409_CONFLICT, "A product with this slug already exists.")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to update product.")

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
        validate_main_product_category(db, payload.category_id)
        for p in products:
            p.category_id = payload.category_id
    elif action == "move_collection":
        if not payload.collection_id:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "collection_id required for move_collection.")
        # Enforce validation: Collection must be Men, Women, or Kids for Main Products
        for p in products:
            validate_main_product_collection(db, payload.collection_id, p.category_id)
            p.collection_id = payload.collection_id
    elif action == "move_sub_collection":
        new_sub = payload.sub_collection.strip() if (payload.sub_collection and payload.sub_collection.strip()) else None
        if new_sub:
            # Group products by collection_id to validate each collection
            collection_to_product_ids = {}
            for p in products:
                if p.collection_id:
                    collection_to_product_ids.setdefault(p.collection_id, []).append(p.id)
            for col_id, p_ids in collection_to_product_ids.items():
                validate_sub_collection_limit(db, col_id, new_sub, exclude_product_ids=p_ids)
        for p in products:
            p.collection = new_sub
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

    # 2. Sizes Check
    sizes = {v.size.strip().upper() for v in current_variants if v.size}
    if updating_variant_id:
        old_var = next(v for v in product.variants if v.id == updating_variant_id)
        updating_size = patch.get("size") if patch else None
        final_size = (updating_size or old_var.size).strip().upper()
        sizes.add(final_size)
    else:
        for nv in new_variants:
            sizes.add(nv.size.strip().upper())
            
    if len(sizes) > MAX_SIZES:
        logger.warning(f"Attempted to add size exceeding limit for product {product.id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You have reached the maximum allowed limit of {MAX_SIZES} sizes for this product. Please delete an existing size before adding a new one."
        )

    # 3. Colors Check
    colors = {v.color.strip().lower() for v in current_variants if v.color}
    if updating_variant_id:
        old_var = next(v for v in product.variants if v.id == updating_variant_id)
        if patch and "color" in patch:
            final_color = patch["color"]
        else:
            final_color = old_var.color
        if final_color and final_color.strip():
            colors.add(final_color.strip().lower())
    else:
        for nv in new_variants:
            if nv.color and nv.color.strip():
                colors.add(nv.color.strip().lower())
                
    if len(colors) > MAX_COLORS:
        logger.warning(f"Attempted to add color exceeding limit for product {product.id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You have reached the maximum allowed limit of {MAX_COLORS} colors for this product. Please delete an existing color before adding a new one."
        )


def add_variant(db: Session, product_id: int, variant_in: VariantCreate) -> ProductResponse:
    product = get_product(db, product_id)
    _validate_variant_input(variant_in)
    validate_product_variant_limits(product, [variant_in])

    # Trim and case-insensitive check SKU
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

    sku = variant_in.sku or generate_sku(product.title, variant_in.size, variant_in.color)
    for _attempt in range(5):
        if not db.query(ProductVariant).filter(ProductVariant.sku == sku).first():
            break
        sku = generate_sku(product.title, variant_in.size, variant_in.color)

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
    product = get_product(db, product_id)
    validate_product_variant_limits(product, variants_in)
    succeeded = 0
    errors: list[str] = []

    for v in variants_in:
        try:
            _validate_variant_input(v)
        except HTTPException as e:
            errors.append(str(e.detail))
            continue

        # Trim and case-insensitive check SKU
        if v.sku:
            norm_sku = v.sku.strip().lower()
            existing_sku = db.query(ProductVariant).filter(
                sqla_func.lower(ProductVariant.sku) == norm_sku
            ).first()
            if existing_sku:
                errors.append(f"SKU conflict: '{v.sku}' is already in use.")
                continue

        norm_size = v.size.strip().upper()
        norm_color = v.color.strip().lower() if v.color else ""

        existing_combo = False
        for ev in db.query(ProductVariant).filter(ProductVariant.product_id == product_id).all():
            ev_size = ev.size.strip().upper()
            ev_color = ev.color.strip().lower() if ev.color else ""
            if ev_size == norm_size and ev_color == norm_color:
                existing_combo = True
                break
        if existing_combo:
            errors.append(f"Duplicate size+color: {v.size}/{v.color or ''}")
            continue

        sku = v.sku or generate_sku(product.title, v.size, v.color)
        for _attempt in range(5):
            if not db.query(ProductVariant).filter(ProductVariant.sku == sku).first():
                break
            sku = generate_sku(product.title, v.size, v.color)

        try:
            with db.begin_nested():
                variant = ProductVariant(
                    product_id=product_id, sku=sku, size=v.size, color=v.color,
                    color_hex=v.color_hex, original_price=v.original_price,
                    selling_price=v.selling_price, discount_percentage=v.discount_percentage,
                    stock_quantity=v.stock_quantity, reserved_stock=0,
                    low_stock_threshold=v.low_stock_threshold,
                )
                db.add(variant)
                db.flush()
            succeeded += 1
        except IntegrityError as exc:
            db.expire_all()
            if "uq_variant_product_size_color" in str(exc):
                errors.append(f"Duplicate size+color: {v.size}/{v.color or ''}")
            elif "sku" in str(exc).lower():
                errors.append(f"SKU conflict for {v.size}/{v.color or ''}")
            else:
                errors.append(f"Integrity error on size={v.size}, color={v.color}")

    if succeeded == 0 and errors:
        db.rollback()
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"errors": errors})

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
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
    sub_collection: Optional[str] = None,
    collection_id: Optional[int] = None,
    category: Optional[str] = None,
    category_id: Optional[int] = None,
    is_featured: Optional[bool] = None,
    is_trending: Optional[bool] = None,
    is_best_seller: Optional[bool] = None,
    is_new_arrival: Optional[bool] = None,
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
        words = [w.strip() for w in search.split() if w.strip()]
        if len(words) > 1:
            for word in words:
                w_term = f"%{word}%"
                w_sku_subq = db.query(ProductVariant.product_id).filter(ProductVariant.sku.ilike(w_term)).subquery()
                w_cat_subq = db.query(Category.id).filter(Category.name.ilike(w_term)).subquery()
                w_col_subq = db.query(Collection.id).filter(Collection.name.ilike(w_term)).subquery()
                base_filters.append(or_(
                    Product.title.ilike(w_term),
                    Product.slug.ilike(w_term),
                    Product.collection.ilike(w_term),
                    Product.description.ilike(w_term),
                    Product.short_description.ilike(w_term),
                    cast(Product.tags, Text).ilike(w_term),
                    Product.id.in_(w_sku_subq),
                    Product.category_id.in_(w_cat_subq),
                    Product.collection_id.in_(w_col_subq),
                ))
        else:
            term = f"%{search.strip()}%"
            sku_subq = db.query(ProductVariant.product_id).filter(ProductVariant.sku.ilike(term)).subquery()
            cat_subq  = db.query(Category.id).filter(Category.name.ilike(term)).subquery()
            col_subq  = db.query(Collection.id).filter(Collection.name.ilike(term)).subquery()
            base_filters.append(or_(
                Product.title.ilike(term),
                Product.slug.ilike(term),
                Product.collection.ilike(term),
                Product.description.ilike(term),
                Product.short_description.ilike(term),
                cast(Product.tags, Text).ilike(term),
                Product.id.in_(sku_subq),
                Product.category_id.in_(cat_subq),
                Product.collection_id.in_(col_subq),
            ))
    if collection:
        # Check if collection name matches a normalized collection (Men, Women, Kids)
        col_db = db.query(Collection.id).filter(Collection.name.ilike(collection)).first()
        if col_db:
            base_filters.append(Product.collection_id == col_db.id)
        else:
            base_filters.append(Product.collection.ilike(f"%{collection}%"))
    if collection_id:
        base_filters.append(Product.collection_id == collection_id)
    if sub_collection:
        base_filters.append(Product.collection.ilike(f"%{sub_collection}%"))
    if category:
        cat_db = db.query(Category.id).filter(Category.name.ilike(category)).first()
        if cat_db:
            base_filters.append(Product.category_id == cat_db.id)
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

    if sort_by in ("price_asc", "price_desc"):
        min_price_sub = (
            db.query(sqla_func.min(ProductVariant.selling_price))
            .filter(ProductVariant.product_id == Product.id)
            .correlate(Product)
            .scalar_subquery()
        )
        order_clause = min_price_sub.asc() if sort_by == "price_asc" else min_price_sub.desc()
    else:
        order_clause = Product.created_at.desc()

    products = (
        db.query(Product)
        .options(selectinload(Product.variants))
        .filter(*base_filters)
        .order_by(order_clause)
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
    product = (
        db.query(Product)
        .options(selectinload(Product.variants))
        .filter(
            Product.slug == slug,
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
            .options(selectinload(Product.variants))
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