from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class BannerCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    banner_image: Optional[str] = None

    cta_text: Optional[str] = None
    cta_link: Optional[str] = None

    placement: str = "hero"
    sort_order: int = 0
    is_active: bool = True


class BannerUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    banner_image: Optional[str] = None

    cta_text: Optional[str] = None
    cta_link: Optional[str] = None

    placement: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class BannerResponse(BaseModel):
    id: int
    title: str
    subtitle: Optional[str] = None
    banner_image: Optional[str] = None

    cta_text: Optional[str] = None
    cta_link: Optional[str] = None

    placement: str
    sort_order: int
    is_active: bool

    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True