from datetime import datetime
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


class CartItemCreate(BaseModel):
    product_id: int = Field(
        gt=0,
    )

    variant_id: int | None = Field(
        default=None,
        gt=0,
    )

    quantity: int = Field(
        default=1,
        ge=1,
        le=100,
    )


class CartItemQuantityUpdate(BaseModel):
    quantity: int = Field(
        ge=1,
        le=100,
    )


class CartItemResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    # Database cart details
    id: int
    customer_id: int
    product_id: int
    variant_id: int | None
    quantity: int

    # Product details
    title: str
    slug: str
    thumbnail: str | None

    # Selected variant details
    size: str | None
    color: str | None

    original_price: Decimal | None
    selling_price: Decimal | None

    stock_quantity: int

    created_at: datetime
    updated_at: datetime


class CartResponse(BaseModel):
    items: list[CartItemResponse]

    total_items: int