"""
app/modules/orders/schemas.py

Order domain Pydantic schemas.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field

from app.modules.orders.constants import ItemType, TrackingStatus, PaymentStatus


# ─────────────────────────────────────────────────────────────
# Base — shared fields
# ─────────────────────────────────────────────────────────────

class OrderBase(BaseModel):
    customer_name:  str           = Field(..., min_length=1, max_length=200)
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = Field(None, max_length=30)

    address_line1: Optional[str] = Field(None, max_length=300)
    address_line2: Optional[str] = Field(None, max_length=300)
    city:          Optional[str] = Field(None, max_length=100)
    state:         Optional[str] = Field(None, max_length=100)
    country:       Optional[str] = Field(None, max_length=100)
    pincode:       Optional[str] = Field(None, max_length=20)

    product_name:  str           = Field(..., min_length=1, max_length=300)
    product_id:    Optional[int] = None
    product_image: Optional[str] = Field(None, max_length=2048)

    size:     Optional[str] = Field(None, max_length=50)
    color:    Optional[str] = Field(None, max_length=50)
    quantity: int            = Field(1, ge=1, le=1000)

    # Decimal matches Numeric(10,2) on the database — no floating-point rounding.
    price:        Decimal = Field(default=Decimal("0.00"), ge=0)
    total_amount: Decimal = Field(default=Decimal("0.00"), ge=0)

    payment_method: str = Field("COD",     max_length=50)
    payment_status: str = Field("PENDING", max_length=50)

    tracking_status: str           = Field("PLACED", max_length=50)
    tracking_note:   Optional[str] = Field(None, max_length=1000)
    logistics:       Optional[str] = Field(None, max_length=200)
    tracking_id:     Optional[str] = Field(None, max_length=200)

    delivery_days:          Optional[int]      = Field(None, ge=0, le=365)
    expected_delivery_date: Optional[datetime] = None
    ordered_at:             Optional[datetime] = None

    # Groups all rows from the same checkout session.
    cart_session_id: Optional[str] = Field(None, max_length=100)

    # Item type — set by the service layer; clients may send it but it
    # will be validated and overridden if incorrect.
    item_type: str = Field(
        default=ItemType.PRODUCT,
        description="PRODUCT or CUSTOM_PRODUCT",
    )


# ─────────────────────────────────────────────────────────────
# Create
# ─────────────────────────────────────────────────────────────

class OrderCreate(OrderBase):
    order_number: Optional[str] = None


# ─────────────────────────────────────────────────────────────
# Update — admin patch
# ─────────────────────────────────────────────────────────────

class OrderUpdate(BaseModel):
    customer_name:  Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None

    tracking_status: Optional[str] = None
    tracking_note:   Optional[str] = None
    logistics:       Optional[str] = None
    tracking_id:     Optional[str] = None

    payment_status: Optional[str] = None


# ─────────────────────────────────────────────────────────────
# Response
# ─────────────────────────────────────────────────────────────

class OrderResponse(OrderBase):
    id:           int
    order_number: str

    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class OrderListResponse(BaseModel):
    """Paginated list of orders — replaces the bare List[OrderResponse]."""
    items:       List[OrderResponse]
    total:       int
    page:        int
    per_page:    int
    total_pages: int


# ─────────────────────────────────────────────────────────────
# Public tracking — strips all customer PII
# ─────────────────────────────────────────────────────────────

class OrderTrackingResponse(BaseModel):
    """
    Public-safe order tracking schema — no customer PII.
    Only fields a customer needs to track their own shipment.
    """
    order_number:           str
    product_name:           str
    quantity:               int
    size:                   Optional[str] = None
    color:                  Optional[str] = None
    tracking_status:        str
    tracking_note:          Optional[str] = None
    logistics:              Optional[str] = None
    tracking_id:            Optional[str] = None
    payment_status:         str
    ordered_at:             Optional[datetime] = None
    expected_delivery_date: Optional[datetime] = None

    model_config = {"from_attributes": True}
