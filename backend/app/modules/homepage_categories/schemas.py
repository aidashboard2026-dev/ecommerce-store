from datetime import datetime

from pydantic import BaseModel, field_validator


class HomepageCategoryBase(BaseModel):
    name: str
    image: str
    path: str

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
    def path_required(cls, value: str) -> str:
        value = (value or "").strip()
        if not value:
            raise ValueError("Click path is required")
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
            raise ValueError("Click path is required")
        if not value.startswith("/"):
            raise ValueError("Click path must start with /")
        if len(value) > 500:
            raise ValueError("Click path must be 500 characters or fewer")
        return value


class HomepageCategoryResponse(HomepageCategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True

