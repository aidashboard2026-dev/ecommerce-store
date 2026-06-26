from pydantic import BaseModel
from datetime import date, time, datetime
from typing import Optional


class OfferCreate(BaseModel):
    title: Optional[str] = None
    percentage: Optional[str] = None
    
    description: Optional[str] = None
    banner_image: Optional[str] = None

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
    banner_image: Optional[str] = None

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