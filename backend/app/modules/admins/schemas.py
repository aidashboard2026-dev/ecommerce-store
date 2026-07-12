from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime


class AdminBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    role: Optional[str] = "admin"

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v):
        if v not in ("admin", "superadmin"):
            raise ValueError("role must be 'admin' or 'superadmin'")
        return v


class AdminCreate(AdminBase):
    password: str = Field(..., min_length=8, max_length=128)


class AdminUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8, max_length=128)

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v):
        if v is not None and v not in ("admin", "superadmin"):
            raise ValueError("role must be 'admin' or 'superadmin'")
        return v


class AdminResponse(AdminBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    admin: Optional[AdminResponse] = None
    auth_type: Optional[str] = "admin"


class TokenData(BaseModel):
    sub: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
