"""
app/modules/custom_products/router.py

HTTP router for the Custom Products domain.

DOMAIN BOUNDARY RULES (NON-NEGOTIABLE):
- This module MUST NOT import from app.modules.products.
- No shared schemas, services, or models with the products module.
- All category endpoints here manage custom_categories (not products.categories).
- Image uploads use the dedicated custom-product-images storage bucket.
"""

import logging
import os
from typing import List, Optional

from fastapi import (
    APIRouter, Depends, File, Form,
    HTTPException, Query, Request, UploadFile, status,
)
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.admins.models import Admin
from app.modules.audit.service import audit
from app.modules.auth.dependencies import get_current_admin
from app.modules.custom_products.schemas import (
    CustomCategoryCreate, CustomCategoryResponse, CustomCategoryUpdate,
    CustomProductBulkActionPayload, CustomProductCreate,
    CustomProductListResponse, CustomProductResponse, CustomProductUpdate,
)
from app.modules.custom_products.service import (
    bulk_action_custom_products,
    create_custom_category, create_custom_product,
    delete_custom_category, delete_custom_product,
    get_custom_categories, get_custom_category,
    get_custom_product, get_custom_product_orm,
    get_custom_products, get_public_custom_products,
    increment_custom_product_view_count,
    update_custom_category, update_custom_product,
)
from app.shared.storage import supabase_storage
from app.core.constants import MAX_CUSTOM_PRODUCT_IMAGES

logger = logging.getLogger(__name__)
router  = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# Image validation helpers — using centralized utility
# ─────────────────────────────────────────────────────────────────────────────

from app.shared.utils.image import validate_and_read_image

def _read_and_validate_upload(file: UploadFile) -> bytes:
    return validate_and_read_image(file)


# ─────────────────────────────────────────────────────────────────────────────
# CUSTOM CATEGORY endpoints
# Manage custom_categories — NOT products.categories.
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/admin/categories", response_model=List[CustomCategoryResponse])
def list_custom_categories_admin(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    _:  Admin   = Depends(get_current_admin),
):
    return get_custom_categories(db, status_filter=status_filter)


@router.get("/categories", response_model=List[CustomCategoryResponse])
def list_custom_categories_public(db: Session = Depends(get_db)):
    """Active custom categories for the storefront."""
    return get_custom_categories(db, status_filter="active")


@router.post("/admin/categories", response_model=CustomCategoryResponse,
             status_code=status.HTTP_201_CREATED)
def create_custom_category_endpoint(
    data:          CustomCategoryCreate,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    result = create_custom_category(db, data)
    audit.created(
        db=db, admin=current_admin,
        resource_type="custom_category",
        resource_id=result.id,
        resource_label=result.name,
        payload={"name": result.name},
        request=request,
    )
    db.commit()
    return result


@router.patch("/admin/categories/{custom_category_id}", response_model=CustomCategoryResponse)
def update_custom_category_endpoint(
   custom_category_id:   int,
    data:          CustomCategoryUpdate,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    result = update_custom_category(db, custom_category_id, data)
    audit.updated(
        db=db, admin=current_admin,
        resource_type="custom_category",
        resource_id=custom_category_id,
        resource_label=result.name,
        after=data.model_dump(exclude_unset=True),
        request=request,
    )
    db.commit()
    return result


@router.delete("/admin/categories/{custom_category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_custom_category_endpoint(
    custom_category_id:   int,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    cat      = get_custom_category(db, custom_category_id)
    cat_name = cat.name if hasattr(cat, "name") else str(custom_category_id)
    delete_custom_category(db, custom_category_id)
    audit.deleted(
        db=db, admin=current_admin,
        resource_type="custom_category",
        resource_id=custom_category_id,
        resource_label=cat_name,
        request=request,
    )
    db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN CUSTOM PRODUCT endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/admin/all", response_model=CustomProductListResponse)
def list_admin_custom_products(
    page:               int            = Query(1,  ge=1),
    per_page:           int            = Query(15, ge=1, le=100),
    search:             Optional[str]  = None,
    custom_category_id: Optional[int]  = None,
    status_filter:      Optional[str]  = None,
    db: Session = Depends(get_db),
    _:  Admin   = Depends(get_current_admin),
):
    try:
        return get_custom_products(
            db=db, page=page, per_page=per_page,
            search=search, custom_category_id=custom_category_id,
            status_filter=status_filter,
        )
    except Exception as e:
        logger.exception("Unexpected error in GET /custom-products/admin/all: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal database or server error: {str(e)}",
        )



@router.get("/admin/{product_id}", response_model=CustomProductResponse)
def get_custom_product_endpoint(
    product_id: int,
    db: Session = Depends(get_db),
    _:  Admin   = Depends(get_current_admin),
):
    return get_custom_product(db, product_id)


@router.post("/admin", response_model=CustomProductResponse,
             status_code=status.HTTP_201_CREATED)
def create_custom_product_endpoint(
    data:          CustomProductCreate,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    result = create_custom_product(db, data)
    audit.created(
        db=db, admin=current_admin,
        resource_type="custom_product",
        resource_id=result.id,
        resource_label=result.title,
        payload={"title": result.title, "status": result.status},
        request=request,
    )
    db.commit()
    return result


@router.patch("/admin/{product_id}", response_model=CustomProductResponse)
def update_custom_product_endpoint(
    product_id:    int,
    data:          CustomProductUpdate,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    result = update_custom_product(db, product_id, data)
    audit.updated(
        db=db, admin=current_admin,
        resource_type="custom_product",
        resource_id=product_id,
        resource_label=result.title,
        after=data.model_dump(exclude_unset=True),
        request=request,
    )
    db.commit()
    return result


@router.delete("/admin/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_custom_product_endpoint(
    product_id:    int,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    product = get_custom_product_orm(db, product_id)
    title   = product.title
    # Cleanup images from dedicated custom-product bucket before soft-delete
    for attr in ["thumbnail", "image_front", "image_back", "image_size_chart"]:
        url = getattr(product, attr, None)
        if url:
            try:
                supabase_storage.delete_custom_product_image(url)
            except Exception:
                pass
    for url in product.gallery_images or []:
        if url:
            try:
                supabase_storage.delete_custom_product_image(url)
            except Exception:
                pass
    delete_custom_product(db, product_id)
    audit.deleted(
        db=db, admin=current_admin,
        resource_type="custom_product",
        resource_id=product_id,
        resource_label=title,
        request=request,
    )
    db.commit()


@router.post("/admin/bulk-action")
def bulk_action_endpoint(
    payload:       CustomProductBulkActionPayload,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    result = bulk_action_custom_products(db, payload)
    audit.bulk(
        db=db, admin=current_admin,
        resource_type="custom_product",
        action_name=payload.action,
        ids=payload.product_ids,
        extra={"updated": result.get("updated"), "not_found": result.get("not_found")},
        request=request,
    )
    db.commit()
    return result


# ─────────────────────────────────────────────────────────────────────────────
# IMAGE UPLOAD — dedicated custom-product-images bucket
# ─────────────────────────────────────────────────────────────────────────────

_CP_IMAGE_TYPE_FIELDS = {
    "thumbnail":  "thumbnail",
    "front":      "image_front",
    "back":       "image_back",
    "size_chart": "image_size_chart",
}


@router.post("/admin/{product_id}/images")
def upload_custom_product_image(
    product_id:    int,
    request:       Request,
    file:          UploadFile = File(...),
    image_type:    str        = Form("thumbnail"),
    db:            Session    = Depends(get_db),
    current_admin: Admin      = Depends(get_current_admin),
):
    """Upload an image to the dedicated custom-product-images Supabase bucket."""
    product    = get_custom_product_orm(db, product_id)


    total_images = 0

    if product.thumbnail:
        total_images += 1

    if product.image_front:
        total_images += 1

    if product.image_back:
        total_images += 1

    if product.image_size_chart:
        total_images += 1

    total_images += len(product.gallery_images or [])

    # New image?
    is_new_upload = False

    if image_type == "gallery":
        is_new_upload = True

    elif image_type == "thumbnail" and not product.thumbnail:
        is_new_upload = True

    elif image_type == "front" and not product.image_front:
        is_new_upload = True

    elif image_type == "back" and not product.image_back:
        is_new_upload = True

    elif image_type == "size_chart" and not product.image_size_chart:
        is_new_upload = True

    if is_new_upload and total_images >= MAX_CUSTOM_PRODUCT_IMAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {MAX_CUSTOM_PRODUCT_IMAGES} images allowed per product."
        )
    contents   = _read_and_validate_upload(file)

    image_url  = supabase_storage.upload_custom_product_image(
        contents=contents,
        original_filename=file.filename or "image.jpg",
        content_type=file.content_type,
        product_id=product_id,
    )

    field_name = _CP_IMAGE_TYPE_FIELDS.get(image_type)

    if image_type == "gallery":
        product.gallery_images = list(product.gallery_images or []) + [image_url]
        try:
            db.commit()
        except Exception:
            db.rollback()
            supabase_storage.delete_custom_product_image(image_url)
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to update gallery.")
        db.refresh(product)
        audit.log(db=db, admin=current_admin, action="custom_product.gallery_image_added",
                  resource_type="custom_product", resource_id=product_id, request=request)
        db.commit()
        return {"id": product.id, "url": image_url, "image_type": "gallery",
                "gallery_images": product.gallery_images, "message": "Gallery image added."}

    elif field_name:
        old_url = getattr(product, field_name)
        setattr(product, field_name, image_url)
        if image_type == "front" and not product.thumbnail:
            product.thumbnail = image_url
        try:
            db.commit()
        except Exception:
            db.rollback()
            supabase_storage.delete_custom_product_image(image_url)
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                "Failed to update custom product image.")
        if old_url and old_url != image_url:
            try:
                supabase_storage.delete_custom_product_image(old_url)
            except Exception:
                pass
        db.refresh(product)
        audit.log(db=db, admin=current_admin, action="custom_product.image_uploaded",
                  resource_type="custom_product", resource_id=product_id,
                  changes={"image_type": image_type}, request=request)
        db.commit()
        return {"id": product.id, "url": image_url, "image_type": image_type,
                "message": f"{image_type.replace('_', ' ').title()} image uploaded."}

    else:
        supabase_storage.delete_custom_product_image(image_url)
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"Unknown image_type '{image_type}'. Use: thumbnail, front, back, size_chart, gallery.")


@router.delete("/admin/{product_id}/images/{image_type}")
def delete_custom_product_image_by_type(
    product_id:    int,
    image_type:    str,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    field_map = {
        "thumbnail":  "thumbnail",
        "front":      "image_front",
        "back":       "image_back",
        "size_chart": "image_size_chart",
    }
    if image_type not in field_map:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            f"Unknown image_type '{image_type}'. Use: thumbnail, front, back, size_chart.")
    product = get_custom_product_orm(db, product_id)
    field   = field_map[image_type]
    old_url = getattr(product, field)
    if not old_url:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Custom product has no {image_type} image.")
    setattr(product, field, None)
    db.commit()
    try:
        supabase_storage.delete_custom_product_image(old_url)
    except Exception:
        pass
    audit.log(db=db, admin=current_admin, action="custom_product.image_deleted",
              resource_type="custom_product", resource_id=product_id,
              changes={"image_type": image_type}, request=request)
    db.commit()
    return {"message": f"{image_type.replace('_', ' ').title()} image removed."}


@router.delete("/admin/{product_id}/images/gallery/{index}",
               status_code=status.HTTP_200_OK)
def delete_custom_product_gallery_image(
    product_id:    int,
    index:         int,
    request:       Request,
    db:            Session = Depends(get_db),
    current_admin: Admin   = Depends(get_current_admin),
):
    product = get_custom_product_orm(db, product_id)
    gallery = list(product.gallery_images or [])
    if index < 0 or index >= len(gallery):
        raise HTTPException(status.HTTP_404_NOT_FOUND,
                            f"Gallery image at index {index} not found.")
    old_url = gallery.pop(index)
    product.gallery_images = gallery
    db.commit()
    try:
        supabase_storage.delete_custom_product_image(old_url)
    except Exception:
        pass
    audit.log(db=db, admin=current_admin, action="custom_product.gallery_image_deleted",
              resource_type="custom_product", resource_id=product_id,
              changes={"index": index}, request=request)
    db.commit()
    return {"message": "Gallery image removed.", "gallery_images": product.gallery_images}


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC (STOREFRONT) endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=CustomProductListResponse)
def list_public_custom_products(
    page:               int           = Query(1,  ge=1),
    per_page:           int           = Query(15, ge=1, le=100),
    search:             Optional[str] = None,
    custom_category_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Published custom products for the storefront."""
    return get_public_custom_products(
        db=db, page=page, per_page=per_page,
        search=search, custom_category_id=custom_category_id,
    )

@router.get("/collections", response_model=list[str])
def list_custom_collections(
    db: Session = Depends(get_db),
):
    from app.modules.custom_products.models import CustomCategory

    rows = (
        db.query(CustomCategory.name)
        .filter(CustomCategory.status == "active")
        .order_by(CustomCategory.sort_order)
        .all()
    )

    return [r[0] for r in rows]


@router.get("/{product_id}", response_model=CustomProductResponse)
def get_public_custom_product(
    product_id: int,
    db: Session = Depends(get_db),
):
    """Single published custom product for the storefront."""
    product = get_custom_product(db, product_id)
    increment_custom_product_view_count(db, product_id)
    return product