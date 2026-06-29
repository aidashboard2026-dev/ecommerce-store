"""
app/modules/custom_products/schemas.py

Pydantic schemas for the Custom Products domain.

DOMAIN BOUNDARY RULES (NON-NEGOTIABLE):
- This module MUST NOT import from app.modules.products.
- All Category schemas here are for CustomCategory (custom_categories table).
- These schemas MUST NEVER be used inside the products module.
"""
from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List, Any
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from pydantic import Field


# ─────────────────────────────────────────────────────────────────────────────
# Custom Category Schemas
# These belong ONLY to the Custom Products domain.
# They represent rows in the custom_categories table — NOT products.categories.
# ─────────────────────────────────────────────────────────────────────────────

class CustomCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "active"
    sort_order: int = 0


class CustomCategoryCreate(CustomCategoryBase):
    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Category name is required")
        if len(v) > 100:
            raise ValueError("Category name must be 100 characters or fewer")
        return v

    @field_validator("status")
    @classmethod
    def status_valid(cls, v: str) -> str:
        if v not in ("active", "inactive"):
            raise ValueError("status must be 'active' or 'inactive'")
        return v


class CustomCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    sort_order: Optional[int] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Category name is required")
            if len(v) > 100:
                raise ValueError("Category name must be 100 characters or fewer")
        return v

    @field_validator("status")
    @classmethod
    def status_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("active", "inactive"):
            raise ValueError("status must be 'active' or 'inactive'")
        return v


class CustomCategoryResponse(CustomCategoryBase):
    id: int
    slug: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Custom Product Schemas
# ─────────────────────────────────────────────────────────────────────────────

class CustomProductBase(BaseModel):
    title: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    # Custom Products use custom_category_id (FK to custom_categories),
    # NOT category_id (which would point to products.categories).
    custom_category_id: Optional[int] = None
    tags: List[str] = Field(default_factory=list)
    sku: Optional[str] = None
    status: str = "draft"
    is_featured:    bool = False
    is_trending:    bool = False
    is_best_seller: bool = False
    is_new_arrival: bool = False
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    # Price range — Custom Products are production-based, not variant-based
    original_price_min: Decimal
    original_price_max: Decimal
    selling_price_min: Decimal
    selling_price_max: Decimal
    # Image fields
    thumbnail:        Optional[str] = None
    image_front:      Optional[str] = None
    image_back:       Optional[str] = None
    image_size_chart: Optional[str] = None
    gallery_images:   List[str] = Field(default_factory=list)
    # WhatsApp lead generation message — pre-filled in the WhatsApp quotation link
    whatsapp_message: Optional[str] = None


class CustomProductCreate(CustomProductBase):
    @field_validator("title")
    @classmethod
    def title_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Product title must be at least 2 characters")
        if len(v) > 200:
            raise ValueError("Product title must be 200 characters or fewer")
        return v

    @field_validator("tags")
    @classmethod
    def sanitize_tags(cls, v: List[str]) -> List[str]:
        if v is None:
            return []
        return [t.strip() for t in v if t and t.strip()]

    @field_validator("status")
    @classmethod
    def status_valid(cls, v: str) -> str:
        allowed = {"draft", "published", "archived"}
        if v not in allowed:
            raise ValueError(f"status must be one of: {', '.join(allowed)}")
        return v

    @field_validator("original_price_min", "original_price_max", "selling_price_min", "selling_price_max", mode="before")
    @classmethod
    def coerce_price(cls, v) -> Decimal:
        return Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @model_validator(mode="after")
    def validate_price_range(self):
        if self.original_price_min > self.original_price_max:
            raise ValueError("original_price_min cannot exceed original_price_max")
        if self.selling_price_min > self.selling_price_max:
            raise ValueError("selling_price_min cannot exceed selling_price_max")
        return self


class CustomProductUpdate(BaseModel):
    title:             Optional[str] = None
    description:       Optional[str] = None
    short_description: Optional[str] = None
    custom_category_id: Optional[int] = None
    tags:              Optional[List[str]] = None
    status:            Optional[str] = None
    sku:               Optional[str] = None
    is_featured:       Optional[bool] = None
    is_trending:       Optional[bool] = None
    is_best_seller:    Optional[bool] = None
    is_new_arrival:    Optional[bool] = None
    seo_title:         Optional[str] = None
    seo_description:   Optional[str] = None
    original_price_min: Optional[Decimal] = None
    original_price_max: Optional[Decimal] = None
    selling_price_min:  Optional[Decimal] = None
    selling_price_max:  Optional[Decimal] = None
    whatsapp_message:   Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) < 2:
                raise ValueError("Product title must be at least 2 characters")
            if len(v) > 200:
                raise ValueError("Product title must be 200 characters or fewer")
        return v

    @field_validator("tags")
    @classmethod
    def sanitize_tags(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is not None:
            return [t.strip() for t in v if t and t.strip()]
        return v

    @field_validator("status")
    @classmethod
    def status_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            allowed = {"draft", "published", "archived"}
            if v not in allowed:
                raise ValueError(f"status must be one of: {', '.join(allowed)}")
        return v

    @field_validator("original_price_min", "original_price_max", "selling_price_min", "selling_price_max", mode="before")
    @classmethod
    def coerce_price(cls, v) -> Optional[Decimal]:
        if v is None:
            return v
        return Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class CustomProductResponse(BaseModel):
    id:               int
    title:            str
    slug:             str
    description:      Optional[str] = None
    short_description: Optional[str] = None
    custom_category_id: Optional[int] = None
    custom_category_name: Optional[str] = None
    tags:             List[str] = Field(default_factory=list)
    sku:              Optional[str] = None
    status:           str = "draft"
    is_featured:      bool = False
    is_trending:      bool = False
    is_best_seller:   bool = False
    is_new_arrival:   bool = False
    seo_title:        Optional[str] = None
    seo_description:  Optional[str] = None
    original_price_min: Optional[Decimal] = None
    original_price_max: Optional[Decimal] = None
    selling_price_min:  Optional[Decimal] = None
    selling_price_max:  Optional[Decimal] = None
    thumbnail:         Optional[str] = None
    image_front:       Optional[str] = None
    image_back:        Optional[str] = None
    image_size_chart:  Optional[str] = None
    gallery_images:    List[Any] = Field(default_factory=list)
    whatsapp_message:  Optional[str] = None
    view_count:        int = 0
    orders_count:      int = 0
    sales_count:       int = 0
    created_at:        datetime
    updated_at:        Optional[datetime] = None

    @field_validator("status", mode="before")
    @classmethod
    def coerce_status_to_str(cls, v):
        if hasattr(v, "value"):
            return v.value
        return v

    @field_validator(
        "original_price_min", "original_price_max",
        "selling_price_min", "selling_price_max",
        mode="before",
    )
    @classmethod
    def coerce_decimal(cls, v):
        if v is None:
            return v
        return Decimal(str(v))

    class Config:
        from_attributes = True
        use_enum_values = True


class CustomProductListResponse(BaseModel):
    items:       List[CustomProductResponse]
    total:       int
    page:        int
    per_page:    int
    total_pages: int


# ─────────────────────────────────────────────────────────────────────────────
# Bulk action schemas (custom products only)
# ─────────────────────────────────────────────────────────────────────────────

class CustomProductBulkActionPayload(BaseModel):
    product_ids:       List[int]
    action:            str   # "publish" | "unpublish" | "archive" | "delete" | "move_category"
    custom_category_id: Optional[int] = None

    @field_validator("action")
    @classmethod
    def action_valid(cls, v: str) -> str:
        allowed = {"publish", "unpublish", "archive", "delete", "move_category"}
        if v not in allowed:
            raise ValueError(f"action must be one of: {', '.join(allowed)}")
        return v

    @field_validator("product_ids")
    @classmethod
    def ids_not_empty(cls, v: List[int]) -> List[int]:
        if not v:
            raise ValueError("product_ids must not be empty")
        return v