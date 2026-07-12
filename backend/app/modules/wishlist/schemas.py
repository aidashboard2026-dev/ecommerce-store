from datetime import datetime
from decimal import Decimal

from pydantic import (
    BaseModel,
    Field,
)


class WishlistItemCreate(BaseModel):
    product_id: int = Field(
        gt=0,
    )


class WishlistItemResponse(BaseModel):
    id: int

    customer_id: int

    product_id: int

    title: str

    slug: str

    thumbnail: str | None

    min_price: Decimal | None

    created_at: datetime


class WishlistResponse(BaseModel):
    items: list[
        WishlistItemResponse
    ]

    total_items: int