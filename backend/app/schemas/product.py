from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List, Any
from datetime import datetime
from decimal import Decimal


# ── Variant Schemas ──────────────────────────────────────────────────────────

class VariantBase(BaseModel):
    size: str
    color: Optional[str] = None
    color_hex: Optional[str] = None
    sku: Optional[str] = None
    original_price: float
    selling_price: float
    discount_percentage: float = 0
    stock_quantity: int = 0
    low_stock_threshold: int = 5


class VariantCreate(VariantBase):
    @field_validator('original_price')
    @classmethod
    def original_price_positive(cls, v):
        if v <= 0:
            raise ValueError('original_price must be greater than zero')
        return round(v, 2)

    @field_validator('selling_price')
    @classmethod
    def selling_price_positive(cls, v):
        if v <= 0:
            raise ValueError('selling_price must be greater than zero')
        return round(v, 2)

    @field_validator('stock_quantity')
    @classmethod
    def stock_nonnegative(cls, v):
        if v < 0:
            raise ValueError('stock_quantity cannot be negative')
        return v

    @field_validator('low_stock_threshold')
    @classmethod
    def threshold_nonnegative(cls, v):
        if v < 0:
            raise ValueError('low_stock_threshold cannot be negative')
        return v

    @field_validator('size')
    @classmethod
    def size_not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError('size is required')
        return v

    @field_validator('sku')
    @classmethod
    def sku_strip(cls, v):
        if v is not None:
            v = v.strip()
            return v if v else None
        return v

    @model_validator(mode='after')
    def selling_lte_original(self):
        if self.selling_price > self.original_price:
            raise ValueError(
                f'selling_price ({self.selling_price}) cannot exceed '
                f'original_price ({self.original_price})'
            )
        return self


class VariantResponse(VariantBase):
    id: int
    product_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Coerce Numeric/Decimal from DB → float for safe JSON serialization
    @field_validator('original_price', 'selling_price', 'discount_percentage', mode='before')
    @classmethod
    def coerce_decimal_to_float(cls, v):
        if isinstance(v, Decimal):
            return float(v)
        return v

    class Config:
        from_attributes = True


# ── Product Schemas ──────────────────────────────────────────────────────────

class ProductBase(BaseModel):
    title: str
    description: Optional[str] = None
    collection: Optional[str] = None
    tags: List[str] = []
    status: str = "draft"
    is_featured: bool = False
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None


class ProductCreate(ProductBase):
    @field_validator('title')
    @classmethod
    def title_valid(cls, v):
        v = v.strip()
        if len(v) < 2:
            raise ValueError('Product title must be at least 2 characters')
        return v

    @field_validator('tags')
    @classmethod
    def sanitize_tags(cls, v):
        """Strip whitespace and filter empty tags."""
        if v is None:
            return []
        return [t.strip() for t in v if t and t.strip()]

    @field_validator('status')
    @classmethod
    def status_valid(cls, v):
        allowed = {'draft', 'published', 'archived'}
        if v not in allowed:
            raise ValueError(f'status must be one of: {", ".join(allowed)}')
        return v


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    collection: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    is_featured: Optional[bool] = None
    thumbnail: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None

    @field_validator('title')
    @classmethod
    def title_valid(cls, v):
        if v is not None:
            v = v.strip()
            if len(v) < 2:
                raise ValueError('Product title must be at least 2 characters')
        return v

    @field_validator('tags')
    @classmethod
    def sanitize_tags(cls, v):
        if v is not None:
            return [t.strip() for t in v if t and t.strip()]
        return v

    @field_validator('status')
    @classmethod
    def status_valid(cls, v):
        if v is not None:
            allowed = {'draft', 'published', 'archived'}
            if v not in allowed:
                raise ValueError(f'status must be one of: {", ".join(allowed)}')
        return v


class ProductResponse(ProductBase):
    id: int
    slug: str
    thumbnail: Optional[str] = None
    images: List[Any] = []        # MVP: empty list; prevents frontend crashes
    total_stock: int = 0
    min_price: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    variants: List[VariantResponse] = []

    # Ensure status enum serializes as plain string ("draft", not ProductStatus.draft)
    @field_validator('status', mode='before')
    @classmethod
    def coerce_status_to_str(cls, v):
        if hasattr(v, 'value'):
            return v.value
        return v

    # Coerce Decimal min_price → float
    @field_validator('min_price', mode='before')
    @classmethod
    def coerce_min_price(cls, v):
        if isinstance(v, Decimal):
            return float(v)
        return v

    class Config:
        from_attributes = True
        use_enum_values = True


class ProductListResponse(BaseModel):
    """Paginated product list matching what the frontend expects."""
    items: List[ProductResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
