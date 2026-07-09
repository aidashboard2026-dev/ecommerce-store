from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, field_validator


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _parse_tags(raw: Optional[str]) -> List[str]:
    """Convert comma-separated tag string → sorted, deduped list."""
    if not raw:
        return []
    return sorted({t.strip().lower() for t in raw.split(",") if t.strip()})


def _tags_to_str(tags: List[str]) -> str:
    return ",".join(sorted({t.strip().lower() for t in tags if t.strip()}))


# ─── Request schemas ──────────────────────────────────────────────────────────

class CustomerCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    dob: Optional[date] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None

    @field_validator("first_name", "last_name", mode="before")
    @classmethod
    def strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be blank")
        return v


class CustomerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    dob: Optional[date] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class CustomerStatusUpdate(BaseModel):
    is_active: bool


class CustomerTagsUpdate(BaseModel):
    tags: List[str]


class CustomerNoteUpdate(BaseModel):
    notes: str


# ─── Analytics sub-schemas ────────────────────────────────────────────────────

class CustomerSpendingOverview(BaseModel):
    total_orders: int
    total_spent: float
    average_order_value: float
    last_order_date: Optional[datetime]
    last_order_id: Optional[int]


# ─── Order summary (shown inside customer profile) ────────────────────────────

class CustomerOrderSummary(BaseModel):
    id: int
    order_number: str
    product_name: str
    product_image: Optional[str]
    total_amount: float
    tracking_status: str
    payment_status: str
    ordered_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Response schemas ─────────────────────────────────────────────────────────

class CustomerResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    dob: Optional[date]
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    pincode: Optional[str] = None
    photo_url: Optional[str] = None
    google_name: Optional[str] = None
    firebase_uid: Optional[str] = None
    auth_provider: Optional[str] = None
    email_verified: bool = False
    is_active: bool
    tags: List[str] = []
    city: Optional[str]
    state: Optional[str]
    country: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    # Aggregated from orders — computed by service, not stored
    total_orders: int = 0
    total_spent: float = 0.0
    average_order_value: float = 0.0
    last_order_date: Optional[datetime] = None

    @classmethod
    def from_orm_with_stats(cls, customer, stats: dict) -> "CustomerResponse":
        obj = cls.model_validate(customer)
        obj.total_orders = stats.get("total_orders", 0)
        obj.total_spent = stats.get("total_spent", 0.0)
        obj.average_order_value = stats.get("average_order_value", 0.0)
        obj.last_order_date = stats.get("last_order_date")
        return obj

    @field_validator("tags", mode="before")
    @classmethod
    def coerce_tags(cls, v):
        if isinstance(v, str):
            return _parse_tags(v)
        if v is None:
            return []
        return v

    model_config = {"from_attributes": True}


class CustomerListResponse(BaseModel):
    items: List[CustomerResponse]
    total: int
    page: int
    per_page: int
    pages: int


class CustomerProfileResponse(CustomerResponse):
    recent_orders: List[CustomerOrderSummary] = []
    spending_overview: Optional[CustomerSpendingOverview] = None
