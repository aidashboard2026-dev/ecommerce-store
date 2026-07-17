"""
app/modules/products/router.py

Product domain router — admin and storefront endpoints.
Thin layer: delegates all business logic to service functions,
adds audit logging to every admin write operation.
"""

import os
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

from fastapi import (
    APIRouter, Depends, File, Form, HTTPException,
    Query, Request, UploadFile, status,
)
from sqlalchemy.orm import Session

from app.core.constants import MAX_PAGE_SIZE
from app.core.database import get_db
from app.modules.admins.models import Admin
from app.modules.audit.service import audit
from app.modules.auth.dependencies import get_current_admin
from app.modules.products.models import Product, ProductStatus
from app.modules.products.schemas import (
    BulkActionPayload, BulkVariantCreate,
    CategoryCreate, CategoryResponse, CategoryUpdate,
    CollectionCreate, CollectionResponse, CollectionUpdate,
    ProductCreate, ProductListResponse, ProductResponse, ProductUpdate,
    VariantCreate, VariantUpdate,
    ColorOption,
)
from app.modules.products.service import (
    add_variant, add_variants_bulk, bulk_action,
    create_category, create_collection, create_product,
    delete_category, delete_collection, delete_variant,
    get_categories, get_category, get_collection, get_collections,
    get_product, get_product_by_slug, get_product_response,
    get_products_paginated, get_products_public, get_related_products,
    soft_delete_product, update_category, update_collection,
    update_product, update_variant,
)
from app.shared.storage import supabase_storage

router = APIRouter()

# ── Image validation helpers (using centralized utility) ─────────────────────

from app.shared.utils.image import validate_and_read_image

def _read_and_validate_upload(file: UploadFile) -> bytes:
    return validate_and_read_image(file)


# ─────────────────────────────────────────────────────────────
# CATEGORY endpoints
# ─────────────────────────────────────────────────────────────

@router.get("/admin/categories", response_model=List[CategoryResponse])
def list_categories(
    status_filter: Optional[str] = None,
    db:  Session = Depends(get_db),
    _:   Admin   = Depends(get_current_admin),
):
    return get_categories(db, status_filter=status_filter)


@router.get("/categories", response_model=List[CategoryResponse])
def list_categories_public(db: Session = Depends(get_db)):
    """Public endpoint — active categories for storefront nav."""
    return get_categories(db, status_filter="active")


@router.post("/admin/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category_endpoint(
    data:          CategoryCreate,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    result = create_category(db, data)
    audit.created(
        db=db, admin=current_admin,
        resource_type="product_category",
        resource_id=result.id,
        resource_label=result.name,
        payload={"name": result.name},
        request=request,
    )
    db.commit()
    return result


@router.patch("/admin/categories/{category_id}", response_model=CategoryResponse)
def update_category_endpoint(
    category_id:   int,
    data:          CategoryUpdate,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    result = update_category(db, category_id, data)
    audit.updated(
        db=db, admin=current_admin,
        resource_type="product_category",
        resource_id=category_id,
        resource_label=result.name,
        after=data.model_dump(exclude_unset=True),
        request=request,
    )
    db.commit()
    return result


@router.delete("/admin/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category_endpoint(
    category_id:   int,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    cat = get_category(db, category_id)
    cat_name = cat.name
    delete_category(db, category_id)
    audit.deleted(
        db=db, admin=current_admin,
        resource_type="product_category",
        resource_id=category_id,
        resource_label=cat_name,
        request=request,
    )
    db.commit()


# ─────────────────────────────────────────────────────────────
# COLLECTION endpoints
# ─────────────────────────────────────────────────────────────

@router.get("/admin/collections", response_model=List[CollectionResponse])
def list_collections(
    category_id:   Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    _:  Admin   = Depends(get_current_admin),
):
    return get_collections(db, category_id=category_id, status_filter=status_filter)


@router.get("/collections", response_model=List[CollectionResponse])
def list_collections_public(
    category_id: Optional[int] = None,
    db: Session  = Depends(get_db),
):
    return get_collections(db, category_id=category_id, status_filter="active")


@router.post("/admin/collections", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
def create_collection_endpoint(
    data:          CollectionCreate,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    result = create_collection(db, data)
    audit.created(
        db=db, admin=current_admin,
        resource_type="product_collection",
        resource_id=result.id,
        resource_label=result.name,
        payload={"name": result.name},
        request=request,
    )
    db.commit()
    return result


@router.patch("/admin/collections/{collection_id}", response_model=CollectionResponse)
def update_collection_endpoint(
    collection_id: int,
    data:          CollectionUpdate,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    result = update_collection(db, collection_id, data)
    audit.updated(
        db=db, admin=current_admin,
        resource_type="product_collection",
        resource_id=collection_id,
        resource_label=result.name,
        after=data.model_dump(exclude_unset=True),
        request=request,
    )
    db.commit()
    return result


@router.delete("/admin/collections/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection_endpoint(
    collection_id: int,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    col = get_collection(db, collection_id)
    col_name = col.name
    delete_collection(db, collection_id)
    audit.deleted(
        db=db, admin=current_admin,
        resource_type="product_collection",
        resource_id=collection_id,
        resource_label=col_name,
        request=request,
    )
    db.commit()


# ─────────────────────────────────────────────────────────────
# SUB-COLLECTION endpoints
# ─────────────────────────────────────────────────────────────

from pydantic import BaseModel, field_validator




# ─────────────────────────────────────────────────────────────
# Image delete — registered before /{product_id} to avoid routing conflict
# ─────────────────────────────────────────────────────────────

@router.delete("/admin/{product_id}/images/{image_type}")
def delete_product_image_by_type(
    product_id:    int,
    image_type:    str,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    """Remove a named image from a product. image_type: thumbnail | front | back | size_chart"""
    field_map = {
        "thumbnail":  "thumbnail",
        "front":      "image_front",
        "back":       "image_back",
        "size_chart": "image_size_chart",
    }
    if image_type not in field_map:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Unknown image_type '{image_type}'. Use: thumbnail, front, back, size_chart.",
        )
    product  = get_product(db, product_id)
    field    = field_map[image_type]
    old_url  = getattr(product, field)
    if not old_url:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Product has no {image_type} image.")
    setattr(product, field, None)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Database transaction failed: {str(e)}")

    try:
        supabase_storage.delete_product_image(old_url)
    except Exception as exc:
        logger.warning(f"Could not delete image from storage: {exc}")

    db.refresh(product)
    audit.log(
        db=db, admin=current_admin,
        action="product.image_deleted",
        resource_type="product",
        resource_id=product_id,
        resource_label=product.title,
        changes={"image_type": image_type},
        request=request,
    )
    db.commit()
    return {"message": f"{image_type.replace('_', ' ').title()} image removed."}


# ─────────────────────────────────────────────────────────────
# ADMIN PRODUCT endpoints
# ─────────────────────────────────────────────────────────────

@router.get("/admin/all", response_model=ProductListResponse)
def list_products_admin(
    search:         str                    = "",
    status_filter:  Optional[ProductStatus]= None,
    category_id:    Optional[int]          = None,
    collection_id:  Optional[int]          = None,
    genders:        Optional[List[str]]    = Query(None),
    stock_status:   Optional[str]          = None,
    is_featured:    Optional[bool]         = None,
    is_trending:    Optional[bool]         = None,
    is_best_seller: Optional[bool]         = None,
    is_new_arrival: Optional[bool]         = None,
    # ── Price range ─────────────────────────────────────────────────────────
    min_price:      Optional[float]        = None,
    max_price:      Optional[float]        = None,
    # ── Date range ──────────────────────────────────────────────────────────
    created_after:  Optional[str]          = None,   # ISO-8601 date string
    created_before: Optional[str]          = None,
    updated_after:  Optional[str]          = None,
    updated_before: Optional[str]          = None,
    # ── Sorting ─────────────────────────────────────────────────────────────
    sort_by:        Optional[str]          = None,   # newest|oldest|alpha_asc|updated
    page:    int = Query(1,  ge=1),
    per_page:int = Query(15, ge=1, le=MAX_PAGE_SIZE),
    db: Session = Depends(get_db),
    _:  Admin   = Depends(get_current_admin),
):
    from datetime import datetime, timezone

    def _parse_dt(s: Optional[str]) -> Optional[datetime]:
        """Parse an ISO-8601 date/datetime string; return None on any error."""
        if not s:
            return None
        try:
            # Accept both date-only ("2024-01-01") and full datetime strings
            if "T" not in s and " " not in s:
                s = s + "T00:00:00"
            return datetime.fromisoformat(s).replace(tzinfo=timezone.utc)
        except (ValueError, AttributeError):
            return None

    return get_products_paginated(
        db,
        search=search,
        status_filter=status_filter,
        category_id=category_id,
        collection_id=collection_id,
        genders=genders,
        stock_status=stock_status,
        is_featured=is_featured,
        is_trending=is_trending,
        is_best_seller=is_best_seller,
        is_new_arrival=is_new_arrival,
        min_price=min_price,
        max_price=max_price,
        created_after=_parse_dt(created_after),
        created_before=_parse_dt(created_before),
        updated_after=_parse_dt(updated_after),
        updated_before=_parse_dt(updated_before),
        sort_by=sort_by,
        page=page,
        per_page=per_page,
    )


@router.post("/admin", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_new_product(
    product_in:    ProductCreate,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    result = create_product(db, product_in)
    audit.created(
        db=db, admin=current_admin,
        resource_type="product",
        resource_id=result.id,
        resource_label=result.title,
        payload={"title": result.title, "status": result.status},
        request=request,
    )
    db.commit()
    return result


@router.get("/admin/{product_id}", response_model=ProductResponse)
def get_product_by_id(
    product_id: int,
    db: Session = Depends(get_db),
    _:  Admin   = Depends(get_current_admin),
):
    return get_product_response(db, product_id)


@router.patch("/admin/{product_id}", response_model=ProductResponse)
def update_product_by_id(
    product_id:    int,
    product_in:    ProductUpdate,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    # Fetch existing genders for audit diff
    product = get_product(db, product_id)
    old_genders = [g.gender for g in product.genders_rel]

    result = update_product(db, product_id, product_in)
    
    # Construct audit changes
    before = {}
    after = product_in.model_dump(exclude_unset=True)
    if "genders" in after:
        before["genders"] = old_genders
        new_genders = after["genders"]
        added = sorted(list(set(new_genders) - set(old_genders)))
        removed = sorted(list(set(old_genders) - set(new_genders)))
        if added:
            after["genders_added"] = added
        if removed:
            after["genders_removed"] = removed

    audit.updated(
        db=db, admin=current_admin,
        resource_type="product",
        resource_id=product_id,
        resource_label=result.title,
        before=before,
        after=after,
        request=request,
    )
    db.commit()
    return result


@router.delete("/admin/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product_by_id(
    product_id:    int,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    product = get_product(db, product_id)
    title   = product.title
    # Clean up images from storage before soft-deleting
    for attr in ["thumbnail", "image_front", "image_back", "image_size_chart"]:
        url = getattr(product, attr)
        if url:
            try:
                supabase_storage.delete_product_image(url)
            except Exception:
                pass
    for url in product.gallery_images or []:
        if url:
            try:
                supabase_storage.delete_product_image(url)
            except Exception:
                pass
    soft_delete_product(db, product_id)
    audit.deleted(
        db=db, admin=current_admin,
        resource_type="product",
        resource_id=product_id,
        resource_label=title,
        request=request,
    )
    db.commit()


# ─────────────────────────────────────────────────────────────
# BULK ACTIONS
# ─────────────────────────────────────────────────────────────

@router.post("/admin/bulk-action")
def bulk_action_endpoint(
    payload:       BulkActionPayload,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    result = bulk_action(db, payload)
    audit.bulk(
        db=db, admin=current_admin,
        resource_type="product",
        action_name=payload.action,
        ids=payload.product_ids,
        extra={"updated": result.get("updated"), "not_found": result.get("not_found")},
        request=request,
    )
    db.commit()
    return result


# ─────────────────────────────────────────────────────────────
# VARIANT endpoints
# ─────────────────────────────────────────────────────────────

@router.post("/admin/{product_id}/variants", response_model=ProductResponse)
def add_variant_endpoint(
    product_id:    int,
    variant_in:    VariantCreate,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    result = add_variant(db, product_id, variant_in)
    audit.log(
        db=db, admin=current_admin,
        action="product.variant_added",
        resource_type="product",
        resource_id=product_id,
        changes={"size": variant_in.size, "color": variant_in.color},
        request=request,
    )
    db.commit()
    return result


@router.post("/admin/{product_id}/variants/bulk", response_model=ProductResponse)
def add_variants_bulk_endpoint(
    product_id:    int,
    payload:       BulkVariantCreate,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    result = add_variants_bulk(db, product_id, payload.variants)
    audit.log(
        db=db, admin=current_admin,
        action="product.variants_bulk_added",
        resource_type="product",
        resource_id=product_id,
        changes={"count": len(payload.variants)},
        request=request,
    )
    db.commit()
    return result


@router.delete("/admin/{product_id}/variants/{variant_id}", response_model=ProductResponse)
def delete_variant_endpoint(
    product_id:    int,
    variant_id:    int,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    result = delete_variant(db, product_id, variant_id)
    audit.log(
        db=db, admin=current_admin,
        action="product.variant_deleted",
        resource_type="product",
        resource_id=product_id,
        changes={"variant_id": variant_id},
        request=request,
    )
    db.commit()
    return result


@router.patch("/admin/{product_id}/variants/{variant_id}", response_model=ProductResponse)
def update_variant_endpoint(
    product_id:    int,
    variant_id:    int,
    data:          VariantUpdate,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    result = update_variant(db, product_id, variant_id, data)
    audit.log(
        db=db, admin=current_admin,
        action="product.variant_updated",
        resource_type="product",
        resource_id=product_id,
        changes={"variant_id": variant_id, **data.model_dump(exclude_unset=True)},
        request=request,
    )
    db.commit()
    return result


# ─────────────────────────────────────────────────────────────
# IMAGE UPLOAD
# ─────────────────────────────────────────────────────────────

IMAGE_TYPE_FIELDS = {
    "thumbnail":  "thumbnail",
    "front":      "image_front",
    "back":       "image_back",
    "size_chart": "image_size_chart",
}


@router.post("/admin/{product_id}/images")
def upload_product_image(
    product_id:    int,
    request:       Request,
    file:          UploadFile = File(...),
    image_type:    str        = Form("thumbnail"),
    set_as_primary:str        = Form("true"),
    db:            Session    = Depends(get_db),
    current_admin: Admin      = Depends(get_current_admin),
):
    product   = get_product(db, product_id)
    contents  = _read_and_validate_upload(file)

    # Validate image limit
    from app.core.constants import MAX_PRODUCT_IMAGES
    current_images = sum(1 for attr in ["thumbnail", "image_front", "image_back", "image_size_chart"] if getattr(product, attr)) + len(product.gallery_images or [])
    will_increase = False
    if image_type == "gallery":
        will_increase = True
    elif image_type in ["thumbnail", "front", "back", "size_chart"]:
        field_name = IMAGE_TYPE_FIELDS.get(image_type)
        if field_name and not getattr(product, field_name):
            will_increase = True

    if will_increase and current_images >= MAX_PRODUCT_IMAGES:
        logger.warning(f"Attempted to upload {current_images + 1}th product image")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You have reached the maximum allowed limit of {MAX_PRODUCT_IMAGES} images for this product. Please delete an existing image before uploading another."
        )

    # Retrieve and validate category/product slugs
    category_slug = None
    if product.category:
        category_slug = product.category.slug
    if not category_slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product does not have a category or category slug assigned. Please assign a category before uploading images."
        )

    product_slug = product.slug
    if not product_slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product does not have a slug generated. Please save the product with a valid slug before uploading images."
        )

    try:
        image_url = supabase_storage.upload_product_image(
            contents=contents,
            original_filename=file.filename or "image.jpg",
            content_type=file.content_type,
            product_id=product_id,
            category_slug=category_slug,
            product_slug=product_slug,
            image_type=image_type,
        )
    except Exception as exc:
        logger.error(f"Storage upload failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Storage upload failed: {str(exc)}"
        )

    field_name = IMAGE_TYPE_FIELDS.get(image_type)

    if image_type == "gallery":
        old_gallery  = list(product.gallery_images or [])
        new_gallery  = old_gallery + [image_url]
        product.gallery_images = new_gallery
        try:
            db.commit()
            db.refresh(product)
            audit.log(db=db, admin=current_admin, action="product.gallery_image_added",
                      resource_type="product", resource_id=product_id, request=request)
            db.commit()
        except Exception as e:
            db.rollback()
            try:
                supabase_storage.delete_product_image(image_url)
            except Exception:
                pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database update failed. Image was discarded: {str(e)}"
            )
        resolved_url = supabase_storage.get_product_image_url(image_url)
        return {"id": product.id, "url": resolved_url, "image_type": "gallery",
                "gallery_images": [supabase_storage.get_product_image_url(img) for img in product.gallery_images], "message": "Gallery image added."}

    elif field_name:
        old_url = getattr(product, field_name)
        setattr(product, field_name, image_url)
        if image_type == "front" and not product.thumbnail:
            product.thumbnail = image_url
        try:
            db.commit()
            if old_url and old_url != image_url:
                try:
                    supabase_storage.delete_product_image(old_url)
                except Exception:
                    pass
            db.refresh(product)
            audit.log(db=db, admin=current_admin, action="product.image_uploaded",
                      resource_type="product", resource_id=product_id,
                      changes={"image_type": image_type}, request=request)
            db.commit()
        except Exception as e:
            db.rollback()
            try:
                supabase_storage.delete_product_image(image_url)
            except Exception:
                pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database update failed. Image was discarded: {str(e)}"
            )
        resolved_url = supabase_storage.get_product_image_url(image_url)
        return {"id": product.id, "url": resolved_url, "image_type": image_type,
                "message": f"{image_type.replace('_', ' ').title()} image uploaded."}
    else:
        try:
            supabase_storage.delete_product_image(image_url)
        except Exception:
            pass
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Unknown image_type '{image_type}'. Use: thumbnail, front, back, size_chart, gallery.",
        )





@router.delete("/admin/{product_id}/images/gallery/{index}", status_code=status.HTTP_200_OK)
def delete_gallery_image(
    product_id:    int,
    index:         int,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    product = get_product(db, product_id)
    gallery = list(product.gallery_images or [])
    if index < 0 or index >= len(gallery):
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Gallery image at index {index} not found.")
    old_url = gallery.pop(index)
    product.gallery_images = gallery
    db.commit()
    supabase_storage.delete_product_image(old_url)
    audit.log(db=db, admin=current_admin, action="product.gallery_image_deleted",
              resource_type="product", resource_id=product_id,
              changes={"index": index}, request=request)
    db.commit()
    return {"message": "Gallery image removed.", "gallery_images": [supabase_storage.get_product_image_url(img) for img in product.gallery_images]}


# ─────────────────────────────────────────────────────────────
# STOREFRONT (public) endpoints
# ─────────────────────────────────────────────────────────────

@router.get("/", response_model=ProductListResponse)
def list_products_public(
    search:         str            = "",
    collection:     Optional[str]  = None,
    genders:        Optional[List[str]] = Query(None),
    collection_id:  Optional[int]  = None,
    category:       Optional[str]  = None,
    category_id:    Optional[int]  = None,
    is_featured:    Optional[bool] = None,
    is_trending:    Optional[bool] = None,
    is_best_seller: Optional[bool] = None,
    is_new_arrival: Optional[bool] = None,
    min_price:      Optional[float]= None,
    max_price:      Optional[float]= None,
    on_offer:       Optional[bool] = None,
    sort_by:        str            = "newest",
    page:    int = Query(1,  ge=1),
    per_page:int = Query(12, ge=1, le=MAX_PAGE_SIZE),
    db: Session = Depends(get_db),
):
    return get_products_public(
        db, search=search, collection=collection, genders=genders,
        collection_id=collection_id, category=category, category_id=category_id,
        is_featured=is_featured, is_trending=is_trending,
        is_best_seller=is_best_seller, is_new_arrival=is_new_arrival,
        min_price=min_price, max_price=max_price, on_offer=on_offer,
        sort_by=sort_by, page=page, per_page=per_page,
    )


@router.get("/slug/{slug}", response_model=ProductResponse)
def get_product_by_slug_endpoint(slug: str, db: Session = Depends(get_db)):
    return get_product_by_slug(db, slug)


@router.get("/id/{product_id}", response_model=ProductResponse)
def get_product_by_id_public(product_id: int, db: Session = Depends(get_db)):
    """Public endpoint to fetch a product by ID, e.g. for legacy redirects."""
    return get_product_response(db, product_id)


@router.get("/slug/{slug}/related", response_model=List[ProductResponse])
def get_related_products_endpoint(
    slug:  str,
    limit: int     = Query(6, ge=1, le=12),
    db:    Session = Depends(get_db),
):
    product = get_product_by_slug(db, slug)
    return get_related_products(db, product, limit=limit)


@router.get("/colors", response_model=List[ColorOption])
def get_colors():
    return [
        {"name": "Black", "hex": "#000000"},
        {"name": "White", "hex": "#FFFFFF"},
        {"name": "Red", "hex": "#FF0000"},
        {"name": "Blue", "hex": "#0000FF"},
        {"name": "Green", "hex": "#008000"},
        {"name": "Yellow", "hex": "#FFFF00"},
        {"name": "Orange", "hex": "#FFA500"},
        {"name": "Purple", "hex": "#800080"},
        {"name": "Pink", "hex": "#FFC0CB"},
        {"name": "Grey", "hex": "#808080"},
        {"name": "Gray", "hex": "#808080"},
        {"name": "Brown", "hex": "#A52A2A"},
        {"name": "Navy", "hex": "#000080"},
        {"name": "Sky Blue", "hex": "#87CEEB"},
        {"name": "Maroon", "hex": "#800000"},
        {"name": "Olive", "hex": "#808000"},
        {"name": "Teal", "hex": "#008080"},
        {"name": "Beige", "hex": "#F5F5DC"},
        {"name": "Cream", "hex": "#FFFDD0"},
        {"name": "Gold", "hex": "#FFD700"},
        {"name": "Silver", "hex": "#C0C0C0"}
    ]

