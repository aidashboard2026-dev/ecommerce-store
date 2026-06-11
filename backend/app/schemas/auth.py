from pydantic import BaseModel, EmailStr, Field
from datetime import date
from typing import Optional


class SignupRequest(BaseModel):
    first_name: str = Field(min_length=2, max_length=50)
    last_name: str = Field(min_length=2, max_length=50)
    email: EmailStr
    phone: Optional[str] = Field(None, min_length=10, max_length=20)  # FIX C-4
    dob: date
    password: str = Field(min_length=8, max_length=128)


class CustomerLoginRequest(BaseModel):
    email: EmailStr
    password: str