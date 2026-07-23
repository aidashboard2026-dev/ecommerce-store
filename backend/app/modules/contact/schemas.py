"""
app/modules/contact/schemas.py

Pydantic schemas for contact message API requests and responses.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


class ContactMessageBase(BaseModel):
    """Base schema with common contact message fields."""
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    subject: str = Field(..., min_length=1, max_length=500)
    message: str = Field(..., min_length=1, max_length=5000)
    phone: Optional[str] = Field(None, max_length=50)


class ContactMessageCreate(ContactMessageBase):
    """Schema for creating a new contact message."""
    website: Optional[str] = Field(None, max_length=500)
    recaptcha_token: Optional[str] = Field(None, max_length=2000)


class ContactMessageReply(BaseModel):
    """Schema for sending a reply to a contact message."""
    reply_message: str = Field(..., min_length=1, max_length=5000)


class ContactMessageUpdate(BaseModel):
    """Schema for updating contact message status."""
    status: str = Field(..., pattern="^(New|Pending|Replied|Closed)$")


class ContactMessageResponse(ContactMessageBase):
    """Schema for contact message response."""
    id: int
    status: str
    admin_reply: Optional[str] = None
    replied_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    admin_id: Optional[int] = None

    class Config:
        from_attributes = True


class ContactMessageDetailResponse(ContactMessageResponse):
    """Extended response with all details."""
    pass


class ContactMessageListResponse(BaseModel):
    """Schema for paginated list of contact messages."""
    items: List[ContactMessageResponse]
    total: int
    page: int
    page_size: int
    pages: int

    class Config:
        from_attributes = True


class ContactMessageListItem(BaseModel):
    """Simplified item for list view."""
    id: int
    name: str
    email: str
    subject: str
    status: str
    created_at: datetime
    replied_at: Optional[datetime] = None

    class Config:
        from_attributes = True
