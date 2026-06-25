from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

class OrderBase(BaseModel):
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None

    address_line1: Optional[str] = None
    address_line2: Optional[str] = None

    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None

    product_name: str
    product_id: Optional[int] = None  # used for reliable inventory lookup
    product_image: Optional[str] = None

    size: Optional[str] = None
    color: Optional[str] = None

    quantity: int = 1

    # Decimal matches Numeric(10,2) on the database — no floating-point rounding.
    price: Decimal = Field(default=Decimal("0.00"))
    total_amount: Decimal = Field(default=Decimal("0.00"))

    payment_method: str = "COD"
    payment_status: str = "PENDING"

    tracking_status: str = "PLACED"
    tracking_note: Optional[str] = None
    logistics: Optional[str] = None
    tracking_id: Optional[str] = None

    delivery_days: Optional[int] = None

    expected_delivery_date: Optional[datetime] = None

    ordered_at: Optional[datetime] = None

    # Groups all rows from the same checkout session (one session = one UUID).
    # The frontend generates a UUID before the checkout loop and sends it
    # with every order in that session.  NULL for single-item checkouts
    # and all pre-existing orders.
    cart_session_id: Optional[str] = None


class OrderCreate(OrderBase):
    order_number: Optional[str] = None

class OrderUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None

    tracking_status: Optional[str] = None
    tracking_note: Optional[str] = None
    logistics: Optional[str] = None
    tracking_id: Optional[str] = None

    payment_status: Optional[str] = None


class OrderResponse(OrderBase):
    id: int
    order_number: str

    created_at: datetime
    updated_at: Optional[datetime] = None
    logistics: Optional[str] = None
    tracking_id: Optional[str] = None

    class Config:
        from_attributes = True

