"""
app/modules/products/router.py

Product domain router — admin and storefront endpoints.
Thin layer: delegates all business logic to service functions,
adds audit logging to every admin write operation.
"""

import os
from typing import List, Optional

from fastapi import (
    APIRouter, Depends, File, Form, HTTPException,
    Query, Request, UploadFile, status,
)
from sqlalchemy.orm import Session

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

# ─────────────────────────────────────────────────────────────
# Image validation helpers (unchanged from original)
# ─────────────────────────────────────────────────────────────

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_SIZE     = 5 * 1024 * 1024  # 5 MB

MAGIC_BYTES: dict = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG":      "image/png",
    b"RIFF":         "image/webp",
}


def _validate_image_magic_bytes(header: bytes, declared_mime: str) -> None:
    if len(header) < 4:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "File is too small to be a valid image.")
    detected_mime = None
    for magic, mime in MAGIC_BYTES.items():
        if header[: len(magic)] == magic:
            detected_mime = mime
            break
    if not detected_mime:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "File content does not match any supported image format.")
    if detected_mime == "image/webp" and header[8:12] != b"WEBP":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "File has RIFF header but is not a valid WebP image.")


def _read_and_validate_upload(file: UploadFile) -> bytes:
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Only JPG, PNG, and WebP are allowed. Got: {file.content_type}",
        )
    ext = os.path.splitext(file.filename or "image.jpg")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Extension '{ext}' not allowed. Use: {', '.join(ALLOWED_EXTENSIONS)}",
        )
    _CHUNK = 65_536
    chunks: list = []
    total_bytes = 0
    while True:
        chunk = file.file.read(_CHUNK)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > MAX_IMAGE_SIZE:
            raise HTTPException(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                f"Image must be under {MAX_IMAGE_SIZE // (1024 * 1024)} MB.",
            )
        chunks.append(chunk)
    contents = b"".join(chunks)
    if not contents:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Uploaded file is empty.")
    _validate_image_magic_bytes(contents[:16], file.content_type)
    return contents


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
    db.commit()
    supabase_storage.delete_product_image(old_url)
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
    sub_collection: Optional[str]          = None,
    stock_status:   Optional[str]          = None,
    is_featured:    Optional[bool]         = None,
    is_trending:    Optional[bool]         = None,
    is_best_seller: Optional[bool]         = None,
    is_new_arrival: Optional[bool]         = None,
    page:    int = Query(1,  ge=1),
    per_page:int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    _:  Admin   = Depends(get_current_admin),
):
    return get_products_paginated(
        db, search=search, status_filter=status_filter,
        category_id=category_id, collection_id=collection_id,
        sub_collection=sub_collection, stock_status=stock_status,
        is_featured=is_featured, is_trending=is_trending,
        is_best_seller=is_best_seller, is_new_arrival=is_new_arrival,
        page=page, per_page=per_page,
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
    result = update_product(db, product_id, product_in)
    audit.updated(
        db=db, admin=current_admin,
        resource_type="product",
        resource_id=product_id,
        resource_label=result.title,
        after=product_in.model_dump(exclude_unset=True),
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

    image_url = supabase_storage.upload_product_image(
        contents=contents,
        original_filename=file.filename or "image.jpg",
        content_type=file.content_type,
        product_id=product_id,
    )

    field_name = IMAGE_TYPE_FIELDS.get(image_type)

    if image_type == "gallery":
        old_gallery  = list(product.gallery_images or [])
        new_gallery  = old_gallery + [image_url]
        product.gallery_images = new_gallery
        try:
            db.commit()
        except Exception:
            db.rollback()
            supabase_storage.delete_product_image(image_url)
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to update gallery.")
        db.refresh(product)
        audit.log(db=db, admin=current_admin, action="product.gallery_image_added",
                  resource_type="product", resource_id=product_id, request=request)
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
            supabase_storage.delete_product_image(image_url)
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to update product image.")
        if old_url and old_url != image_url:
            supabase_storage.delete_product_image(old_url)
        db.refresh(product)
        audit.log(db=db, admin=current_admin, action="product.image_uploaded",
                  resource_type="product", resource_id=product_id,
                  changes={"image_type": image_type}, request=request)
        db.commit()
        return {"id": product.id, "url": image_url, "image_type": image_type,
                "message": f"{image_type.replace('_', ' ').title()} image uploaded."}
    else:
        supabase_storage.delete_product_image(image_url)
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
    return {"message": "Gallery image removed.", "gallery_images": product.gallery_images}


# ─────────────────────────────────────────────────────────────
# STOREFRONT (public) endpoints
# ─────────────────────────────────────────────────────────────

@router.get("/", response_model=ProductListResponse)
def list_products_public(
    search:         str            = "",
    collection:     Optional[str]  = None,
    sub_collection: Optional[str]  = None,
    collection_id:  Optional[int]  = None,
    category:       Optional[str]  = None,
    category_id:    Optional[int]  = None,
    is_featured:    Optional[bool] = None,
    is_trending:    Optional[bool] = None,
    is_best_seller: Optional[bool] = None,
    is_new_arrival: Optional[bool] = None,
    min_price:      Optional[float]= None,
    max_price:      Optional[float]= None,
    sort_by:        str            = "newest",
    page:    int = Query(1,  ge=1),
    per_page:int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return get_products_public(
        db, search=search, collection=collection, sub_collection=sub_collection,
        collection_id=collection_id, category=category, category_id=category_id,
        is_featured=is_featured, is_trending=is_trending,
        is_best_seller=is_best_seller, is_new_arrival=is_new_arrival,
        min_price=min_price, max_price=max_price,
        sort_by=sort_by, page=page, per_page=per_page,
    )


@router.get("/slug/{slug}", response_model=ProductResponse)
def get_product_by_slug_endpoint(slug: str, db: Session = Depends(get_db)):
    return get_product_by_slug(db, slug)


@router.get("/slug/{slug}/related", response_model=List[ProductResponse])
def get_related_products_endpoint(
    slug:  str,
    limit: int     = Query(6, ge=1, le=12),
    db:    Session = Depends(get_db),
):
    product = get_product_by_slug(db, slug)
    return get_related_products(db, product, limit=limit)
