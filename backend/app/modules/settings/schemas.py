from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, HttpUrl, field_validator, model_validator

SUPPORTED_COUNTRIES = [
    "India",
    "United States",
    "United Kingdom",
    "Canada",
    "Australia",
    "Singapore",
    "United Arab Emirates",
]
SUPPORTED_CURRENCIES = ["INR", "USD", "GBP", "CAD", "AUD", "SGD", "AED"]
SUPPORTED_TIMEZONES = [
    "Asia/Kolkata",
    "UTC",
    "America/New_York",
    "America/Los_Angeles",
    "Europe/London",
    "Asia/Singapore",
    "Asia/Dubai",
]
SUPPORTED_WEIGHT_UNITS = ["kg", "g", "lb", "oz"]


class StoreSettingsBase(BaseModel):
    store_name: str = Field(..., min_length=2, max_length=150)
    store_url: HttpUrl
    support_email: EmailStr
    support_phone: Optional[str] = Field(default=None, max_length=30)
    description: Optional[str] = Field(default=None, max_length=1000)
    store_location: Optional[str] = Field(default=None, max_length=1000)
    logo: Optional[str] = None
    country: str = Field(..., min_length=2, max_length=100)
    currency: str = Field(..., min_length=2, max_length=10)
    timezone: str = Field(..., min_length=2, max_length=100)
    weight_unit: str = Field(..., min_length=1, max_length=20)

    @field_validator("store_name", "country", "currency", "timezone", "weight_unit", mode="before")
    @classmethod
    def strip_and_validate_non_empty(cls, value: str) -> str:
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                raise ValueError("Value cannot be empty or whitespace-only.")
            return stripped
        return value

    @field_validator("support_phone")
    @classmethod
    def validate_phone(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        stripped = value.strip()
        if not stripped:
            return None
        cleaned = stripped.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        if not cleaned.lstrip("+").isdigit():
            raise ValueError("Support phone must contain only digits, spaces, +, -, or parentheses.")
        return stripped

    @field_validator("country")
    @classmethod
    def validate_country(cls, value: str) -> str:
        if value not in SUPPORTED_COUNTRIES:
            raise ValueError(f"Country must be one of: {', '.join(SUPPORTED_COUNTRIES)}")
        return value

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, value: str) -> str:
        if value not in SUPPORTED_CURRENCIES:
            raise ValueError(f"Currency must be one of: {', '.join(SUPPORTED_CURRENCIES)}")
        return value

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        if value not in SUPPORTED_TIMEZONES:
            raise ValueError(f"Timezone must be one of: {', '.join(SUPPORTED_TIMEZONES)}")
        return value

    @field_validator("weight_unit")
    @classmethod
    def validate_weight_unit(cls, value: str) -> str:
        if value not in SUPPORTED_WEIGHT_UNITS:
            raise ValueError(f"Weight unit must be one of: {', '.join(SUPPORTED_WEIGHT_UNITS)}")
        return value


class StoreSettingsUpdate(BaseModel):
    store_name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    store_url: Optional[HttpUrl] = None
    support_email: Optional[EmailStr] = None
    support_phone: Optional[str] = Field(default=None, max_length=30)
    description: Optional[str] = Field(default=None, max_length=1000)
    store_location: Optional[str] = Field(default=None, max_length=1000)
    logo: Optional[str] = None
    country: Optional[str] = Field(default=None, min_length=2, max_length=100)
    currency: Optional[str] = Field(default=None, min_length=2, max_length=10)
    timezone: Optional[str] = Field(default=None, min_length=2, max_length=100)
    weight_unit: Optional[str] = Field(default=None, min_length=1, max_length=20)

    @field_validator("store_name", "country", "currency", "timezone", "weight_unit", mode="before")
    @classmethod
    def strip_and_validate_non_empty(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                raise ValueError("Value cannot be empty or whitespace-only.")
            return stripped
        return value

    @field_validator("support_phone")
    @classmethod
    def validate_phone(cls, value: Optional[str]) -> Optional[str]:
        return StoreSettingsBase.validate_phone(value)

    @field_validator("country")
    @classmethod
    def validate_country(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if value not in SUPPORTED_COUNTRIES:
            raise ValueError(f"Country must be one of: {', '.join(SUPPORTED_COUNTRIES)}")
        return value

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if value not in SUPPORTED_CURRENCIES:
            raise ValueError(f"Currency must be one of: {', '.join(SUPPORTED_CURRENCIES)}")
        return value

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if value not in SUPPORTED_TIMEZONES:
            raise ValueError(f"Timezone must be one of: {', '.join(SUPPORTED_TIMEZONES)}")
        return value

    @field_validator("weight_unit")
    @classmethod
    def validate_weight_unit(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if value not in SUPPORTED_WEIGHT_UNITS:
            raise ValueError(f"Weight unit must be one of: {', '.join(SUPPORTED_WEIGHT_UNITS)}")
        return value


class StoreSettingsResponse(StoreSettingsBase):
    id: int
    store_url: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    @model_validator(mode="after")
    def add_cache_buster_to_logo(self) -> "StoreSettingsResponse":
        if self.logo:
            if "?t=" not in self.logo:
                ts = int(self.updated_at.timestamp()) if self.updated_at else int(datetime.utcnow().timestamp())
                self.logo = f"{self.logo}?t={ts}"
        return self

    class Config:
        from_attributes = True


class AdminSecurityUpdate(BaseModel):
    username: Optional[str] = Field(default=None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    two_factor_enabled: Optional[bool] = None
    current_password: Optional[str] = None

    @field_validator("username", mode="before")
    @classmethod
    def validate_username(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                raise ValueError("Username cannot be empty or whitespace-only.")
            if len(stripped) < 2:
                raise ValueError("Username must be at least 2 characters.")
            return stripped
        return value


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

    @field_validator("current_password", "new_password", "confirm_password", mode="before")
    @classmethod
    def validate_passwords(cls, value: str) -> str:
        if isinstance(value, str) and not value.strip():
            raise ValueError("Password cannot be empty or whitespace-only.")
        return value

    @model_validator(mode="after")
    def passwords_match(self) -> "PasswordUpdate":
        if self.new_password != self.confirm_password:
            raise ValueError("New password and confirmation password do not match.")
        if self.current_password == self.new_password:
            raise ValueError("New password must be different from the current password.")
        return self


class PaymentMethodUpdate(BaseModel):
    description: Optional[str] = Field(default=None, max_length=500)
    fee: Optional[Decimal] = Field(default=Decimal("0.00"), ge=0)
    is_active: Optional[bool] = None

    @field_validator("fee", mode="before")
    @classmethod
    def validate_fee(cls, value):
        if value is None or str(value).strip() == "":
            return Decimal("0.00")
        try:
            val = Decimal(str(value))
        except Exception:
            raise ValueError("Fee must be a valid number.")
        if val < 0:
            raise ValueError("Fee cannot be negative.")
        return val

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
