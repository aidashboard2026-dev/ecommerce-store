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
from app.shared.storage import supabase_storage

from app.modules.custom_products.schemas import (
    CustomCategoryCreate,
    CustomCategoryUpdate,
    CustomCategoryResponse,
    CustomProductCreate,
    CustomProductUpdate,
    CustomProductResponse,
    CustomProductListResponse,
    CustomProductBulkActionPayload,
)
from app.modules.custom_products.service import (
    # Custom Category
    get_custom_categories,
    get_custom_category,
    create_custom_category,
    update_custom_category,
    delete_custom_category,
    # Custom Product
    get_custom_product,
    get_custom_product_orm,
    get_custom_products,
    get_public_custom_products,
    create_custom_product,
    update_custom_product,
    delete_custom_product,
    bulk_action_custom_products,
    increment_custom_product_view_count,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Image validation helpers (own implementation — not shared with products)
# ─────────────────────────────────────────────────────────────────────────────

_ALLOWED_MIME_TYPES  = {"image/jpeg", "image/png", "image/webp"}
_ALLOWED_EXTENSIONS  = {".jpg", ".jpeg", ".png", ".webp"}
_MAX_IMAGE_SIZE      = 5 * 1024 * 1024  # 5 MB

_MAGIC_BYTES: dict = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG":      "image/png",
    b"RIFF":         "image/webp",
}


def _validate_image_magic_bytes(header: bytes) -> None:
    if len(header) < 4:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "File is too small to be a valid image.",
        )
    detected_mime = None
    for magic, mime in _MAGIC_BYTES.items():
        if header[: len(magic)] == magic:
            detected_mime = mime
            break
    if not detected_mime:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "File content does not match any supported image format (JPEG, PNG, WebP).",
        )
    if detected_mime == "image/webp" and header[8:12] != b"WEBP":
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "File has RIFF header but is not a valid WebP image.",
        )


def _read_and_validate_upload(file: UploadFile) -> bytes:
    """Read upload, validate MIME type, extension, size, and magic bytes. Returns raw bytes."""
    if file.content_type not in _ALLOWED_MIME_TYPES:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Only JPG, PNG, and WebP are allowed. Got: {file.content_type}",
        )
    ext = os.path.splitext(file.filename or "image.jpg")[1].lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Extension '{ext}' not allowed. Use: {', '.join(_ALLOWED_EXTENSIONS)}",
        )

    _CHUNK = 65_536
    chunks: list = []
    total_bytes = 0
    while True:
        chunk = file.file.read(_CHUNK)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > _MAX_IMAGE_SIZE:
            raise HTTPException(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                f"Image must be under {_MAX_IMAGE_SIZE // (1024 * 1024)} MB.",
            )
        chunks.append(chunk)

    contents = b"".join(chunks)
    if not contents:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Uploaded file is empty.",
        )
    _validate_image_magic_bytes(contents[:16])
    return contents


# ─────────────────────────────────────────────────────────────────────────────
# CUSTOM CATEGORY endpoints
# These manage custom_categories — NOT products.categories.
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/admin/categories", response_model=List[CustomCategoryResponse])
def list_custom_categories_admin(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """List all custom categories (admin view)."""
    return get_custom_categories(db, status_filter=status_filter)


@router.get("/categories", response_model=List[CustomCategoryResponse])
def list_custom_categories_public(
    db: Session = Depends(get_db),
):
    """List active custom categories (public storefront view)."""
    return get_custom_categories(db, status_filter="active")


@router.post(
    "/admin/categories",
    response_model=CustomCategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_custom_category_endpoint(
    data: CustomCategoryCreate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Create a new custom category. No limit on custom category count."""
    return create_custom_category(db, data)


@router.patch("/admin/categories/{category_id}", response_model=CustomCategoryResponse)
def update_custom_category_endpoint(
    category_id: int,
    data: CustomCategoryUpdate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Update an existing custom category."""
    return update_custom_category(db, category_id, data)


@router.delete(
    "/admin/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_custom_category_endpoint(
    category_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Delete a custom category."""
    delete_custom_category(db, category_id)


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN CUSTOM PRODUCT endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/admin/all", response_model=CustomProductListResponse)
def list_admin_custom_products(
    page: int = Query(1, ge=1),
    per_page: int = Query(15, ge=1, le=100),
    search: Optional[str] = None,
    custom_category_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """List all custom products with pagination and filtering (admin view)."""
    return get_custom_products(
        db=db,
        page=page,
        per_page=per_page,
        search=search,
        custom_category_id=custom_category_id,
        status_filter=status_filter,
    )


@router.get("/admin/{product_id}", response_model=CustomProductResponse)
def get_custom_product_endpoint(
    product_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Get a single custom product by ID (admin view)."""
    return get_custom_product(db, product_id)


@router.post(
    "/admin",
    response_model=CustomProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_custom_product_endpoint(
    data: CustomProductCreate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Create a new custom product."""
    return create_custom_product(db, data)


@router.patch("/admin/{product_id}", response_model=CustomProductResponse)
def update_custom_product_endpoint(
    product_id: int,
    data: CustomProductUpdate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Partially update an existing custom product."""
    return update_custom_product(db, product_id, data)


@router.delete(
    "/admin/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_custom_product_endpoint(
    product_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Soft-delete a custom product."""
    # Cleanup images before soft-deleting
    product = get_custom_product_orm(db, product_id)
    for img_attr in ["thumbnail", "image_front", "image_back", "image_size_chart"]:
        img_url = getattr(product, img_attr, None)
        if img_url:
            try:
                supabase_storage.delete_custom_product_image(img_url)
            except Exception:
                pass
    if product.gallery_images:
        for img_url in product.gallery_images:
            if img_url:
                try:
                    supabase_storage.delete_custom_product_image(img_url)
                except Exception:
                    pass

    delete_custom_product(db, product_id)


@router.post("/admin/bulk-action")
def bulk_action_endpoint(
    payload: CustomProductBulkActionPayload,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Apply a bulk action to multiple custom products."""
    return bulk_action_custom_products(db, payload)


# ─────────────────────────────────────────────────────────────────────────────
# IMAGE UPLOAD for custom products
# Uses dedicated custom-product-images Supabase bucket (separate from products).
# ─────────────────────────────────────────────────────────────────────────────

_CP_IMAGE_TYPE_FIELDS = {
    "thumbnail":  "thumbnail",
    "front":      "image_front",
    "back":       "image_back",
    "size_chart": "image_size_chart",
}


@router.post("/admin/{product_id}/images")
def upload_custom_product_image(
    product_id: int,
    file: UploadFile = File(...),
    image_type: str = Form("thumbnail"),  # thumbnail | front | back | size_chart | gallery
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Upload an image for a custom product to the dedicated custom product bucket."""
    product = get_custom_product_orm(db, product_id)

    contents = _read_and_validate_upload(file)

    # Upload to the dedicated custom product bucket — never the product-images bucket
    image_url = supabase_storage.upload_custom_product_image(
        contents=contents,
        original_filename=file.filename or "image.jpg",
        content_type=file.content_type,
        product_id=product_id,
    )

    field_name = _CP_IMAGE_TYPE_FIELDS.get(image_type)

    if image_type == "gallery":
        old_gallery = list(product.gallery_images or [])
        new_gallery = old_gallery + [image_url]
        product.gallery_images = new_gallery
        try:
            db.commit()
        except Exception:
            db.rollback()
            supabase_storage.delete_custom_product_image(image_url)
            raise HTTPException(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                "Failed to update gallery.",
            )
        db.refresh(product)
        return {
            "id": product.id,
            "url": image_url,
            "image_type": "gallery",
            "gallery_images": product.gallery_images,
            "message": "Gallery image added.",
        }

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
            raise HTTPException(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                "Failed to update custom product image.",
            )
        # Cleanup old image from custom product bucket
        if old_url and old_url != image_url:
            try:
                supabase_storage.delete_custom_product_image(old_url)
            except Exception:
                pass
        db.refresh(product)
        return {
            "id": product.id,
            "url": image_url,
            "image_type": image_type,
            "message": f"{image_type.replace('_', ' ').title()} image uploaded.",
        }

    else:
        supabase_storage.delete_custom_product_image(image_url)
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Unknown image_type '{image_type}'. Use: thumbnail, front, back, size_chart, gallery.",
        )


@router.delete("/admin/{product_id}/images/{image_type}")
def delete_custom_product_image_by_type(
    product_id: int,
    image_type: str,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Remove a named image from a custom product by type."""
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
    product = get_custom_product_orm(db, product_id)
    field = field_map[image_type]
    old_url = getattr(product, field)
    if not old_url:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"Custom product has no {image_type} image.",
        )
    setattr(product, field, None)
    db.commit()
    try:
        supabase_storage.delete_custom_product_image(old_url)
    except Exception:
        pass
    return {"message": f"{image_type.replace('_', ' ').title()} image removed."}


@router.delete(
    "/admin/{product_id}/images/gallery/{index}",
    status_code=status.HTTP_200_OK,
)
def delete_custom_product_gallery_image(
    product_id: int,
    index: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Remove a gallery image from a custom product by its position index."""
    product = get_custom_product_orm(db, product_id)
    gallery = list(product.gallery_images or [])
    if index < 0 or index >= len(gallery):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"Gallery image at index {index} not found.",
        )
    old_url = gallery.pop(index)
    product.gallery_images = gallery
    db.commit()
    try:
        supabase_storage.delete_custom_product_image(old_url)
    except Exception:
        pass
    return {"message": "Gallery image removed.", "gallery_images": product.gallery_images}


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC (STOREFRONT) endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=CustomProductListResponse)
def list_public_custom_products(
    page: int = Query(1, ge=1),
    per_page: int = Query(15, ge=1, le=100),
    search: Optional[str] = None,
    custom_category_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """List published custom products for the storefront."""
    return get_public_custom_products(
        db=db,
        page=page,
        per_page=per_page,
        search=search,
        custom_category_id=custom_category_id,
    )


@router.get("/{product_id}", response_model=CustomProductResponse)
def get_public_custom_product(
    product_id: int,
    db: Session = Depends(get_db),
):
    """Get a single published custom product by ID for the storefront."""
    product = get_custom_product(db, product_id)
    # Increment view count asynchronously (best-effort)
    increment_custom_product_view_count(db, product_id)
    return product
