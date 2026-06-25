from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List, Any
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP


# ── Category Schemas ─────────────────────────────────────────────────────────

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "active"
    sort_order: int = 0


class CategoryCreate(CategoryBase):
    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Category name is required")
        if len(v) > 100:
            raise ValueError("Category name must be 100 characters or fewer")
        return v

    @field_validator("status")
    @classmethod
    def status_valid(cls, v):
        if v not in ("active", "inactive"):
            raise ValueError("status must be 'active' or 'inactive'")
        return v


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    sort_order: Optional[int] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Category name is required")
            if len(v) > 100:
                raise ValueError("Category name must be 100 characters or fewer")
        return v

    @field_validator("status")
    @classmethod
    def status_valid(cls, v):
        if v is not None and v not in ("active", "inactive"):
            raise ValueError("status must be 'active' or 'inactive'")
        return v


class CategoryResponse(CategoryBase):
    id: int
    slug: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Collection Schemas ───────────────────────────────────────────────────────

class CollectionBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "active"
    category_id: Optional[int] = None


class CollectionCreate(CollectionBase):
    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Collection name is required")
        if len(v) > 100:
            raise ValueError("Collection name must be 100 characters or fewer")
        return v

    @field_validator("status")
    @classmethod
    def status_valid(cls, v):
        if v not in ("active", "inactive"):
            raise ValueError("status must be 'active' or 'inactive'")
        return v


class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    category_id: Optional[int] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Collection name is required")
            if len(v) > 100:
                raise ValueError("Collection name must be 100 characters or fewer")
        return v


class CollectionResponse(CollectionBase):
    id: int
    slug: str
    category_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Variant Schemas ──────────────────────────────────────────────────────────

class VariantBase(BaseModel):
    size: str
    color: Optional[str] = None
    color_hex: Optional[str] = None
    sku: Optional[str] = None
    original_price: Decimal
    selling_price: Decimal
    discount_percentage: Decimal = Decimal("0")
    stock_quantity: int = 0
    reserved_stock: int = 0
    low_stock_threshold: int = 5


class VariantCreate(VariantBase):
    @field_validator("original_price", "selling_price", mode="before")
    @classmethod
    def coerce_and_round_price(cls, v):
        return Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @field_validator("discount_percentage", mode="before")
    @classmethod
    def coerce_discount(cls, v):
        return Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @field_validator("original_price")
    @classmethod
    def original_price_positive(cls, v):
        if v <= 0:
            raise ValueError("original_price must be greater than zero")
        return v

    @field_validator("selling_price")
    @classmethod
    def selling_price_positive(cls, v):
        if v <= 0:
            raise ValueError("selling_price must be greater than zero")
        return v

    @field_validator("stock_quantity")
    @classmethod
    def stock_nonnegative(cls, v):
        if v < 0:
            raise ValueError("stock_quantity cannot be negative")
        return v

    @field_validator("size")
    @classmethod
    def size_not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("size is required")
        return v

    @field_validator("sku")
    @classmethod
    def sku_strip(cls, v):
        if v is not None:
            v = v.strip()
            return v if v else None
        return v

    @model_validator(mode="after")
    def selling_lte_original(self):
        if self.selling_price > self.original_price:
            raise ValueError(
                f"selling_price ({self.selling_price}) cannot exceed "
                f"original_price ({self.original_price})"
            )
        return self


class VariantResponse(VariantBase):
    id: int
    product_id: int
    available_stock: int = 0
    inventory_status: str = "in_stock"
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_validator("original_price", "selling_price", "discount_percentage", mode="before")
    @classmethod
    def coerce_to_decimal(cls, v):
        if v is None:
            return v
        return Decimal(str(v))

    class Config:
        from_attributes = True


class BulkVariantCreate(BaseModel):
    variants: List[VariantCreate]


# ── Product Schemas ──────────────────────────────────────────────────────────

class ProductBase(BaseModel):
    title: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    # Legacy free-text collection kept for backward compat
    collection: Optional[str] = None
    sub_collection: Optional[str] = None
    # New FK-based classification
    category_id: Optional[int] = None
    collection_id: Optional[int] = None
    tags: List[str] = []
    status: str = "draft"
    is_featured:    bool = False
    is_trending:    bool = False
    is_best_seller: bool = False
    is_new_arrival: bool = False
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None


class ProductCreate(ProductBase):
    @field_validator("title")
    @classmethod
    def title_valid(cls, v):
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Product title must be at least 2 characters")
        if len(v) > 200:
            raise ValueError("Product title must be 200 characters or fewer")
        return v

    @field_validator("tags")
    @classmethod
    def sanitize_tags(cls, v):
        if v is None:
            return []
        return [t.strip() for t in v if t and t.strip()]

    @field_validator("status")
    @classmethod
    def status_valid(cls, v):
        allowed = {"draft", "published", "archived"}
        if v not in allowed:
            raise ValueError(f"status must be one of: {', '.join(allowed)}")
        return v


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    collection: Optional[str] = None
    sub_collection: Optional[str] = None
    category_id: Optional[int] = None
    collection_id: Optional[int] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    is_featured:    Optional[bool] = None
    is_trending:    Optional[bool] = None
    is_best_seller: Optional[bool] = None
    is_new_arrival: Optional[bool] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_valid(cls, v):
        if v is not None:
            v = v.strip()
            if len(v) < 2:
                raise ValueError("Product title must be at least 2 characters")
            if len(v) > 200:
                raise ValueError("Product title must be 200 characters or fewer")
        return v

    @field_validator("tags")
    @classmethod
    def sanitize_tags(cls, v):
        if v is not None:
            return [t.strip() for t in v if t and t.strip()]
        return v

    @field_validator("status")
    @classmethod
    def status_valid(cls, v):
        if v is not None:
            allowed = {"draft", "published", "archived"}
            if v not in allowed:
                raise ValueError(f"status must be one of: {', '.join(allowed)}")
        return v


class ProductResponse(ProductBase):
    id: int
    slug: str
    thumbnail:        Optional[str] = None
    image_front:      Optional[str] = None
    image_back:       Optional[str] = None
    image_size_chart: Optional[str] = None
    gallery_images:   List[Any] = []
    images:           List[Any] = []   # legacy alias kept so storefront doesn't break
    total_stock:  int = 0
    min_price:    Optional[Decimal] = None
    view_count:   int = 0
    orders_count: int = 0
    sales_count:  int = 0
    # resolved category/collection names for display
    category_name:   Optional[str] = None
    collection_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    variants: List[VariantResponse] = []

    @field_validator("status", mode="before")
    @classmethod
    def coerce_status_to_str(cls, v):
        if hasattr(v, "value"):
            return v.value
        return v

    @field_validator("min_price", mode="before")
    @classmethod
    def coerce_min_price(cls, v):
        if v is None:
            return v
        return Decimal(str(v))

    class Config:
        from_attributes = True
        use_enum_values = True


class ProductListResponse(BaseModel):
    items: List[ProductResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# ── Bulk action schemas ──────────────────────────────────────────────────────

class BulkActionPayload(BaseModel):
    product_ids: List[int]
    action: str          # "publish" | "unpublish" | "archive" | "delete" | "move_category" | "move_collection" | "move_sub_collection"
    category_id:   Optional[int] = None
    collection_id: Optional[int] = None
    sub_collection: Optional[str] = None

    @field_validator("action")
    @classmethod
    def action_valid(cls, v):
        allowed = {"publish", "unpublish", "archive", "delete", "move_category", "move_collection", "move_sub_collection"}
        if v not in allowed:
            raise ValueError(f"action must be one of: {', '.join(allowed)}")
        return v

    @field_validator("product_ids")
    @classmethod
    def ids_not_empty(cls, v):
        if not v:
            raise ValueError("product_ids must not be empty")
        return v