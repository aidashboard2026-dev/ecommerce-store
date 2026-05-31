from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class OrderBase(BaseModel):
    customer: str
    items: int = Field(default=1, ge=1)
    total: float = Field(default=0, ge=0)
    status: str = "pending"
    payment: str = "Paid"
    ordered_at: Optional[datetime] = None


class OrderCreate(OrderBase):
    order_number: Optional[str] = None


class OrderUpdate(BaseModel):
    customer: Optional[str] = None
    items: Optional[int] = Field(default=None, ge=1)
    total: Optional[float] = Field(default=None, ge=0)
    status: Optional[str] = None
    payment: Optional[str] = None
    ordered_at: Optional[datetime] = None


class OrderResponse(OrderBase):
    id: int
    order_number: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
