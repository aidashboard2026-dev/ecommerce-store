from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, field_validator, model_validator


class HomepageCategoryBase(BaseModel):
    name: str
    image: str
    path: Optional[str] = None
    destination_type: Optional[str] = None
    destination_id: Optional[int] = None

    @field_validator("name")
    @classmethod
    def name_required(cls, value: str) -> str:
        value = (value or "").strip()
        if not value:
            raise ValueError("Category name is required")
        if len(value) > 100:
            raise ValueError("Category name must be 100 characters or fewer")
        return value

    @field_validator("image")
    @classmethod
    def image_required(cls, value: str) -> str:
        value = (value or "").strip()
        if not value:
            raise ValueError("Category image is required")
        if len(value) > 500:
            raise ValueError("Category image must be 500 characters or fewer")
        return value

    @field_validator("path")
    @classmethod
    def path_required(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            return None
        if not value.startswith("/"):
            raise ValueError("Click path must start with /")
        if len(value) > 500:
            raise ValueError("Click path must be 500 characters or fewer")
        return value


class HomepageCategoryCreate(HomepageCategoryBase):
    pass


class HomepageCategoryUpdate(BaseModel):
    name: str | None = None
    image: str | None = None
    path: str | None = None
    destination_type: str | None = None
    destination_id: int | None = None

    @field_validator("name")
    @classmethod
    def name_valid(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Category name is required")
        if len(value) > 100:
            raise ValueError("Category name must be 100 characters or fewer")
        return value

    @field_validator("image")
    @classmethod
    def image_valid(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Category image is required")
        if len(value) > 500:
            raise ValueError("Category image must be 500 characters or fewer")
        return value

    @field_validator("path")
    @classmethod
    def path_valid(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            return None
        if not value.startswith("/"):
            raise ValueError("Click path must start with /")
        if len(value) > 500:
            raise ValueError("Click path must be 500 characters or fewer")
        return value


class HomepageCategoryResponse(HomepageCategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime | None = None
    click_path: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def resolve_image_url(cls, data: Any) -> Any:
        from app.shared.storage.supabase_storage import get_category_image_url

        if isinstance(data, dict):
            data["image"] = get_category_image_url(data.get("image"))
            data["click_path"] = data.get("path")
        else:
            d = {}
            for field in cls.model_fields.keys():
                if field == "click_path":
                    continue
                if hasattr(data, field):
                    d[field] = getattr(data, field)
            d["image"] = get_category_image_url(d.get("image"))
            d["click_path"] = getattr(data, "path", None)
            return d
        return data

    class Config:
        from_attributes = True

