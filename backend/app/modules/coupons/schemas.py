from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class CouponCreate(BaseModel):
    code: str = Field(..., min_length=3, max_length=50)
    discount_percent: Decimal = Field(..., ge=0, le=100)
    max_discount: Optional[Decimal] = Field(default=None, ge=0)
    min_order: Decimal = Field(default=Decimal("0"), ge=0)
    max_uses: int = Field(default=0, ge=0)
    max_uses_per_user: int = Field(default=0, ge=0)
    is_active: bool = True
    valid_from: datetime
    valid_until: Optional[datetime] = None

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        return v.strip().upper()


class CouponUpdate(BaseModel):
    code: Optional[str] = Field(default=None, min_length=3, max_length=50)
    discount_percent: Optional[Decimal] = Field(default=None, ge=0, le=100)
    max_discount: Optional[Decimal] = Field(default=None, ge=0)
    min_order: Optional[Decimal] = Field(default=None, ge=0)
    max_uses: Optional[int] = Field(default=None, ge=0)
    max_uses_per_user: Optional[int] = Field(default=None, ge=0)
    is_active: Optional[bool] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return v.strip().upper()
        return v


class CouponResponse(BaseModel):
    id: int
    code: str
    discount_percent: Decimal
    max_discount: Optional[Decimal] = None
    min_order: Decimal
    max_uses: int
    max_uses_per_user: int
    is_active: bool
    valid_from: datetime
    valid_until: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CouponValidateRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    subtotal: Decimal = Field(..., ge=0)
    customer_email: Optional[str] = None

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        return v.strip().upper()


class CouponValidateResponse(BaseModel):
    valid: bool
    code: str
    discount_percent: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    message: str
