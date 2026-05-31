from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.product import (
    ProductResponse, ProductCreate, ProductUpdate,
    ProductListResponse, VariantCreate, VariantResponse,
)
from app.services.product_service import (
    get_products_paginated, get_product, create_product,
    update_product, delete_product, create_variant,
)
from app.auth.dependencies import get_current_admin
from app.models.admin import Admin

router = APIRouter()


# ── Admin product list (paginated, searchable) ──────────────────────────────

@router.get("/admin/all", response_model=ProductListResponse)
def list_products_admin(
    search: str = "",
    status: str = "",
    page: int = Query(1, ge=1),
    per_page: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return get_products_paginated(db, search=search, status=status, page=page, per_page=per_page)


# ── Create product ──────────────────────────────────────────────────────────

@router.post("/admin", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_new_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return create_product(db, product_in)


# ── Get single product ──────────────────────────────────────────────────────

@router.get("/admin/{product_id}", response_model=ProductResponse)
def get_product_by_id(
    product_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    product = get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


# ── Update product ───────────────────────────────────────────────────────────

@router.patch("/admin/{product_id}", response_model=ProductResponse)
def update_product_by_id(
    product_id: int,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    product = get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return update_product(db, product, product_in)


# ── Delete product ───────────────────────────────────────────────────────────

@router.delete("/admin/{product_id}")
def delete_product_by_id(
    product_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    success = delete_product(db, product_id)
    if not success:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}


# ── Add variant ──────────────────────────────────────────────────────────────

@router.post("/admin/{product_id}/variants", response_model=VariantResponse, status_code=status.HTTP_201_CREATED)
def add_variant(
    product_id: int,
    variant_in: VariantCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    product = get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return create_variant(db, product_id, variant_in)
