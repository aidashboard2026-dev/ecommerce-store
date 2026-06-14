import os
import uuid
import shutil
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

from app.auth.dependencies import get_current_admin
from app.core.config import settings
from app.database.session import get_db
from app.models.admin import Admin
from app.models.product import Product, ProductStatus
from app.schemas.product import (
    ProductCreate,
    ProductListResponse,
    ProductResponse,
    ProductUpdate,
    VariantCreate,
    VariantResponse,
)
from app.services.product_service import (
    bulk_create_variants,
    create_product,
    create_variant,
    delete_product,
    delete_variant,
    get_product,
    get_products_paginated,
    update_product,
    get_products_public,
    get_product_by_slug,
)

router = APIRouter()

# ─────────────────────────────────────────────────────────────
# Upload directory
# /app/uploads is the Docker named volume mount point.
# UPLOAD_DIR from config always points there (default: /app/uploads).
# ─────────────────────────────────────────────────────────────

_UPLOADS_ROOT = os.path.abspath(settings.UPLOAD_DIR)  # → /app/uploads
UPLOAD_DIR    = os.path.join(_UPLOADS_ROOT, "products") # → /app/uploads/products
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ─────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB

# Magic byte signatures for image type validation
_MAGIC_BYTES = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG": "image/png",
    b"RIFF": "image/webp",  # WebP: RIFF....WEBP
}


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _validate_image_magic_bytes(contents: bytes, declared_mime: str) -> None:
    """
    Validate that the file's magic bytes match the declared MIME type.
    Prevents disguised file uploads.
    """
    if len(contents) < 4:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File is too small to be a valid image.",
        )

    detected_mime = None
    for magic, mime in _MAGIC_BYTES.items():
        if contents[:len(magic)] == magic:
            detected_mime = mime
            break

    if detected_mime is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File content does not match any supported image format.",
        )

    # For JPEG, declared could be image/jpeg; for WebP we just check RIFF header
    if detected_mime == "image/webp":
        # WebP has RIFF header + WEBP at offset 8
        if len(contents) >= 12 and contents[8:12] != b"WEBP":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="File has RIFF header but is not a valid WebP image.",
            )


def _cleanup_product_image(product: Product) -> None:
    """
    Remove the thumbnail file from disk for a product.
    Safe to call even if the file doesn't exist.

    Security: resolves the full path and verifies it is strictly inside
    UPLOAD_DIR before deletion, preventing path-traversal attacks if the
    thumbnail column were ever tampered with directly in the database.

    Expected thumbnail format stored in DB: /uploads/products/<filename>
    UPLOAD_DIR inside container:            /app/uploads/products
    Resolution: strip /uploads/products prefix → just the filename → join with UPLOAD_DIR
    """
    if not product.thumbnail:
        return

    # Thumbnail is stored as a URL path: /uploads/products/<filename>
    # Extract just the filename to avoid any path traversal via the prefix.
    filename = os.path.basename(product.thumbnail)
    if not filename:
        return

    file_path = os.path.normpath(os.path.join(UPLOAD_DIR, filename))

    # Guard: file_path must be inside UPLOAD_DIR
    safe_prefix = os.path.normpath(UPLOAD_DIR) + os.sep
    if not file_path.startswith(safe_prefix):
        return  # Silently refuse — log in production monitoring

    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass  # Best-effort cleanup



# ─────────────────────────────────────────────────────────────
# Image delete  ← MUST be registered BEFORE /admin/{product_id}
# so FastAPI does not match "images" as an integer product_id
# ─────────────────────────────────────────────────────────────

@router.delete("/admin/images/{product_id}")
def delete_product_image(
    product_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    Remove the thumbnail for a product.
    Path param is product_id (the frontend passes product.id).
    """
    product = get_product(db, product_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Delete file from disk
    _cleanup_product_image(product)

    product.thumbnail = None

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {"message": "Image removed"}


# ─────────────────────────────────────────────────────────────
# Admin product list
# ─────────────────────────────────────────────────────────────

@router.get(
    "/admin/all",
    response_model=ProductListResponse,
)
def list_products_admin(
    search: str = "",
    status_filter: Optional[ProductStatus] = Query(default=None),
    page: int = Query(1, ge=1),
    per_page: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return get_products_paginated(
        db,
        search=search,
        status_filter=status_filter,
        page=page,
        per_page=per_page,
    )


# ─────────────────────────────────────────────────────────────
# Create product
# ─────────────────────────────────────────────────────────────

@router.post(
    "/admin",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return create_product(db, product_in)


# ─────────────────────────────────────────────────────────────
# Get single product
# ─────────────────────────────────────────────────────────────

@router.get(
    "/admin/{product_id}",
    response_model=ProductResponse,
)
def get_product_by_id(
    product_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    product = get_product(db, product_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    return product


# ─────────────────────────────────────────────────────────────
# Update product
# ─────────────────────────────────────────────────────────────

@router.patch(
    "/admin/{product_id}",
    response_model=ProductResponse,
)
def update_product_by_id(
    product_id: int,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    product = get_product(db, product_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    return update_product(db, product, product_in)


# ─────────────────────────────────────────────────────────────
# Soft delete product — also cleans up thumbnail file
# ─────────────────────────────────────────────────────────────

@router.delete("/admin/{product_id}")
def delete_product_by_id(
    product_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    # Fetch once — reuse the object for both soft-delete and file cleanup.
    product = get_product(db, product_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Snapshot thumbnail path before the DB write so we know what to delete
    # even after the ORM object's thumbnail field may be cleared.
    thumbnail_to_delete = product.thumbnail

    # ── Step 1: commit the soft-delete FIRST ─────────────────────────────
    # The file is removed only AFTER the DB record is safely marked deleted.
    # Reversing this prevents the broken state where the file is already gone
    # but the DB still references it, causing permanent 404s on the thumbnail.
    success = delete_product(db, product_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # ── Step 2: best-effort file cleanup after successful DB commit ───────
    # If this fails (disk full, permissions), the orphan file is harmless —
    # the soft-deleted product no longer appears in any active query.
    if thumbnail_to_delete:
        product.thumbnail = thumbnail_to_delete
        _cleanup_product_image(product)

    return {
        "message": "Product deleted successfully",
    }


# ─────────────────────────────────────────────────────────────
# Add product variant
# ─────────────────────────────────────────────────────────────

@router.post(
    "/admin/{product_id}/variants",
    response_model=VariantResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_variant(
    product_id: int,
    variant_in: VariantCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return create_variant(
        db,
        product_id,
        variant_in,
    )


# ─────────────────────────────────────────────────────────────
# Bulk create variants — future-ready batch endpoint
# ─────────────────────────────────────────────────────────────

@router.post(
    "/admin/{product_id}/variants/bulk",
    status_code=status.HTTP_201_CREATED,
)
def add_variants_bulk(
    product_id: int,
    variants_in: List[VariantCreate],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    Create multiple variants in a single transaction.
    Returns structured results: created list + failed list with per-item errors.
    """
    result = bulk_create_variants(db, product_id, variants_in)

    # Build serializable response
    created_variants = []
    for v in result["created"]:
        created_variants.append(
            VariantResponse.model_validate(v).model_dump()
        )

    return {
        "created": created_variants,
        "failed": result["failed"],
        "total_requested": result["total_requested"],
        "total_created": result["total_created"],
        "total_failed": result["total_failed"],
    }


# ─────────────────────────────────────────────────────────────
# Delete a single variant
# NOTE: registered BEFORE /admin/{product_id}/variants/bulk so
# "bulk" is not mismatched as an integer variant_id.
# ─────────────────────────────────────────────────────────────

@router.delete(
    "/admin/{product_id}/variants/{variant_id}",
    status_code=status.HTTP_200_OK,
)
def delete_variant_by_id(
    product_id: int,
    variant_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    Permanently delete a single product variant.

    The variant is matched on both product_id AND variant_id to
    prevent an admin from deleting a variant that belongs to a
    different product by guessing its ID.
    """
    product = get_product(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    success = delete_variant(db, product_id, variant_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variant not found for this product",
        )

    return {"message": "Variant deleted successfully"}


# ─────────────────────────────────────────────────────────────
# Image upload — stores file and sets product thumbnail
# With hardened validation: MIME, extension, magic bytes, size
# ─────────────────────────────────────────────────────────────

@router.post("/admin/{product_id}/images")
def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    # Default true: the image manager always intends to set the uploaded
    # image as the product thumbnail. Pass "false" explicitly only when
    # uploading gallery-only images (future feature).
    set_as_primary: str = Form("true"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    Upload an image for a product. Saves to /app/uploads/products/ (Docker named
    volume, persists across restarts). The URL stored in DB is a root-relative path:
    /uploads/products/<filename>. The frontend resolves this via the Vite proxy
    (dev) or BACKEND_URL prefix (production).
    """
    product = get_product(db, product_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Only JPG, PNG, and WebP images are allowed. Got: {file.content_type}",
        )

    # Validate file extension
    ext = os.path.splitext(file.filename or "image.jpg")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"File extension '{ext}' is not allowed. Use: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Stream the upload to a .tmp file in 64 KB chunks — never load the full
    # file into memory. This also catches clients that omit Content-Length and
    # send a chunked transfer, bypassing the middleware body-size cap.
    _CHUNK = 65_536
    unique_name = f"{product_id}_{uuid.uuid4().hex[:12]}{ext}"
    final_path  = os.path.join(UPLOAD_DIR, unique_name)
    tmp_path    = final_path + ".tmp"
    image_url   = f"/uploads/products/{unique_name}"

    total_bytes        = 0
    magic_buf          = b""   # first 16 bytes for magic-byte validation

    try:
        with open(tmp_path, "wb") as out:
            while True:
                chunk = file.file.read(_CHUNK)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_IMAGE_SIZE:
                    out.close()
                    try:
                        os.remove(tmp_path)
                    except OSError:
                        pass
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=(
                            f"Image must be under {MAX_IMAGE_SIZE // (1024 * 1024)} MB. "
                            f"Upload aborted after {total_bytes / (1024 * 1024):.1f} MB."
                        ),
                    )
                if len(magic_buf) < 16:
                    magic_buf += chunk
                out.write(chunk)
    except HTTPException:
        raise
    except OSError:
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save image file to disk.",
        )

    if total_bytes == 0:
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    # Validate magic bytes against declared MIME — only needs first 16 bytes.
    try:
        _validate_image_magic_bytes(magic_buf, file.content_type)
    except HTTPException:
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        raise

    # Delete old thumbnail BEFORE committing the new one (consistent state)
    if set_as_primary.lower() == "true":
        _cleanup_product_image(product)
        product.thumbnail = image_url

    try:
        db.commit()
    except Exception:
        db.rollback()
        # Commit failed — clean up the tmp file; no orphan on disk
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update product image in database. File has been cleaned up.",
        )

    # DB committed — atomically promote .tmp → final path
    # os.rename is atomic on the same filesystem (POSIX guarantee)
    try:
        os.rename(tmp_path, final_path)
    except OSError:
        # Rename failed in an unlikely edge case (cross-device move, permissions).
        # The DB already has the correct URL. Clean up tmp; the product's thumbnail
        # URL will 404 until the next upload, which is acceptable.
        try:
            os.remove(tmp_path)
        except OSError:
            pass

    db.refresh(product)

    return {
        "id": product.id,
        "url": image_url,
        "is_primary": set_as_primary.lower() == "true",
        "message": "Image uploaded and set as thumbnail" if set_as_primary.lower() == "true" else "Image uploaded",
    }


# ─────────────────────────────────────────────────────────────
# Public storefront product endpoints
# ─────────────────────────────────────────────────────────────

@router.get(
    "/",
    response_model=ProductListResponse,
)
def list_products_public(
    search: str = "",
    collection: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: str = "newest",
    page: int = Query(1, ge=1),
    per_page: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return get_products_public(
        db,
        search=search,
        collection=collection,
        min_price=min_price,
        max_price=max_price,
        sort_by=sort_by,
        page=page,
        per_page=per_page,
    )


@router.get(
    "/slug/{slug}",
    response_model=ProductResponse,
)
def get_product_by_slug_endpoint(
    slug: str,
    db: Session = Depends(get_db),
):
    product = get_product_by_slug(db, slug)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    return product