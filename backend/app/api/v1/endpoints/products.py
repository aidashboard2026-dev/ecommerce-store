import os
import uuid
import shutil
from typing import Optional

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
    if product.thumbnail:
        # thumbnail is stored as  /uploads/products/<filename>
        # strip leading slash and join to backend root
        rel_path = product.thumbnail.lstrip("/")
        file_path = os.path.join(_BACKEND_ROOT, rel_path)
        if os.path.exists(file_path):
            os.remove(file_path)

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
# Soft delete product
# ─────────────────────────────────────────────────────────────

@router.delete("/admin/{product_id}")
def delete_product_by_id(
    product_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
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
# Image upload — stores file and sets product thumbnail
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
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only JPG, PNG, and WebP images are allowed.",
        )

    # Validate file size (5 MB max)
    MAX_SIZE = 5 * 1024 * 1024
    contents = file.file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image must be under 5 MB.",
        )

    # Generate unique filename
    ext = os.path.splitext(file.filename or "image.jpg")[1] or ".jpg"
    unique_name = f"{product_id}_{uuid.uuid4().hex[:12]}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    # Write file
    with open(file_path, "wb") as f:
        f.write(contents)

    # Delete old thumbnail file from disk if replacing
    if product.thumbnail:
        old_rel = product.thumbnail.lstrip("/")
        old_path = os.path.join(_BACKEND_ROOT, old_rel)
        if os.path.exists(old_path):
            os.remove(old_path)

    # Store URL and commit
    image_url = f"/uploads/products/{unique_name}"
    product.thumbnail = image_url

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(product)

    return {
        "id": product.id,
        "url": image_url,
        "is_primary": True,
        "message": "Image uploaded and set as thumbnail",
    }