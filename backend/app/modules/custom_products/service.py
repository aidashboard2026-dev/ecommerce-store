"""
app/modules/custom_products/service.py

Business logic for the Custom Products domain.

DOMAIN BOUNDARY RULES (NON-NEGOTIABLE):
- This module MUST NOT import from app.modules.products.
- All operations use CustomCategory and CustomProduct models exclusively.
- No shared business logic with the products module.
"""
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
from sqlalchemy import func as sqla_func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core.constants import MAX_CUSTOM_PRODUCTS_PER_CATEGORY
from app.modules.custom_products.models import (
    CustomCategory,
    CustomProduct,
    CustomProductStatus,
)
from app.modules.custom_products.schemas import (
    CustomCategoryCreate,
    CustomCategoryUpdate,
    CustomCategoryResponse,
    CustomProductCreate,
    CustomProductUpdate,
    CustomProductListResponse,
    CustomProductResponse,
    CustomProductBulkActionPayload,
)
from app.shared.normalization import (
    normalize_name,
    generate_slug,
)
from app.shared.normalization.exceptions import (
    ValidationError as NormalizationValidationError,
    ReservedWordError as NormalizationReservedWordError,
    AliasConflictError as NormalizationAliasConflictError,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Slug helpers (local to this module — no shared dependency with products)
# ─────────────────────────────────────────────────────────────────────────────

# (legacy _slugify removed; generate_slug used directly)



def _unique_category_slug(db: Session, base_slug: str, exclude_id: Optional[int] = None) -> str:
    """Find a unique slug for CustomCategory."""
    def free(candidate: str) -> bool:
        q = db.query(CustomCategory.id).filter(CustomCategory.slug == candidate)
        if exclude_id:
            q = q.filter(CustomCategory.id != exclude_id)
        return q.first() is None

    if free(base_slug):
        return base_slug
    for i in range(1, 100):
        c = f"{base_slug}-{i}"
        if free(c):
            return c
    return f"{base_slug}-{uuid.uuid4().hex[:6]}"


def _unique_product_slug(db: Session, base_slug: str, exclude_id: Optional[int] = None) -> str:
    """Find a unique slug for CustomProduct (excludes soft-deleted rows)."""
    def free(candidate: str) -> bool:
        q = db.query(CustomProduct.id).filter(
            CustomProduct.slug == candidate,
            CustomProduct.deleted_at.is_(None),
        )
        if exclude_id:
            q = q.filter(CustomProduct.id != exclude_id)
        return q.first() is None

    if free(base_slug):
        return base_slug
    for i in range(1, 100):
        c = f"{base_slug}-{i}"
        if free(c):
            return c
    return f"{base_slug}-{uuid.uuid4().hex[:6]}"


# ─────────────────────────────────────────────────────────────────────────────
# Custom Category CRUD
# These operate ONLY on custom_categories — never on products.categories.
# ─────────────────────────────────────────────────────────────────────────────

def get_custom_categories(
    db: Session,
    status_filter: Optional[str] = None,
) -> List[CustomCategoryResponse]:
    """Return all custom categories, optionally filtered by status."""
    q = db.query(CustomCategory)
    if status_filter:
        q = q.filter(CustomCategory.status == status_filter)
    rows = q.order_by(CustomCategory.sort_order, CustomCategory.name).all()
    return [CustomCategoryResponse.model_validate(r) for r in rows]


def get_custom_category(db: Session, custom_category_id: int) -> CustomCategory:
    """Fetch a single custom category by ID, raise 404 if not found."""
    cat = db.get(CustomCategory,custom_category_id)
    if not cat:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"Custom category {custom_category_id} not found.",
        )
    return cat


def create_custom_category(
    db: Session,
    data: CustomCategoryCreate,
) -> CustomCategoryResponse:
    """Create a new custom category, enforcing the MAX_CUSTOM_CATEGORIES limit."""
    from app.core.constants import MAX_CUSTOM_CATEGORIES

    current_count = db.query(sqla_func.count(CustomCategory.id)).scalar() or 0
    if current_count >= MAX_CUSTOM_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your current store configuration has reached the maximum allowed limit. Please contact the system administrator if you need additional categories or collections."
        )
    try:
        entity = normalize_name(data.name)
    except (NormalizationValidationError, NormalizationReservedWordError, NormalizationAliasConflictError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    slug = _unique_category_slug(db, entity.slug)
    cat = CustomCategory(
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
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Custom category name '{entity.canonical_name}' already exists.",
        )
    logger.info("Custom category created: id=%s name=%s", cat.id, cat.name)
    return CustomCategoryResponse.model_validate(cat)


def update_custom_category(
    db: Session,
    custom_category_id: int,
    data: CustomCategoryUpdate,
) -> CustomCategoryResponse:
    """Partially update a custom category."""
    cat = get_custom_category(db, custom_category_id)
    patch = data.model_dump(exclude_unset=True)

    if "name" in patch and patch["name"]:
        try:
            entity = normalize_name(patch["name"])
        except (NormalizationValidationError, NormalizationReservedWordError, NormalizationAliasConflictError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )
        patch["name"] = entity.canonical_name
        patch["slug"] = _unique_category_slug(
            db, entity.slug, exclude_id=custom_category_id
        )

    for k, v in patch.items():
        setattr(cat, k, v)

    try:
        db.commit()
        db.refresh(cat)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Custom category name already exists.",
        )
    logger.info("Custom category updated: id=%s", cat.id)
    return CustomCategoryResponse.model_validate(cat)



def delete_custom_category(db: Session, custom_category_id: int) -> None:
    """Delete a custom category. Products in this category will have category set to NULL."""
    cat = get_custom_category(db, custom_category_id)
    db.delete(cat)
    db.commit()
    logger.info("Custom category deleted: id=%s name=%s", custom_category_id, cat.name)


# ─────────────────────────────────────────────────────────────────────────────
# Custom Product CRUD
# ─────────────────────────────────────────────────────────────────────────────

def _build_product_response(
    p: CustomProduct,
    category_map: dict,
) -> CustomProductResponse:
    """Build a CustomProductResponse from an ORM object and a category name map."""
    return CustomProductResponse(
        id=p.id,
        title=p.title,
        slug=p.slug,
        description=p.description,
        short_description=p.short_description,
        custom_category_id=p.custom_category_id,
        custom_category_name=category_map.get(p.custom_category_id),
        tags=p.tags or [],
        sku=p.sku,
        status=p.status.value if hasattr(p.status, "value") else p.status,
        is_featured=p.is_featured,
        is_trending=p.is_trending,
        is_best_seller=p.is_best_seller,
        is_new_arrival=p.is_new_arrival,
        seo_title=p.seo_title,
        seo_description=p.seo_description,
        original_price_min=p.original_price_min,
        original_price_max=p.original_price_max,
        selling_price_min=p.selling_price_min,
        selling_price_max=p.selling_price_max,
        thumbnail=p.thumbnail,
        image_front=p.image_front,
        image_back=p.image_back,
        image_size_chart=p.image_size_chart,
        gallery_images=p.gallery_images or [],
        stock_quantity=p.stock_quantity or 0,
        view_count=p.view_count or 0,
        orders_count=p.orders_count or 0,
        sales_count=p.sales_count or 0,
        whatsapp_message=p.whatsapp_message,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


def _build_category_map(db: Session, products: List[CustomProduct]) -> dict:
    """Build a map of custom_category_id → category_name for a list of products."""
    cat_ids = {p.custom_category_id for p in products if p.custom_category_id}
    if not cat_ids:
        return {}
    cats = (
        db.query(CustomCategory.id, CustomCategory.name)
        .filter(CustomCategory.id.in_(cat_ids))
        .all()
    )
    return {c.id: c.name for c in cats}


def get_custom_product(db: Session, product_id: int) -> CustomProductResponse:
    """Fetch a single custom product by ID and return a response object."""
    product = (
        db.query(CustomProduct)
        .filter(
            CustomProduct.id == product_id,
            CustomProduct.deleted_at.is_(None),
        )
        .first()
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom product not found.",
        )
    category_map = _build_category_map(db, [product])
    return _build_product_response(product, category_map)


def get_custom_product_orm(db: Session, product_id: int) -> CustomProduct:
    """Fetch a single CustomProduct ORM object by ID (for internal use)."""
    product = (
        db.query(CustomProduct)
        .filter(
            CustomProduct.id == product_id,
            CustomProduct.deleted_at.is_(None),
        )
        .first()
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom product not found.",
        )
    return product


def get_custom_products(
    db: Session,
    page: int = 1,
    per_page: int = 15,
    search: Optional[str] = None,
    custom_category_id: Optional[int] = None,
    status_filter: Optional[str] = None,
) -> CustomProductListResponse:
    """Return a paginated list of custom products (admin view — all statuses)."""
    from app.core.constants import MAX_PAGE_SIZE
    per_page = min(max(per_page, 1), MAX_PAGE_SIZE)

    query = db.query(CustomProduct).filter(CustomProduct.deleted_at.is_(None))

    if search:
        from app.shared.normalization import get_search_terms
        search_terms = get_search_terms(search)
        for term in search_terms:
            w_term = f"%{term}%"
            query = query.filter(CustomProduct.title.ilike(w_term))

    if custom_category_id:
        query = query.filter(CustomProduct.custom_category_id == custom_category_id)

    if status_filter:
        query = query.filter(CustomProduct.status == status_filter)

    total = query.with_entities(sqla_func.count(CustomProduct.id)).scalar() or 0

    items = (
        query.order_by(CustomProduct.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    category_map = _build_category_map(db, items)
    response_items = [_build_product_response(p, category_map) for p in items]

    return CustomProductListResponse(
        items=response_items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=math.ceil(total / per_page) if total else 1,
    )


def get_public_custom_products(
    db: Session,
    page: int = 1,
    per_page: int = 15,
    search: Optional[str] = None,
    custom_category_id: Optional[int] = None,
) -> CustomProductListResponse:
    """Return a paginated list of published custom products (storefront view)."""
    from app.core.constants import MAX_PAGE_SIZE
    per_page = min(max(per_page, 1), MAX_PAGE_SIZE)

    query = (
        db.query(CustomProduct)
        .filter(
            CustomProduct.deleted_at.is_(None),
            CustomProduct.status == CustomProductStatus.published,
        )
    )

    if search:
        from app.shared.normalization import get_search_terms
        search_terms = get_search_terms(search)
        for term in search_terms:
            w_term = f"%{term}%"
            query = query.filter(CustomProduct.title.ilike(w_term))

    if custom_category_id:
        query = query.filter(CustomProduct.custom_category_id == custom_category_id)

    total = query.with_entities(sqla_func.count(CustomProduct.id)).scalar() or 0

    items = (
        query.order_by(CustomProduct.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    category_map = _build_category_map(db, items)
    response_items = [_build_product_response(p, category_map) for p in items]

    return CustomProductListResponse(
        items=response_items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=math.ceil(total / per_page) if total else 1,
    )


def create_custom_product(
    db: Session,
    data: CustomProductCreate,
) -> CustomProductResponse:
    """Create a new custom product inside a database transaction."""
    # Validate that the custom_category_id exists, if provided
    

    if data.custom_category_id is not None:
        get_custom_category(db, data.custom_category_id)

        current_products = (
            db.query(sqla_func.count(CustomProduct.id))
            .filter(
                CustomProduct.custom_category_id == data.custom_category_id,
                CustomProduct.deleted_at.is_(None),
            )
            .scalar()
            or 0
        )

        if current_products >= MAX_CUSTOM_PRODUCTS_PER_CATEGORY:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This category already contains the maximum of {MAX_CUSTOM_PRODUCTS_PER_CATEGORY} products."
            )

    try:
        base_slug = generate_slug(data.title)
    except (NormalizationValidationError, NormalizationReservedWordError, NormalizationAliasConflictError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    slug = _unique_product_slug(db, base_slug)

    product = CustomProduct(
        title=data.title,
        slug=slug,
        description=data.description,
        short_description=data.short_description,
        custom_category_id=data.custom_category_id,
        tags=data.tags or [],
        sku=data.sku,

        status=CustomProductStatus(data.status),

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

        thumbnail=data.thumbnail,
        image_front=data.image_front,
        image_back=data.image_back,
        image_size_chart=data.image_size_chart,
        gallery_images=data.gallery_images or [],

        stock_quantity=data.stock_quantity,

        whatsapp_message=data.whatsapp_message,
    )
    
 
    db.add(product)
    try:
        db.commit()
        db.refresh(product)
    except IntegrityError as exc:
        db.rollback()

        logger.exception("CREATE CUSTOM PRODUCT FAILED")
        print("=" * 80)
        print(exc)
        print(exc.orig)
        print("=" * 80)

        raise

    logger.info("Custom product created: id=%s title=%s", product.id, product.title)
    category_map = _build_category_map(db, [product])
    return _build_product_response(product, category_map)


def update_custom_product(
    db: Session,
    product_id: int,
    data: CustomProductUpdate,
) -> CustomProductResponse:
    """Partially update a custom product. Only provided fields are changed."""
    product = get_custom_product_orm(db, product_id)
    patch = data.model_dump(exclude_unset=True)

    # Validate custom category if being changed
    if "custom_category_id" in patch and patch["custom_category_id"] is not None:

        get_custom_category(db, patch["custom_category_id"])

        if patch["custom_category_id"] != product.custom_category_id:

            current_products = (
                db.query(sqla_func.count(CustomProduct.id))
                .filter(
                    CustomProduct.custom_category_id == patch["custom_category_id"],
                    CustomProduct.deleted_at.is_(None),
                    CustomProduct.id != product_id,
                )
                .scalar()
                or 0
            )

            if current_products >= MAX_CUSTOM_PRODUCTS_PER_CATEGORY:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"This category already contains the maximum of {MAX_CUSTOM_PRODUCTS_PER_CATEGORY} products."
                )

    # Regenerate slug if title changes
    if "title" in patch and patch["title"]:
        try:
            base_slug = generate_slug(patch["title"])
        except (NormalizationValidationError, NormalizationReservedWordError, NormalizationAliasConflictError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )
        patch["slug"] = _unique_product_slug(db, base_slug, exclude_id=product_id)

    # Coerce status to enum
    if "status" in patch and patch["status"]:
        patch["status"] = CustomProductStatus(patch["status"])

    for key, value in patch.items():
        setattr(product, key, value)

    try:
        db.commit()
        db.refresh(product)
    except IntegrityError as exc:
        db.rollback()
        if "sku" in str(exc).lower():
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "A custom product with this SKU already exists.",
            )
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Failed to update custom product.",
        )

    logger.info("Custom product updated: id=%s", product.id)
    category_map = _build_category_map(db, [product])
    return _build_product_response(product, category_map)


def delete_custom_product(db: Session, product_id: int) -> None:
    """Soft-delete a custom product by setting deleted_at."""
    from datetime import datetime, timezone
    product = get_custom_product_orm(db, product_id)
    product.deleted_at = datetime.now(timezone.utc)
    db.commit()
    logger.info("Custom product soft-deleted: id=%s", product_id)


def bulk_action_custom_products(
    db: Session,
    payload: CustomProductBulkActionPayload,
) -> dict:
    """Apply a bulk action to multiple custom products."""
    from datetime import datetime, timezone

    products = (
        db.query(CustomProduct)
        .filter(
            CustomProduct.id.in_(payload.product_ids),
            CustomProduct.deleted_at.is_(None),
        )
        .all()
    )

    if not products:
        raise NotFoundError("No matching custom products found.", code="CUSTOM_PRODUCT_NOT_FOUND")

    action = payload.action

    if action == "publish":
        for p in products:
            p.status = CustomProductStatus.published
    elif action == "unpublish":
        for p in products:
            p.status = CustomProductStatus.draft
    elif action == "archive":
        for p in products:
            p.status = CustomProductStatus.archived
    elif action == "delete":
        from app.shared.storage import supabase_storage
        for p in products:
            for attr in ["thumbnail", "image_front", "image_back", "image_size_chart"]:
                url = getattr(p, attr, None)
                if url:
                    try:
                        supabase_storage.delete_custom_product_image(url)
                    except Exception:
                        pass
            for url in p.gallery_images or []:
                if url:
                    try:
                        supabase_storage.delete_custom_product_image(url)
                    except Exception:
                        pass
        now = datetime.now(timezone.utc)
        for p in products:
            p.deleted_at = now
    elif action == "move_category":
        if payload.custom_category_id is None:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "custom_category_id is required for move_category action.",
            )
        # Validate category exists
        get_custom_category(db, payload.custom_category_id)
        for p in products:
            p.custom_category_id = payload.custom_category_id
    else:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Unknown action: {action}",
        )

    db.commit()
    logger.info(
        "Custom product bulk action: action=%s product_ids=%s",
        action, payload.product_ids,
    )
    return {"message": f"Bulk action '{action}' applied to {len(products)} custom products."}


def increment_custom_product_view_count(db: Session, product_id: int) -> None:
    """Increment the view counter for a custom product. Best-effort (no exception on failure)."""
    try:
        db.query(CustomProduct).filter(CustomProduct.id == product_id).update(
            {CustomProduct.view_count: CustomProduct.view_count + 1},
            synchronize_session=False,
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.warning("Failed to increment view count for custom product %s: %s", product_id, exc)


