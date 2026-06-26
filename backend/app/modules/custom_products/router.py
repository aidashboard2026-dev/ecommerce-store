from typing import Optional, List

from fastapi import (
    APIRouter,
    Depends,
    status,
    File,
    Form,
    UploadFile,
    HTTPException,
)

from app.modules.custom_products.models import CustomProduct
from app.shared.storage import supabase_storage

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
    get_public_custom_products,
    update_custom_product,
    delete_custom_product,
)




from app.modules.products.schemas import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    CollectionCreate,
    CollectionUpdate,
    CollectionResponse,
)

from app.modules.products.service import (
    # Category
    get_categories,
    
    create_category,
    update_category,
    delete_category,

  
    get_collections,
   
    create_collection,
    update_collection,
    delete_collection,
)

router = APIRouter()


# ==========================================
# ADMIN
# ==========================================

@router.get(
    "/admin/all",
    response_model=CustomProductListResponse
)
def list_admin_custom_products(
    page: int = 1,
    per_page: int = 20,
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

@router.post("/admin/{product_id}/images")
def upload_custom_product_image(
    product_id: int,
    file: UploadFile = File(...),
    image_type: str = Form("thumbnail"),
    set_as_primary: str = Form("true"),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    product = (
        db.query(CustomProduct)
        .filter(CustomProduct.id == product_id)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Custom Product not found"
        )

    contents = file.file.read()

    image_url = supabase_storage.upload_product_image(
        contents=contents,
        original_filename=file.filename,
        content_type=file.content_type,
        product_id=product_id,
    )

    if image_type == "thumbnail":
        product.thumbnail = image_url

    elif image_type == "front":
        product.image_front = image_url

    elif image_type == "back":
        product.image_back = image_url

    elif image_type == "size_chart":
        product.image_size_chart = image_url

    elif image_type == "gallery":
        gallery = product.gallery_images or []
        gallery.append(image_url)
        product.gallery_images = gallery

    db.commit()
    db.refresh(product)

    return {
        "success": True,
        "url": image_url
    }


# ==========================================
# PUBLIC (STORE FRONT)
# ==========================================
@router.get(
    "",
    response_model=CustomProductListResponse
)
def list_public_custom_products(
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    return get_public_custom_products(
        db=db,
        page=page,
        per_page=per_page,
        search=search,
        category_id=category_id,
    )
@router.get(
    "/{product_id}",
    response_model=CustomProductResponse
)
def get_public_custom_product(
    product_id: int,
    db: Session = Depends(get_db),
):
    return get_custom_product(
        db,
        product_id
    )


@router.get("/admin/categories", response_model=List[CategoryResponse])
def list_categories(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return get_categories(db, status_filter=status_filter)


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



@router.get("/admin/collections", response_model=List[CollectionResponse])
def list_collections(
    category_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    return get_collections(
        db,
        category_id=category_id,
        status_filter=status_filter,
    )


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