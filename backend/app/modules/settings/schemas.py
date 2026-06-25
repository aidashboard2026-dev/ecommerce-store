from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, HttpUrl, field_validator, model_validator


class StoreSettingsBase(BaseModel):
    store_name: str = Field(..., min_length=2, max_length=150)
    store_url: HttpUrl
    support_email: EmailStr
    support_phone: Optional[str] = Field(default=None, max_length=30)
    description: Optional[str] = Field(default=None, max_length=1000)
    logo: Optional[str] = None
    country: str = Field(..., min_length=2, max_length=100)
    currency: str = Field(..., min_length=2, max_length=10)
    timezone: str = Field(..., min_length=2, max_length=100)
    weight_unit: str = Field(..., min_length=1, max_length=20)

    @field_validator("support_phone")
    @classmethod
    def validate_phone(cls, value: Optional[str]) -> Optional[str]:
        if not value:
            return value
        cleaned = value.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        if not cleaned.lstrip("+").isdigit():
            raise ValueError("Support phone must contain only digits, spaces, +, -, or parentheses.")
        return value


class StoreSettingsUpdate(BaseModel):
    store_name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    store_url: Optional[HttpUrl] = None
    support_email: Optional[EmailStr] = None
    support_phone: Optional[str] = Field(default=None, max_length=30)
    description: Optional[str] = Field(default=None, max_length=1000)
    logo: Optional[str] = None
    country: Optional[str] = Field(default=None, min_length=2, max_length=100)
    currency: Optional[str] = Field(default=None, min_length=2, max_length=10)
    timezone: Optional[str] = Field(default=None, min_length=2, max_length=100)
    weight_unit: Optional[str] = Field(default=None, min_length=1, max_length=20)

    @field_validator("support_phone")
    @classmethod
    def validate_phone(cls, value: Optional[str]) -> Optional[str]:
        return StoreSettingsBase.validate_phone(value)


class StoreSettingsResponse(StoreSettingsBase):
    id: int
    store_url: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AdminSecurityUpdate(BaseModel):
    username: Optional[str] = Field(default=None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    two_factor_enabled: Optional[bool] = None


class AdminSecurityResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    two_factor_enabled: bool
    email_verified: bool
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PasswordUpdate(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)

    @model_validator(mode="after")
    def passwords_match(self) -> "PasswordUpdate":
        if self.new_password != self.confirm_password:
            raise ValueError("New password and confirmation password do not match.")
        if self.current_password == self.new_password:
            raise ValueError("New password must be different from the current password.")
        return self


class PaymentMethodUpdate(BaseModel):
    fee: Optional[Decimal] = None
    is_active: Optional[bool] = None

class PaymentMethodResponse(BaseModel):
    id: int
    name: str
    description: str
    fee: Decimal
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationSettingUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    whatsapp_enabled: Optional[bool] = None


class NotificationSettingResponse(BaseModel):
    id: int
    event_name: str
    email_enabled: bool
    whatsapp_enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SettingsBundleResponse(BaseModel):
    settings: StoreSettingsResponse
    security: AdminSecurityResponse
