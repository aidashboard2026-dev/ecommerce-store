from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class OrderBase(BaseModel):
    customer_name: Optional[str] = None      # was: str (required) → caused 500 on GET /orders/
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None

    address_line1: Optional[str] = None
    address_line2: Optional[str] = None

    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None

    product_name: Optional[str] = None       # was: str (required) → caused 500 on GET /orders/
    product_image: Optional[str] = None

    size: Optional[str] = None
    color: Optional[str] = None

    quantity: int = 1
    price: float = 0
    total_amount: float = 0

    payment_method: str = "COD"
    payment_status: str = "PENDING"

    tracking_status: str = "PLACED"
    tracking_note: Optional[str] = None
    logistics: Optional[str] = None
    tracking_id: Optional[str] = None

    delivery_days: Optional[int] = None
    expected_delivery_date: Optional[datetime] = None
    ordered_at: Optional[datetime] = None


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