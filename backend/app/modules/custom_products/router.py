from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    status,
)

from sqlalchemy.orm import Session

from app.modules.auth.dependencies import get_current_admin
from app.core.database import get_db

from app.modules.admins.models import Admin

from app.modules.custom_products.schemas import (
    CustomProductCreate,
    CustomProductUpdate,
    CustomProductResponse,
    CustomProductListResponse,
)

from app.modules.custom_products.service import (
    create_custom_product,
    get_custom_product,
    get_custom_products,
    update_custom_product,
    delete_custom_product,
)

router = APIRouter()


# ==========================================
# ADMIN
# ==========================================

@router.get(
    "/admin/all",
    response_model=CustomProductListResponse
)
def list_custom_products(
    page: int = 1,
    per_page: int = 15,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return get_custom_products(
        db=db,
        page=page,
        per_page=per_page,
        search=search,
        category_id=category_id,
    )


@router.get(
    "/admin/{product_id}",
    response_model=CustomProductResponse
)
def get_custom_product_endpoint(
    product_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return get_custom_product(db, product_id)


@router.post(
    "/admin",
    response_model=CustomProductResponse,
    status_code=status.HTTP_201_CREATED
)
def create_custom_product_endpoint(
    data: CustomProductCreate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return create_custom_product(db, data)


@router.put(
    "/admin/{product_id}",
    response_model=CustomProductResponse
)
def update_custom_product_endpoint(
    product_id: int,
    data: CustomProductUpdate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return update_custom_product(
        db,
        product_id,
        data
    )


@router.delete(
    "/admin/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_custom_product_endpoint(
    product_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    delete_custom_product(
        db,
        product_id
    )

