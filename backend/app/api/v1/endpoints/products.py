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

# Upload directory (relative to backend root)
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads", "products")
os.makedirs(UPLOAD_DIR, exist_ok=True)


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
# Image upload (MVP — stores as product thumbnail)
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
    MVP image upload: saves file to disk, sets as product thumbnail.
    Returns a response compatible with the frontend ImageUploadModal.
    """

    product = get_product(db, product_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Validate file type
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only JPG, PNG, and WebP images are allowed.",
        )

    # Generate unique filename
    ext = os.path.splitext(file.filename or "image.jpg")[1] or ".jpg"
    unique_name = f"{product_id}_{uuid.uuid4().hex[:12]}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    # Save file to disk
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Build URL path (served via StaticFiles mount)
    image_url = f"/uploads/products/{unique_name}"

    # Update product thumbnail
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


# ─────────────────────────────────────────────────────────────
# Image delete (MVP — clears product thumbnail)
# ─────────────────────────────────────────────────────────────

@router.delete("/admin/images/{image_id}")
def delete_product_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    MVP image delete: clears the thumbnail for the given product ID.
    image_id is treated as product_id in this MVP approach.
    """

    product = get_product(db, image_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Remove file from disk if it exists
    if product.thumbnail:
        file_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "..",
            product.thumbnail.lstrip("/"),
        )
        if os.path.exists(file_path):
            os.remove(file_path)

    product.thumbnail = None

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {"message": "Image removed"}