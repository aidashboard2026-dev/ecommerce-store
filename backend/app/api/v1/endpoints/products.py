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

from app.auth.dependencies import get_current_admin
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
from app.services import supabase_storage
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
    Removes a product's thumbnail from Supabase Storage. Safe to call even
    if the product has no thumbnail or the object no longer exists in the
    bucket — deletion is best-effort, matching the rest of the codebase's
    cleanup pattern.

    Legacy data note: if `product.thumbnail` is still an old root-relative
    local path (e.g. /uploads/products/old.jpg) from before this migration,
    this is a no-op — those files should be moved to Supabase first via
    migrate_images_to_supabase.py.
    """
    if not product.thumbnail:
        return

    supabase_storage.delete_product_image(product.thumbnail)



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
    Upload an image for a product directly to Supabase Storage. The
    resulting public URL (https://PROJECT.supabase.co/storage/v1/object/
    public/<bucket>/<file>) is stored in the product's `thumbnail` column —
    no files are written to local disk, so the image is immediately visible
    on every teammate's machine and survives Docker rebuilds, redeploys,
    and backend restarts.
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

    # Read the upload in 64 KB chunks so an oversized file is rejected as
    # soon as it crosses MAX_IMAGE_SIZE, rather than buffering the whole
    # (potentially huge) body first. Once validated, the bytes are handed
    # to Supabase Storage in a single call — Supabase's upload API needs
    # the full object body, so unlike the old local-disk version this
    # can't stream straight to its final destination, but the 5 MB cap
    # keeps memory use trivial.
    _CHUNK = 65_536
    chunks: list[bytes] = []
    total_bytes = 0

    while True:
        chunk = file.file.read(_CHUNK)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=(
                    f"Image must be under {MAX_IMAGE_SIZE // (1024 * 1024)} MB. "
                    f"Upload aborted after {total_bytes / (1024 * 1024):.1f} MB."
                ),
            )
        chunks.append(chunk)

    contents = b"".join(chunks)

    if not contents:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    # Validate magic bytes against declared MIME — only needs first 16 bytes.
    _validate_image_magic_bytes(contents[:16], file.content_type)

    # Upload to Supabase Storage. Object names are fresh UUIDs, so there's
    # never a collision to worry about.
    image_url = supabase_storage.upload_product_image(
        contents=contents,
        original_filename=file.filename or "image.jpg",
        content_type=file.content_type,
        product_id=product_id,
    )

    old_thumbnail = product.thumbnail

    if set_as_primary.lower() == "true":
        product.thumbnail = image_url

    try:
        db.commit()
    except Exception:
        db.rollback()
        # Commit failed — clean up the file we just uploaded to Supabase
        # so it doesn't become an orphan.
        supabase_storage.delete_product_image(image_url)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update product image in database. Uploaded file has been cleaned up.",
        )

    # DB commit succeeded — only now is it safe to remove the previous
    # image (deleting beforehand would risk an orphaned reference if the
    # commit had failed).
    if set_as_primary.lower() == "true" and old_thumbnail:
        supabase_storage.delete_product_image(old_thumbnail)

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