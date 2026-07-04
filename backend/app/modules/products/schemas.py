from pydantic import BaseModel, field_validator, model_validator, Field
from typing import Optional, List, Any
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from app.core.constants import (
    MIN_PRODUCT_NAME_LENGTH,
    MAX_PRODUCT_NAME_LENGTH,
    MIN_CATEGORY_NAME_LENGTH,
    MAX_CATEGORY_NAME_LENGTH,
    MIN_COLLECTION_NAME_LENGTH,
    MAX_COLLECTION_NAME_LENGTH,
    MAX_PRODUCT_DESCRIPTION_LENGTH,
    MAX_SKU_LENGTH,
    MIN_PRODUCT_PRICE,
    MAX_PRODUCT_PRICE,
    MIN_DISCOUNT_PERCENT,
    MAX_DISCOUNT_PERCENT,
    MIN_STOCK,
    MAX_STOCK,
)


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
        if v is None:
            raise ValueError("Category name is required")
        v = v.strip()
        if not v:
            raise ValueError("Category name cannot be empty or whitespace only")
        if len(v) < MIN_CATEGORY_NAME_LENGTH or len(v) > MAX_CATEGORY_NAME_LENGTH:
            raise ValueError(f"Category name must be between {MIN_CATEGORY_NAME_LENGTH} and {MAX_CATEGORY_NAME_LENGTH} characters")
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
                raise ValueError("Category name cannot be empty or whitespace only")
            if len(v) < MIN_CATEGORY_NAME_LENGTH or len(v) > MAX_CATEGORY_NAME_LENGTH:
                raise ValueError(f"Category name must be between {MIN_CATEGORY_NAME_LENGTH} and {MAX_CATEGORY_NAME_LENGTH} characters")
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
        if v is None:
            raise ValueError("Collection name is required")
        v = v.strip()
        if not v:
            raise ValueError("Collection name cannot be empty or whitespace only")
        if len(v) < MIN_COLLECTION_NAME_LENGTH or len(v) > MAX_COLLECTION_NAME_LENGTH:
            raise ValueError(f"Collection name must be between {MIN_COLLECTION_NAME_LENGTH} and {MAX_COLLECTION_NAME_LENGTH} characters")
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
                raise ValueError("Collection name cannot be empty or whitespace only")
            if len(v) < MIN_COLLECTION_NAME_LENGTH or len(v) > MAX_COLLECTION_NAME_LENGTH:
                raise ValueError(f"Collection name must be between {MIN_COLLECTION_NAME_LENGTH} and {MAX_COLLECTION_NAME_LENGTH} characters")
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
    def validate_original_price(cls, v):
        if not (MIN_PRODUCT_PRICE <= v <= MAX_PRODUCT_PRICE):
            raise ValueError(f"original_price must be between {MIN_PRODUCT_PRICE} and {MAX_PRODUCT_PRICE}")
        return v

    @field_validator("selling_price")
    @classmethod
    def validate_selling_price(cls, v):
        if not (MIN_PRODUCT_PRICE <= v <= MAX_PRODUCT_PRICE):
            raise ValueError(f"selling_price must be between {MIN_PRODUCT_PRICE} and {MAX_PRODUCT_PRICE}")
        return v

    @field_validator("discount_percentage")
    @classmethod
    def validate_discount(cls, v):
        if not (MIN_DISCOUNT_PERCENT <= v <= MAX_DISCOUNT_PERCENT):
            raise ValueError(f"discount_percentage must be between {MIN_DISCOUNT_PERCENT} and {MAX_DISCOUNT_PERCENT}")
        return v

    @field_validator("stock_quantity")
    @classmethod
    def validate_stock(cls, v):
        if not (MIN_STOCK <= v <= MAX_STOCK):
            raise ValueError(f"stock_quantity must be between {MIN_STOCK} and {MAX_STOCK}")
        return v

    @field_validator("sku")
    @classmethod
    def validate_sku(cls, v):
        if v is not None:
            v = v.strip()
            if len(v) > MAX_SKU_LENGTH:
                raise ValueError(f"SKU must be {MAX_SKU_LENGTH} characters or fewer")
            return v if v else None
        return v

    @field_validator("color_hex")
    @classmethod
    def validate_color_hex(cls, v):
        if v is not None and v.strip():
            v = v.strip()
            import re
            if not re.match(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$", v):
                raise ValueError("color_hex must be a valid hex color starting with #")
            return v
        return None

    @model_validator(mode="after")
    def selling_lte_original(self):
        if self.selling_price > self.original_price:
            raise ValueError(
                f"selling_price ({self.selling_price}) cannot exceed "
                f"original_price ({self.original_price})"
            )
        return self


class VariantUpdate(BaseModel):
    """All fields optional — send only the ones you want to change."""
    size: Optional[str] = None
    color: Optional[str] = None
    color_hex: Optional[str] = None
    sku: Optional[str] = None
    original_price: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    discount_percentage: Optional[Decimal] = None
    stock_quantity: Optional[int] = None
    low_stock_threshold: Optional[int] = None

    @field_validator("original_price", "selling_price", mode="before")
    @classmethod
    def coerce_price(cls, v):
        if v is None:
            return v
        return Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @field_validator("discount_percentage", mode="before")
    @classmethod
    def coerce_discount(cls, v):
        if v is None:
            return v
        return Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @field_validator("original_price")
    @classmethod
    def original_price_positive(cls, v):
        if v is not None:
            if not (MIN_PRODUCT_PRICE <= v <= MAX_PRODUCT_PRICE):
                raise ValueError(f"original_price must be between {MIN_PRODUCT_PRICE} and {MAX_PRODUCT_PRICE}")
        return v

    @field_validator("selling_price")
    @classmethod
    def selling_price_positive(cls, v):
        if v is not None:
            if not (MIN_PRODUCT_PRICE <= v <= MAX_PRODUCT_PRICE):
                raise ValueError(f"selling_price must be between {MIN_PRODUCT_PRICE} and {MAX_PRODUCT_PRICE}")
        return v

    @field_validator("discount_percentage")
    @classmethod
    def validate_discount(cls, v):
        if v is not None:
            if not (MIN_DISCOUNT_PERCENT <= v <= MAX_DISCOUNT_PERCENT):
                raise ValueError(f"discount_percentage must be between {MIN_DISCOUNT_PERCENT} and {MAX_DISCOUNT_PERCENT}")
        return v

    @field_validator("stock_quantity")
    @classmethod
    def stock_nonnegative(cls, v):
        if v is not None:
            if not (MIN_STOCK <= v <= MAX_STOCK):
                raise ValueError(f"stock_quantity must be between {MIN_STOCK} and {MAX_STOCK}")
        return v

    @field_validator("size")
    @classmethod
    def size_not_empty(cls, v):
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("size is required")
        return v

    @field_validator("sku")
    @classmethod
    def sku_strip(cls, v):
        if v is not None:
            v = v.strip()
            if len(v) > MAX_SKU_LENGTH:
                raise ValueError(f"SKU must be {MAX_SKU_LENGTH} characters or fewer")
            return v if v else None
        return v

    @field_validator("color_hex")
    @classmethod
    def validate_color_hex(cls, v):
        if v is not None and v.strip():
            v = v.strip()
            import re
            if not re.match(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$", v):
                raise ValueError("color_hex must be a valid hex color starting with #")
            return v
        return None

    @model_validator(mode="after")
    def selling_lte_original(self):
        if self.selling_price is not None and self.original_price is not None:
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
    # New FK-based classification
    category_id: Optional[int] = None
    collection_id: Optional[int] = None
    genders: List[str] = Field(default=[], description="List of target genders. Allowed values: Men, Women, Kids.")
    material: Optional[str] = None
    tags: List[str] = []
    status: str = "draft"
    is_featured:    bool = False
    is_trending:    bool = False
    is_best_seller: bool = False
    is_new_arrival: bool = False
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None


def validate_genders_list(v: Any) -> List[str]:
    """Shared validator helper to sanitize and validate gender options."""
    if not v:
        raise ValueError("At least one gender must be selected")
    allowed = {"Men", "Women", "Kids"}
    sanitized = []
    seen = set()
    for x in v:
        if not x or not x.strip():
            raise ValueError("Gender values cannot be empty or whitespace only")
        x_clean = x.strip().title()
        if x_clean not in allowed:
            raise ValueError(f"Gender '{x_clean}' is not allowed. Must be one of: {', '.join(sorted(allowed))}")
        if x_clean in seen:
            raise ValueError(f"Duplicate gender value '{x_clean}' is not allowed")
        seen.add(x_clean)
        sanitized.append(x_clean)
    return sanitized


class ProductCreate(ProductBase):
    @field_validator("title")
    @classmethod
    def title_valid(cls, v):
        if v is None:
            raise ValueError("Product title is required")
        v = v.strip()
        if not v:
            raise ValueError("Product title cannot be empty or whitespace only")
        if len(v) < MIN_PRODUCT_NAME_LENGTH or len(v) > MAX_PRODUCT_NAME_LENGTH:
            raise ValueError(f"Product title must be between {MIN_PRODUCT_NAME_LENGTH} and {MAX_PRODUCT_NAME_LENGTH} characters")
        return v

    @field_validator("material")
    @classmethod
    def validate_material(cls, v):
        if v is not None:
            if v != "" and not v.strip():
                raise ValueError("Material cannot be whitespace only")
            v = v.strip()
            if len(v) > 255:
                raise ValueError("Material must be 255 characters or fewer")
            return v if v else None
        return v

    @field_validator("genders")
    @classmethod
    def genders_valid(cls, v):
        return validate_genders_list(v)

    @field_validator("description")
    @classmethod
    def description_valid(cls, v):
        if v is not None:
            if len(v) > MAX_PRODUCT_DESCRIPTION_LENGTH:
                raise ValueError(f"Product description must be {MAX_PRODUCT_DESCRIPTION_LENGTH} characters or fewer")
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
    category_id: Optional[int] = None
    collection_id: Optional[int] = None
    genders: Optional[List[str]] = Field(default=None, description="List of target genders. Allowed values: Men, Women, Kids.")
    material: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    is_featured:    Optional[bool] = None
    is_trending:    Optional[bool] = None
    is_best_seller: Optional[bool] = None
    is_new_arrival: Optional[bool] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    thumbnail:        Optional[str] = None
    image_front:      Optional[str] = None
    image_back:       Optional[str] = None
    image_size_chart: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_valid(cls, v):
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Product title cannot be empty or whitespace only")
            if len(v) < MIN_PRODUCT_NAME_LENGTH or len(v) > MAX_PRODUCT_NAME_LENGTH:
                raise ValueError(f"Product title must be between {MIN_PRODUCT_NAME_LENGTH} and {MAX_PRODUCT_NAME_LENGTH} characters")
        return v

    @field_validator("material")
    @classmethod
    def validate_material(cls, v):
        if v is not None:
            if v != "" and not v.strip():
                raise ValueError("Material cannot be whitespace only")
            v = v.strip()
            if len(v) > 255:
                raise ValueError("Material must be 255 characters or fewer")
            return v if v else None
        return v

    @field_validator("genders")
    @classmethod
    def genders_valid(cls, v):
        if v is not None:
            return validate_genders_list(v)
        return v

    @field_validator("description")
    @classmethod
    def description_valid(cls, v):
        if v is not None:
            if len(v) > MAX_PRODUCT_DESCRIPTION_LENGTH:
                raise ValueError(f"Product description must be {MAX_PRODUCT_DESCRIPTION_LENGTH} characters or fewer")
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

    @model_validator(mode="before")
    @classmethod
    def resolve_image_urls(cls, data: Any) -> Any:
        from app.shared.storage.supabase_storage import get_product_image_url

        if isinstance(data, dict):
            # Resolve image URLs
            data["thumbnail"] = get_product_image_url(data.get("thumbnail"))
            data["image_front"] = get_product_image_url(data.get("image_front"))
            data["image_back"] = get_product_image_url(data.get("image_back"))
            data["image_size_chart"] = get_product_image_url(data.get("image_size_chart"))
            
            gallery = data.get("gallery_images") or []
            resolved_gallery = [get_product_image_url(img) for img in gallery]
            data["gallery_images"] = resolved_gallery
            
            # Populate legacy images list
            all_imgs = []
            for img in [data["thumbnail"], data["image_front"], data["image_back"], data["image_size_chart"]] + resolved_gallery:
                if img and not img.endswith("placeholder-product.png"):
                    all_imgs.append(img)
            data["images"] = all_imgs
        else:
            d = {}
            for field in cls.model_fields.keys():
                if hasattr(data, field):
                    d[field] = getattr(data, field)
            
            for extra in ["category_name", "collection_name", "total_stock", "min_price", "view_count", "orders_count", "sales_count", "variants"]:
                if hasattr(data, extra):
                    d[extra] = getattr(data, extra)
            
            if not d.get("category_name") and hasattr(data, "category") and data.category:
                d["category_name"] = data.category.name
            if not d.get("collection_name") and hasattr(data, "collection_rel") and data.collection_rel:
                d["collection_name"] = data.collection_rel.name
                
            d["thumbnail"] = get_product_image_url(d.get("thumbnail"))
            d["image_front"] = get_product_image_url(d.get("image_front"))
            d["image_back"] = get_product_image_url(d.get("image_back"))
            d["image_size_chart"] = get_product_image_url(d.get("image_size_chart"))
            
            gallery = d.get("gallery_images") or []
            resolved_gallery = [get_product_image_url(img) for img in gallery]
            d["gallery_images"] = resolved_gallery
            
            all_imgs = []
            for img in [d["thumbnail"], d["image_front"], d["image_back"], d["image_size_chart"]] + resolved_gallery:
                if img and not img.endswith("placeholder-product.png"):
                    all_imgs.append(img)
            d["images"] = all_imgs
            
            return d
            
        return data

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
    action: str          # "publish" | "unpublish" | "archive" | "delete" | "move_category" | "move_collection"
    category_id:   Optional[int] = None
    collection_id: Optional[int] = None

    @field_validator("action")
    @classmethod
    def action_valid(cls, v):
        allowed = {"publish", "unpublish", "archive", "delete", "move_category", "move_collection"}
        if v not in allowed:
            raise ValueError(f"action must be one of: {', '.join(allowed)}")
        return v

    @field_validator("product_ids")
    @classmethod
    def ids_not_empty(cls, v):
        if not v:
            raise ValueError("product_ids must not be empty")
        return v