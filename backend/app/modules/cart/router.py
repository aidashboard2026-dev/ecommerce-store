from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Response,
    status,
)
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.dependencies import (
    get_current_customer,
)
from app.modules.customers.models import Customer
from app.modules.products.models import (
    Product,
    ProductVariant,
)

from app.modules.cart.models import (
    CustomerCartItem,
)

from app.modules.cart.schemas import (
    CartItemCreate,
    CartItemQuantityUpdate,
    CartItemResponse,
    CartResponse,
)

from app.shared.storage.supabase_storage import get_product_image_url


router = APIRouter(
    prefix="/customer/cart",
    tags=["Customer Cart"],
)

def _cart_item_payload(
    cart_item: CustomerCartItem,
) -> dict:

    product = cart_item.product
    variant = cart_item.variant

    if not variant and product and product.variants:
        variant = product.variants[0]

    selling_price = (
        variant.selling_price
        if variant and variant.selling_price is not None
        else (product.min_price if product else None)
    )

    original_price = (
        variant.original_price
        if variant and variant.original_price is not None
        else selling_price
    )

    return {
        # Database cart fields
        "id": cart_item.id,
        "customer_id": cart_item.customer_id,
        "product_id": cart_item.product_id,
        "variant_id": cart_item.variant_id or (variant.id if variant else None),
        "quantity": cart_item.quantity,

        # Product fields
        "title": product.title if product else "",
        "slug": product.slug if product else "",
        "thumbnail": get_product_image_url(product.thumbnail) if product else None,

        # Variant fields
        "size": variant.size if variant else None,
        "color": variant.color if variant else None,
        "original_price": original_price,
        "selling_price": selling_price,
        "stock_quantity": (
            variant.available_stock
            if variant
            else (product.total_stock if product else 0)
        ),

        # Timestamps
        "created_at": cart_item.created_at,
        "updated_at": cart_item.updated_at,
    }


def _get_customer_cart_item(
    db: Session,
    customer_id: int,
    cart_item_id: int,
) -> CustomerCartItem:

    cart_item = (
        db.query(CustomerCartItem)
        .filter(
            CustomerCartItem.id == cart_item_id,
            CustomerCartItem.customer_id == customer_id,
        )
        .first()
    )

    if not cart_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found.",
        )

    return cart_item


@router.get(
    "",
    response_model=CartResponse,
)
def get_customer_cart(
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):

    items = (
        db.query(CustomerCartItem)
        .filter(CustomerCartItem.customer_id == current_customer.id)
        .order_by(CustomerCartItem.created_at.desc())
        .all()
    )

    total_items = sum(item.quantity for item in items)

    return CartResponse(
        items=[_cart_item_payload(item) for item in items],
        total_items=total_items,
    )


@router.post(
    "",
    response_model=CartItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_customer_cart_item(
    body: CartItemCreate,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):

    product = (
        db.query(Product)
        .filter(Product.id == body.product_id)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    target_variant_id = body.variant_id
    if target_variant_id is None and product.variants:
        target_variant_id = product.variants[0].id

    if target_variant_id is not None:
        variant = (
            db.query(ProductVariant)
            .filter(
                ProductVariant.id == target_variant_id,
                ProductVariant.product_id == body.product_id,
            )
            .first()
        )

        if not variant:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The selected variant does not belong to this product.",
            )

    existing_item = (
        db.query(CustomerCartItem)
        .filter(
            CustomerCartItem.customer_id == current_customer.id,
            CustomerCartItem.product_id == body.product_id,
            CustomerCartItem.variant_id == target_variant_id,
        )
        .first()
    )

    if existing_item:
        existing_item.quantity += body.quantity

        if existing_item.quantity > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum cart quantity is 100.",
            )

        db.commit()
        db.refresh(existing_item)
        return _cart_item_payload(existing_item)

    cart_item = CustomerCartItem(
        customer_id=current_customer.id,
        product_id=body.product_id,
        variant_id=target_variant_id,
        quantity=body.quantity,
    )

    db.add(cart_item)
    db.commit()
    db.refresh(cart_item)

    return _cart_item_payload(cart_item)


@router.patch(
    "/{cart_item_id}",
    response_model=CartItemResponse,
)
def update_customer_cart_quantity(
    cart_item_id: int,
    body: CartItemQuantityUpdate,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(
        get_current_customer
    ),
):

    cart_item = (
        _get_customer_cart_item(
            db=db,
            customer_id=(
                current_customer.id
            ),
            cart_item_id=cart_item_id,
        )
    )

    cart_item.quantity = body.quantity

    db.commit()

    db.refresh(
        cart_item
    )

    return _cart_item_payload(cart_item)


@router.delete(
    "/{cart_item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_customer_cart_item(
    cart_item_id: int,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(
        get_current_customer
    ),
):

    cart_item = (
        _get_customer_cart_item(
            db=db,
            customer_id=(
                current_customer.id
            ),
            cart_item_id=cart_item_id,
        )
    )

    db.delete(
        cart_item
    )

    db.commit()

    return Response(
        status_code=(
            status.HTTP_204_NO_CONTENT
        )
    )


@router.delete(
    "",
)
def clear_customer_cart(
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(
        get_current_customer
    ),
):

    deleted_count = (
        db.query(CustomerCartItem)
        .filter(
            CustomerCartItem.customer_id
            == current_customer.id
        )
        .delete(
            synchronize_session=False
        )
    )

    db.commit()

    return {
        "message": (
            "Customer cart cleared "
            "successfully."
        ),
        "deleted_items": deleted_count,
    }