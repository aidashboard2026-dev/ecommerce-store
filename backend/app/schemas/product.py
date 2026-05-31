from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Variant Schemas ──────────────────────────────────────────────────────────

class VariantBase(BaseModel):
    size: str
    color: Optional[str] = None
    color_hex: Optional[str] = None
    sku: str
    original_price: float
    selling_price: float
    discount_percentage: float = 0
    stock_quantity: int = 0
    low_stock_threshold: int = 5


class VariantCreate(VariantBase):
    pass


class VariantResponse(VariantBase):
    id: int
    product_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

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
    pass


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


class ProductResponse(ProductBase):
    id: int
    slug: str
    thumbnail: Optional[str] = None
    total_stock: int = 0
    min_price: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    variants: List[VariantResponse] = []

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    """Paginated product list matching what the frontend expects."""
    items: List[ProductResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
