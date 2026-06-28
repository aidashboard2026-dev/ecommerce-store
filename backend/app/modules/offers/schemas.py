from pydantic import BaseModel, field_validator
from datetime import date, time, datetime
from typing import Optional
from app.core.constants import MIN_OFFER_TITLE_LENGTH, MAX_OFFER_TITLE_LENGTH


class OfferCreate(BaseModel):
    title: Optional[str] = None
    percentage: Optional[str] = None
    
    description: Optional[str] = None
    item_align: Optional[str] = "left"
    text_align: Optional[str] = "left"
    banner_image: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_valid(cls, v):
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Offer title cannot be empty or whitespace only")
            if len(v) < MIN_OFFER_TITLE_LENGTH or len(v) > MAX_OFFER_TITLE_LENGTH:
                raise ValueError(f"Offer title must be between {MIN_OFFER_TITLE_LENGTH} and {MAX_OFFER_TITLE_LENGTH} characters")
        return v

    status: str = "saved"

    start_date: date
    end_date: date

    start_time: time
    end_time: time

    published_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    


class OfferUpdate(BaseModel):
    title: Optional[str] = None
    percentage: Optional[str] = None

    description: Optional[str] = None
    item_align: Optional[str] = None
    text_align: Optional[str] = None
    banner_image: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_valid(cls, v):
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Offer title cannot be empty or whitespace only")
            if len(v) < MIN_OFFER_TITLE_LENGTH or len(v) > MAX_OFFER_TITLE_LENGTH:
                raise ValueError(f"Offer title must be between {MIN_OFFER_TITLE_LENGTH} and {MAX_OFFER_TITLE_LENGTH} characters")
        return v

    status: Optional[str] = None

    start_date: Optional[date] = None
    end_date: Optional[date] = None

    start_time: Optional[time] = None
    end_time: Optional[time] = None

    published_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class OfferResponse(BaseModel):
    id: int
    title: str
    percentage: str
    description: Optional[str] = None
    item_align: Optional[str] = "left"
    text_align: Optional[str] = "left"
    banner_image: Optional[str] = None
    status: str

    start_date: date
    end_date: date

    start_time: time
    end_time: time

    published_at: datetime | None = None
    expires_at: datetime | None = None

    class Config:
        from_attributes = True