"""
app/modules/orders/schemas.py

Order domain Pydantic schemas.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Any

from pydantic import BaseModel, EmailStr, Field, model_validator

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
    shipping_fee: Decimal = Field(default=Decimal("0.00"), ge=0)
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

    # Razorpay Payment Fields
    razorpay_order_id: Optional[str] = Field(None, max_length=100)
    razorpay_payment_id: Optional[str] = Field(None, max_length=100)
    razorpay_signature: Optional[str] = Field(None, max_length=200)
    payment_verified_at: Optional[datetime] = None

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

    @model_validator(mode="before")
    @classmethod
    def resolve_image_url(cls, data: Any) -> Any:
        from app.shared.storage.supabase_storage import get_product_image_url
        if isinstance(data, dict):
            data["product_image"] = get_product_image_url(data.get("product_image"))
            return data
        
        d = {}
        for field in cls.model_fields.keys():
            if hasattr(data, field):
                d[field] = getattr(data, field)
        d["product_image"] = get_product_image_url(getattr(data, "product_image", None))
        return d


class OrderStats(BaseModel):

    total_orders:int

    new_orders:int

    processing:int

    shipped:int

    delivered:int

    cancelled:int


class OrderListResponse(BaseModel):

    items:list[OrderResponse]

    total:int

    page:int

    per_page:int

    total_pages:int

    stats:OrderStats
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
    product_image:          Optional[str] = None
    quantity:               int
    size:                   Optional[str] = None
    color:                  Optional[str] = None
    total_amount:           float
    shipping_fee:           float
    tracking_status:        str
    tracking_note:          Optional[str] = None
    logistics:              Optional[str] = None
    tracking_id:            Optional[str] = None
    payment_status:         str
    ordered_at:             Optional[datetime] = None
    expected_delivery_date: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def resolve_image_url(cls, data: Any) -> Any:
        from app.shared.storage.supabase_storage import get_product_image_url
        if isinstance(data, dict):
            data["product_image"] = get_product_image_url(data.get("product_image"))
            return data
        
        d = {}
        for field in cls.model_fields.keys():
            if hasattr(data, field):
                d[field] = getattr(data, field)
        d["product_image"] = get_product_image_url(getattr(data, "product_image", None))
        return d


# ─────────────────────────────────────────────────────────────
# Razorpay Schemas
# ─────────────────────────────────────────────────────────────

class RazorpayOrderCreateRequest(BaseModel):
    cart_session_id: str = Field(..., min_length=1, max_length=100)


class RazorpayOrderCreateResponse(BaseModel):
    id: str
    amount: int
    currency: str
    key: Optional[str] = None
    receipt: Optional[str] = None
    status: Optional[str] = None


class RazorpayPaymentVerifyRequest(BaseModel):
    cart_session_id: str = Field(..., min_length=1, max_length=100)
    razorpay_order_id: str = Field(..., min_length=1, max_length=100)
    razorpay_payment_id: str = Field(..., min_length=1, max_length=100)
    razorpay_signature: str = Field(..., min_length=1, max_length=200)

