from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional
from app.core.constants import MIN_BANNER_TITLE_LENGTH, MAX_BANNER_TITLE_LENGTH


class BannerCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    banner_image: Optional[str] = None

    cta_text: Optional[str] = None
    cta_link: Optional[str] = None

    placement: str = "hero"
    sort_order: int = 0
    is_active: bool = True

    @field_validator("title")
    @classmethod
    def title_valid(cls, v):
        if v is None:
            raise ValueError("Banner title is required")
        v = v.strip()
        if not v:
            raise ValueError("Banner title cannot be empty or whitespace only")
        if len(v) < MIN_BANNER_TITLE_LENGTH or len(v) > MAX_BANNER_TITLE_LENGTH:
            raise ValueError(f"Banner title must be between {MIN_BANNER_TITLE_LENGTH} and {MAX_BANNER_TITLE_LENGTH} characters")
        return v


class BannerUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    banner_image: Optional[str] = None

    cta_text: Optional[str] = None
    cta_link: Optional[str] = None

    placement: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None

    @field_validator("title")
    @classmethod
    def title_valid(cls, v):
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Banner title cannot be empty or whitespace only")
            if len(v) < MIN_BANNER_TITLE_LENGTH or len(v) > MAX_BANNER_TITLE_LENGTH:
                raise ValueError(f"Banner title must be between {MIN_BANNER_TITLE_LENGTH} and {MAX_BANNER_TITLE_LENGTH} characters")
        return v


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