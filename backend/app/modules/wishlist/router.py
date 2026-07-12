from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Response,
    status,
)
from sqlalchemy.orm import (
    Session,
)

from app.core.database import (
    get_db,
)

from app.modules.auth.dependencies import (
    get_current_customer,
)

from app.modules.customers.models import (
    Customer,
)

from app.modules.products.models import (
    Product,
)

from app.modules.wishlist.models import (
    CustomerWishlistItem,
)

from app.modules.wishlist.schemas import (
    WishlistItemCreate,
    WishlistItemResponse,
    WishlistResponse,
)


# ============================================================
# Router
# ============================================================

router = APIRouter(
    prefix="/customer/wishlist",
    tags=["Customer Wishlist"],
)


# ============================================================
# Response Payload Helper
# ============================================================

def _wishlist_item_payload(
    wishlist_item: CustomerWishlistItem,
) -> dict:

    product = wishlist_item.product

    return {
        "id": wishlist_item.id,

        "customer_id": (
            wishlist_item.customer_id
        ),

        "product_id": (
            wishlist_item.product_id
        ),

        "title": product.title,

        "slug": product.slug,

        "thumbnail": (
            product.thumbnail
        ),

        "min_price": (
            product.min_price
        ),

        "created_at": (
            wishlist_item.created_at
        ),
    }


# ============================================================
# Get Current Customer Wishlist
# ============================================================

@router.get(
    "",
    response_model=WishlistResponse,
)
def get_customer_wishlist(
    db: Session = Depends(
        get_db
    ),
    current_customer: Customer = Depends(
        get_current_customer
    ),
):

    items = (
        db.query(
            CustomerWishlistItem
        )
        .filter(
            CustomerWishlistItem.customer_id
            == current_customer.id
        )
        .order_by(
            CustomerWishlistItem
            .created_at
            .desc()
        )
        .all()
    )

    return {
        "items": [
            _wishlist_item_payload(
                item
            )
            for item in items
        ],

        "total_items": len(
            items
        ),
    }


# ============================================================
# Add Product to Wishlist
# ============================================================

@router.post(
    "",
    response_model=(
        WishlistItemResponse
    ),
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def add_customer_wishlist_item(
    body: WishlistItemCreate,

    db: Session = Depends(
        get_db
    ),

    current_customer: Customer = Depends(
        get_current_customer
    ),
):

    product = (
        db.query(Product)
        .filter(
            Product.id
            == body.product_id
        )
        .first()
    )

    if not product:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Product not found.",
        )

    existing_item = (
        db.query(
            CustomerWishlistItem
        )
        .filter(
            CustomerWishlistItem.customer_id
            == current_customer.id,

            CustomerWishlistItem.product_id
            == body.product_id,
        )
        .first()
    )

    if existing_item:

        return (
            _wishlist_item_payload(
                existing_item
            )
        )

    wishlist_item = (
        CustomerWishlistItem(
            customer_id=(
                current_customer.id
            ),

            product_id=(
                body.product_id
            ),
        )
    )

    db.add(
        wishlist_item
    )

    db.commit()

    db.refresh(
        wishlist_item
    )

    return (
        _wishlist_item_payload(
            wishlist_item
        )
    )


# ============================================================
# Remove Product from Wishlist
# ============================================================

@router.delete(
    "/product/{product_id}",
    status_code=(
        status.HTTP_204_NO_CONTENT
    ),
)
def remove_customer_wishlist_item(
    product_id: int,

    db: Session = Depends(
        get_db
    ),

    current_customer: Customer = Depends(
        get_current_customer
    ),
):

    wishlist_item = (
        db.query(
            CustomerWishlistItem
        )
        .filter(
            CustomerWishlistItem.customer_id
            == current_customer.id,

            CustomerWishlistItem.product_id
            == product_id,
        )
        .first()
    )

    if not wishlist_item:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Wishlist item not found."
            ),
        )

    db.delete(
        wishlist_item
    )

    db.commit()

    return Response(
        status_code=(
            status.HTTP_204_NO_CONTENT
        )
    )


# ============================================================
# Clear Current Customer Wishlist
# ============================================================

@router.delete(
    "",
)
def clear_customer_wishlist(
    db: Session = Depends(
        get_db
    ),

    current_customer: Customer = Depends(
        get_current_customer
    ),
):

    deleted_count = (
        db.query(
            CustomerWishlistItem
        )
        .filter(
            CustomerWishlistItem.customer_id
            == current_customer.id
        )
        .delete(
            synchronize_session=False
        )
    )

    db.commit()

    return {
        "message": (
            "Customer wishlist "
            "cleared successfully."
        ),

        "deleted_items": (
            deleted_count
        ),
    }