"""
app/api/v1/endpoints/products.py
Extended product API with categories, collections, enhanced image upload,
bulk actions, and updated admin/storefront filters.
"""

import os
from typing import Optional, List

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.modules.auth.dependencies import get_current_admin
from app.core.database import get_db
from app.modules.admins.models import Admin
from app.modules.products.models import Product, ProductStatus
from app.modules.products.schemas import (
    BulkActionPayload,
    BulkVariantCreate,
    CategoryCreate, CategoryUpdate, CategoryResponse,
    CollectionCreate, CollectionUpdate, CollectionResponse,
    ProductCreate, ProductListResponse, ProductResponse, ProductUpdate,
    VariantCreate, VariantUpdate,
)
from app.shared.storage import supabase_storage
from app.modules.products.service import (
    # Category
    get_categories, get_category, create_category, update_category, delete_category,
    # Collection
    get_collections, get_collection, create_collection, update_collection, delete_collection,
    # Product
    add_variant, add_variants_bulk, bulk_action,
    create_product, delete_variant, get_product, get_product_response,
    get_products_paginated, get_related_products, increment_view_count,
    soft_delete_product, update_product, update_variant,
    # Storefront
    get_products_public, get_product_by_slug,
)

router = APIRouter()

# ─────────────────────────────────────────────────────────────
# Image validation helpers
# ─────────────────────────────────────────────────────────────

ALLOWED_MIME_TYPES  = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS  = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_SIZE      = 5 * 1024 * 1024  # 5 MB

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
        if header[:len(magic)] == magic:
            detected_mime = mime
            break
    if not detected_mime:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "File content does not match any supported image format.")
    if detected_mime == "image/webp":
        if header[8:12] != b"WEBP":
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "File has RIFF header but is not a valid WebP image.")


def _read_and_validate_upload(file: UploadFile) -> bytes:
    """Read upload, validate MIME, extension, size, and magic bytes. Returns raw bytes."""
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
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return get_categories(db, status_filter=status_filter)


@router.get("/categories", response_model=List[CategoryResponse])
def list_categories_public(
    db: Session = Depends(get_db),
):
    """Public endpoint — returns active categories for storefront nav."""
    return get_categories(db, status_filter="active")


@router.post("/admin/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category_endpoint(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return create_category(db, data)


@router.patch("/admin/categories/{category_id}", response_model=CategoryResponse)
def update_category_endpoint(
    category_id: int,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return update_category(db, category_id, data)


@router.delete("/admin/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category_endpoint(
    category_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    delete_category(db, category_id)


# ─────────────────────────────────────────────────────────────
# COLLECTION endpoints
# ─────────────────────────────────────────────────────────────

@router.get("/admin/collections", response_model=List[CollectionResponse])
def list_collections(
    category_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return get_collections(db, category_id=category_id, status_filter=status_filter)


@router.get("/collections", response_model=List[CollectionResponse])
def list_collections_public(
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Public endpoint for storefront collection listing."""
    return get_collections(db, category_id=category_id, status_filter="active")


@router.post("/admin/collections", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
def create_collection_endpoint(
    data: CollectionCreate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return create_collection(db, data)


@router.patch("/admin/collections/{collection_id}", response_model=CollectionResponse)
def update_collection_endpoint(
    collection_id: int,
    data: CollectionUpdate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return update_collection(db, collection_id, data)


@router.delete("/admin/collections/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection_endpoint(
    collection_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    delete_collection(db, collection_id)


# ─────────────────────────────────────────────────────────────
# Image delete — must be registered before /{product_id}
# ─────────────────────────────────────────────────────────────

@router.delete("/admin/{product_id}/images/{image_type}")
def delete_product_image_by_type(
    product_id: int,
    image_type: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    Remove a named image from a product by type.
    image_type: thumbnail | front | back | size_chart
    For gallery images use DELETE /admin/{product_id}/images/gallery/{index}
    """
    field_map = {
        "thumbnail":   "thumbnail",
        "front":       "image_front",
        "back":        "image_back",
        "size_chart":  "image_size_chart",
    }
    if image_type not in field_map:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Unknown image_type '{image_type}'. Use: thumbnail, front, back, size_chart, or gallery/<index>."
        )
    product = get_product(db, product_id)
    field = field_map[image_type]
    old_url = getattr(product, field)
    if not old_url:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Product has no {image_type} image.")
    setattr(product, field, None)
    db.commit()
    supabase_storage.delete_product_image(old_url)
    return {"message": f"{image_type.replace('_', ' ').title()} image removed."}


# ─────────────────────────────────────────────────────────────
# ADMIN PRODUCT endpoints
# ─────────────────────────────────────────────────────────────

@router.get("/admin/all", response_model=ProductListResponse)
def list_products_admin(
    search: str = "",
    status_filter: Optional[ProductStatus] = None,
    category_id: Optional[int] = None,
    collection_id: Optional[int] = None,
    sub_collection: Optional[str] = None,
    stock_status: Optional[str] = None,
    is_featured: Optional[bool] = None,
    is_trending: Optional[bool] = None,
    is_best_seller: Optional[bool] = None,
    is_new_arrival: Optional[bool] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return get_products_paginated(
        db,
        search=search,
        status_filter=status_filter,
        category_id=category_id,
        collection_id=collection_id,
        sub_collection=sub_collection,
        stock_status=stock_status,
        is_featured=is_featured,
        is_trending=is_trending,
        is_best_seller=is_best_seller,
        is_new_arrival=is_new_arrival,
        page=page,
        per_page=per_page,
    )


@router.post("/admin", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_new_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return create_product(db, product_in)


@router.get("/admin/{product_id}", response_model=ProductResponse)
def get_product_by_id(
    product_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return get_product_response(db, product_id)


@router.patch("/admin/{product_id}", response_model=ProductResponse)
def update_product_by_id(
    product_id: int,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return update_product(db, product_id, product_in)


@router.delete("/admin/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product_by_id(
    product_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    product = get_product(db, product_id)
    for img_attr in ["thumbnail", "image_front", "image_back", "image_size_chart"]:
        img_url = getattr(product, img_attr)
        if img_url:
            try:
                supabase_storage.delete_product_image(img_url)
            except Exception:
                pass
    if product.gallery_images:
        for img_url in product.gallery_images:
            if img_url:
                try:
                    supabase_storage.delete_product_image(img_url)
                except Exception:
                    pass
    soft_delete_product(db, product_id)


# ─────────────────────────────────────────────────────────────
# BULK ACTIONS
# ─────────────────────────────────────────────────────────────

@router.post("/admin/bulk-action")
def bulk_action_endpoint(
    payload: BulkActionPayload,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return bulk_action(db, payload)


# ─────────────────────────────────────────────────────────────
# VARIANT endpoints
# ─────────────────────────────────────────────────────────────

@router.post("/admin/{product_id}/variants", response_model=ProductResponse)
def add_variant_endpoint(
    product_id: int,
    variant_in: VariantCreate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return add_variant(db, product_id, variant_in)


@router.post("/admin/{product_id}/variants/bulk", response_model=ProductResponse)
def add_variants_bulk_endpoint(
    product_id: int,
    payload: BulkVariantCreate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return add_variants_bulk(db, product_id, payload.variants)


@router.delete("/admin/{product_id}/variants/{variant_id}", response_model=ProductResponse)
def delete_variant_endpoint(
    product_id: int,
    variant_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return delete_variant(db, product_id, variant_id)


@router.patch("/admin/{product_id}/variants/{variant_id}", response_model=ProductResponse)
def update_variant_endpoint(
    product_id: int,
    variant_id: int,
    data: VariantUpdate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Partially update an existing variant — send only the fields you want to change."""
    return update_variant(db, product_id, variant_id, data)


# ─────────────────────────────────────────────────────────────
# IMAGE UPLOAD — multi-type support
# ─────────────────────────────────────────────────────────────

IMAGE_TYPE_FIELDS = {
    "thumbnail":   "thumbnail",
    "front":       "image_front",
    "back":        "image_back",
    "size_chart":  "image_size_chart",
}


@router.post("/admin/{product_id}/images")
def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    image_type: str = Form("thumbnail"),   # thumbnail | front | back | size_chart | gallery
    set_as_primary: str = Form("true"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    Upload an image for a product.
    image_type: "thumbnail" (default), "front", "back", "size_chart", or "gallery"
    Gallery images are appended to the product.gallery_images JSON list.
    All others replace the corresponding URL column.
    """
    product = get_product(db, product_id)
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found.")

    contents = _read_and_validate_upload(file)

    image_url = supabase_storage.upload_product_image(
        contents=contents,
        original_filename=file.filename or "image.jpg",
        content_type=file.content_type,
        product_id=product_id,
    )

    field_name = IMAGE_TYPE_FIELDS.get(image_type)

    if image_type == "gallery":
        old_gallery = list(product.gallery_images or [])
        new_gallery = old_gallery + [image_url]
        product.gallery_images = new_gallery
        try:
            db.commit()
        except Exception:
            db.rollback()
            supabase_storage.delete_product_image(image_url)
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to update gallery.")
        db.refresh(product)
        return {"id": product.id, "url": image_url, "image_type": "gallery",
                "gallery_images": product.gallery_images, "message": "Gallery image added."}

    elif field_name:
        old_url = getattr(product, field_name)
        setattr(product, field_name, image_url)
        # Also set thumbnail from front image if no thumbnail yet
        if image_type == "front" and not product.thumbnail:
            product.thumbnail = image_url
        try:
            db.commit()
        except Exception:
            db.rollback()
            supabase_storage.delete_product_image(image_url)
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to update product image.")
        # Cleanup old image
        if old_url and old_url != image_url:
            supabase_storage.delete_product_image(old_url)
        db.refresh(product)
        return {
            "id": product.id,
            "url": image_url,
            "image_type": image_type,
            "message": f"{image_type.replace('_', ' ').title()} image uploaded.",
        }
    else:
        supabase_storage.delete_product_image(image_url)
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Unknown image_type '{image_type}'. Use: thumbnail, front, back, size_chart, gallery.",
        )


@router.delete("/admin/{product_id}/images/gallery/{index}", status_code=status.HTTP_200_OK)
def delete_gallery_image(
    product_id: int,
    index: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Remove a gallery image by its position index."""
    product = get_product(db, product_id)
    gallery = list(product.gallery_images or [])
    if index < 0 or index >= len(gallery):
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Gallery image at index {index} not found.")
    old_url = gallery.pop(index)
    product.gallery_images = gallery
    db.commit()
    supabase_storage.delete_product_image(old_url)
    return {"message": "Gallery image removed.", "gallery_images": product.gallery_images}


# ─────────────────────────────────────────────────────────────
# STOREFRONT (public) endpoints
# ─────────────────────────────────────────────────────────────
@router.get("/", response_model=ProductListResponse)
def list_products_public(
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
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: str = "newest",
    page: int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return get_products_public(
        db,
        search=search,
        collection=collection,
        sub_collection=sub_collection,
        collection_id=collection_id,
        category=category,
        category_id=category_id,
        is_featured=is_featured,
        is_trending=is_trending,
        is_best_seller=is_best_seller,
        is_new_arrival=is_new_arrival,
        min_price=min_price,
        max_price=max_price,
        sort_by=sort_by,
        page=page,
        per_page=per_page,
    )


@router.get("/slug/{slug}", response_model=ProductResponse)
def get_product_by_slug_endpoint(
    slug: str,
    db: Session = Depends(get_db),
):
    return get_product_by_slug(db, slug)


@router.get("/slug/{slug}/related", response_model=List[ProductResponse])
def get_related_products_endpoint(
    slug: str,
    limit: int = Query(6, ge=1, le=12),
    db: Session = Depends(get_db),
):
    product = get_product_by_slug(db, slug)
    return get_related_products(db, product, limit=limit)