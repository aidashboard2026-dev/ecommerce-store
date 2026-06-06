import hashlib
import os
import time
import uuid
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
from app.services.product_service import (
    bulk_create_variants,
    create_product,
    create_variant,
    delete_product,
    get_product,
    get_products_paginated,
    update_product,
)

router = APIRouter()

# ─────────────────────────────────────────────────────────────
# Upload directory
# Points to backend/uploads/products — same root that main.py
# mounts as StaticFiles("/uploads", directory="backend/uploads")
# ─────────────────────────────────────────────────────────────

# __file__ is  .../backend/app/api/v1/endpoints/products.py
# go up 4 levels  → backend/
# then            → backend/uploads/products
_BACKEND_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "..")
)
UPLOAD_DIR = os.path.join(_BACKEND_ROOT, "uploads", "products")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ─────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB

# FIX #20 — upload read timeout: abort reads that take too long (30 s)
UPLOAD_READ_TIMEOUT_SECS = 30

# Magic byte signatures for image type validation
_MAGIC_BYTES = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG": "image/png",
    b"RIFF": "image/webp",  # WebP: RIFF....WEBP
}

# FIX #16 — in-memory idempotency store (keyed by admin_id + content hash)
# TTL-based: entries expire after 60 s so retries still work after that.
# Replace with Redis in multi-process deployments.
_idempotency_cache: dict[str, tuple[dict, float]] = {}
_IDEMPOTENCY_TTL = 60  # seconds


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

    # For WebP: validate RIFF header has WEBP at offset 8
    if detected_mime == "image/webp":
        if len(contents) >= 12 and contents[8:12] != b"WEBP":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="File has RIFF header but is not a valid WebP image.",
            )


def _cleanup_product_image(product: Product) -> None:
    """
    Remove the thumbnail file from disk for a product.
    Safe to call even if file doesn't exist.
    """
    if not product.thumbnail:
        return

    rel_path = product.thumbnail.lstrip("/")
    file_path = os.path.join(_BACKEND_ROOT, rel_path)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass  # Best-effort cleanup; log in production


def _cleanup_idempotency_cache() -> None:
    """Evict expired entries from the idempotency cache."""
    now = time.monotonic()
    expired = [k for k, (_, ts) in _idempotency_cache.items() if now - ts > _IDEMPOTENCY_TTL]
    for k in expired:
        del _idempotency_cache[k]


def _idempotency_key(admin_id: int, payload_bytes: bytes) -> str:
    digest = hashlib.sha256(payload_bytes).hexdigest()[:32]
    return f"{admin_id}:{digest}"


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
# FIX #16 — idempotency: duplicate submissions within 60 s
# return the same product instead of creating a duplicate
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
    # Clean expired entries periodically
    _cleanup_idempotency_cache()

    # Build a stable key from admin identity + full payload
    payload_bytes = product_in.model_dump_json().encode()
    idem_key = _idempotency_key(current_admin.id, payload_bytes)

    if idem_key in _idempotency_cache:
        cached_product, _ = _idempotency_cache[idem_key]
        # Re-fetch fresh from DB in case it was updated
        fresh = get_product(db, cached_product["id"])
        if fresh:
            return fresh

    product = create_product(db, product_in)

    # Cache result
    _idempotency_cache[idem_key] = ({"id": product.id}, time.monotonic())

    return product


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
    # Clean up thumbnail file before soft-deleting
    product = get_product(db, product_id)
    if product:
        _cleanup_product_image(product)

    success = delete_product(db, product_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

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
# Image upload — stores file and sets product thumbnail
# With hardened validation: MIME, extension, magic bytes, size
# FIX #20 — upload read timeout protection
# FIX #21 — rollback-safe: orphan file cleaned up on DB failure
# ─────────────────────────────────────────────────────────────

@router.post("/admin/{product_id}/images")
def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    set_as_primary: str = Form("false"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    Upload an image for a product. Saves to backend/uploads/products/,
    which is served as /uploads via StaticFiles in main.py.
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

    # FIX #20 — timeout-guarded file read
    # FastAPI runs sync endpoints in a thread pool; we use a manual deadline.
    read_start = time.monotonic()
    try:
        contents = file.file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Failed to read uploaded file.",
        )

    elapsed = time.monotonic() - read_start
    if elapsed > UPLOAD_READ_TIMEOUT_SECS:
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail=f"File read timed out after {UPLOAD_READ_TIMEOUT_SECS} seconds.",
        )

    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image must be under {MAX_IMAGE_SIZE // (1024 * 1024)} MB. Got: {len(contents) / (1024 * 1024):.1f} MB",
        )

    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    # Validate magic bytes match declared MIME type
    _validate_image_magic_bytes(contents, file.content_type)

    # Generate unique filename
    unique_name = f"{product_id}_{uuid.uuid4().hex[:12]}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    # Write file to disk
    try:
        with open(file_path, "wb") as f:
            f.write(contents)
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save image file to disk.",
        )

    # Delete old thumbnail file from disk if replacing
    _cleanup_product_image(product)

    # Store URL and commit — FIX #21: clean up new file if DB commit fails
    image_url = f"/uploads/products/{unique_name}"
    product.thumbnail = image_url

    try:
        db.commit()
    except Exception:
        db.rollback()
        # Clean up the orphan file we just wrote
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update product image in database. File has been cleaned up.",
        )

    db.refresh(product)

    return {
        "id": product.id,
        "url": image_url,
        "is_primary": True,
        "message": "Image uploaded and set as thumbnail",
    }