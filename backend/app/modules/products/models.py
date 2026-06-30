import enum

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Enum as SAEnum,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


# ─────────────────────────────────────────────────────────────
# Product status enum
# ─────────────────────────────────────────────────────────────

class ProductStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


# ─────────────────────────────────────────────────────────────
# Category model
# ─────────────────────────────────────────────────────────────

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(120), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="active", index=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    collections = relationship("Collection", back_populates="category", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="category")


# ─────────────────────────────────────────────────────────────
# Collection model
# ─────────────────────────────────────────────────────────────

class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(120), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    category = relationship("Category", back_populates="collections")
    products = relationship("Product", back_populates="collection_rel")


# ─────────────────────────────────────────────────────────────
# Product model
# ─────────────────────────────────────────────────────────────

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)

    # Core
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    short_description = Column(String(500), nullable=True)

    # Classification — FKs to categories/collections tables
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    collection_id = Column(Integer, ForeignKey("collections.id", ondelete="SET NULL"), nullable=True, index=True)
    material = Column(String(255), nullable=True)

    tags = Column(JSON, default=list, nullable=False,)
    
    # Publishing
    status = Column(
        SAEnum(ProductStatus, name="product_status_enum"),
        default=ProductStatus.draft,
        nullable=False,
        index=True,
    )

    # Merchandising flags
    is_featured = Column(Boolean, default=False, nullable=False, index=True)
    is_trending = Column(Boolean, default=False, nullable=False, index=True)
    is_best_seller = Column(Boolean, default=False, nullable=False, index=True)
    is_new_arrival = Column(Boolean, default=False, nullable=False, index=True)

    # Images — thumbnail kept for backward compat
    thumbnail        = Column(String(500), nullable=True)
    image_front      = Column(String(500), nullable=True)
    image_back       = Column(String(500), nullable=True)
    image_size_chart = Column(String(500), nullable=True)
    gallery_images   = Column(JSON, default=list)

    # SEO
    seo_title       = Column(String(255), nullable=True)
    seo_description = Column(Text, nullable=True)

    # Analytics counters (incremented by order/view events)
    view_count    = Column(Integer, nullable=False, default=0)
    orders_count  = Column(Integer, nullable=False, default=0)
    sales_count   = Column(Integer, nullable=False, default=0)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)

    # Relationships
    variants       = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    category       = relationship("Category", back_populates="products")
    collection_rel = relationship("Collection", back_populates="products")
    genders_rel    = relationship("ProductGender", back_populates="product", cascade="all, delete-orphan")

    @property
    def total_stock(self) -> int:
        return sum(v.stock_quantity for v in self.variants)

    @property
    def min_price(self):
        prices = [v.selling_price for v in self.variants if v.selling_price is not None]
        return min(prices) if prices else None


# ─────────────────────────────────────────────────────────────
# Product variant model
# ─────────────────────────────────────────────────────────────

class ProductVariant(Base):
    __tablename__ = "product_variants"

    __table_args__ = (
        UniqueConstraint("product_id", "size", "color", name="uq_variant_product_size_color"),
        CheckConstraint("stock_quantity >= 0",            name="ck_variant_stock_nonneg"),
        CheckConstraint("reserved_stock >= 0",            name="ck_variant_reserved_nonneg"),
        CheckConstraint("original_price > 0",             name="ck_variant_orig_price_pos"),
        CheckConstraint("selling_price > 0",              name="ck_variant_sell_price_pos"),
        CheckConstraint("selling_price <= original_price",name="ck_variant_sell_lte_orig"),
    )

    id         = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)

    sku       = Column(String(100), unique=True, nullable=False, index=True)
    size      = Column(String(50),  nullable=False)
    color     = Column(String(100), nullable=True)
    color_hex = Column(String(7),   nullable=True)

    original_price      = Column(Numeric(10, 2), nullable=False)
    selling_price       = Column(Numeric(10, 2), nullable=False, index=True)
    discount_percentage = Column(Numeric(5, 2),  default=0.00)

    stock_quantity     = Column(Integer, default=0, nullable=False, index=True)
    reserved_stock     = Column(Integer, default=0, nullable=False)
    low_stock_threshold = Column(Integer, default=5, nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    product = relationship("Product", back_populates="variants")

    @property
    def available_stock(self) -> int:
        return max(0, self.stock_quantity - self.reserved_stock)

    @property
    def inventory_status(self) -> str:
        avail = self.available_stock
        if avail == 0:
            return "out_of_stock"
        if avail <= self.low_stock_threshold:
            return "low_stock"
        return "in_stock"


# ─────────────────────────────────────────────────────────────
# Product gender association model
# ─────────────────────────────────────────────────────────────

class ProductGender(Base):
    __tablename__ = "product_genders"

    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), primary_key=True, index=True)
    gender = Column(String(50), primary_key=True, index=True)

    product = relationship("Product", back_populates="genders_rel")