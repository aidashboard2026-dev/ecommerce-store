"""
app/modules/custom_products/models.py

Custom Products domain models — completely independent of the Products domain.

DOMAIN BOUNDARY RULES (NON-NEGOTIABLE):
- This module MUST NOT import from app.modules.products.
- This module MUST NOT reference products, categories, or collections tables.
- CustomCategory and CustomProduct have their own database tables with no
  foreign keys pointing into the Products domain.
- Collections belong ONLY to Products. Custom Products MUST NOT use Collections.
"""
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


# =====================================================
# Custom Product Status
# =====================================================

class CustomProductStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


# =====================================================
# Custom Category
# =====================================================
# This is the Custom Products domain's own category table.
# It is completely separate from the products.categories table.
# Custom categories have no limit (unlike product categories which max at 5).
# NEVER add a foreign key from this model to the products domain.
# =====================================================

class CustomCategory(Base):
    __tablename__ = "custom_categories"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(100), nullable=False, unique=True)
    slug        = Column(String(120), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    status      = Column(String(20), nullable=False, default="active", index=True)
    sort_order  = Column(Integer, nullable=False, default=0)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship to custom products
    products = relationship("CustomProduct", back_populates="category")


# =====================================================
# Custom Product
# =====================================================
# Custom Products are production-based (e.g. embroidery, jersey printing).
# They DO NOT use:
#   - inventory (no stock_quantity, no reserved_stock)
#   - product variants (size/color variants)
#   - collections (collections belong ONLY to Products)
#   - product categories (each domain has its own)
# =====================================================

class CustomProduct(Base):
    __tablename__ = "custom_products"

    __table_args__ = (
        CheckConstraint("original_price_min >= 0",              name="ck_cp_orig_price_min_nonneg"),
        CheckConstraint("original_price_max >= 0",              name="ck_cp_orig_price_max_nonneg"),
        CheckConstraint("selling_price_min >= 0",               name="ck_cp_sell_price_min_nonneg"),
        CheckConstraint("selling_price_max >= 0",               name="ck_cp_sell_price_max_nonneg"),
        CheckConstraint(
            "original_price_min <= original_price_max",
            name="ck_cp_orig_price_range",
        ),
        CheckConstraint(
            "selling_price_min <= selling_price_max",
            name="ck_cp_sell_price_range",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    # -------------------------------------------------
    # Core Details
    # -------------------------------------------------

    title = Column(String(255), nullable=False)

    slug = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    sku = Column(
        String(100),
        unique=True,
        nullable=True,
        index=True,
    )

    description = Column(Text, nullable=True)

    short_description = Column(
        String(500),
        nullable=True,
    )

    # -------------------------------------------------
    # Category — FK to custom_categories (own domain table)
    # NEVER FK to products.categories
    # -------------------------------------------------

    custom_category_id = Column(
        Integer,
        ForeignKey("custom_categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # -------------------------------------------------
    # Tags
    # -------------------------------------------------

    tags = Column(
        JSON,
        default=list,
    )

    # -------------------------------------------------
    # Images — stored in the custom-product-images Supabase bucket
    # (separate from product-images bucket)
    # -------------------------------------------------

    thumbnail = Column(
        String(500),
        nullable=True,
    )

    image_front = Column(
        String(500),
        nullable=True,
    )

    image_back = Column(
        String(500),
        nullable=True,
    )

    image_size_chart = Column(
        String(500),
        nullable=True,
    )

    gallery_images = Column(
        JSON,
        default=list,
    )

    # -------------------------------------------------
    # Price Range
    # Custom Products have a price range (not a single price) because
    # the exact price depends on production options (size, quantity, etc.)
    # Example: Original: 340–900, Selling: 250–600
    # -------------------------------------------------

    original_price_min = Column(
        Numeric(10, 2),
        nullable=False,
    )

    original_price_max = Column(
        Numeric(10, 2),
        nullable=False,
    )

    selling_price_min = Column(
        Numeric(10, 2),
        nullable=False,
    )

    selling_price_max = Column(
        Numeric(10, 2),
        nullable=False,
    )

    # -------------------------------------------------
    # WhatsApp Lead Generation
    # Custom Products use WhatsApp for quotation (no cart/checkout).
    # This message is pre-filled in the WhatsApp link on the storefront.
    # -------------------------------------------------

    whatsapp_message = Column(
        Text,
        nullable=True,
    )

    # -------------------------------------------------
    # Status
    # -------------------------------------------------

    status = Column(
        SAEnum(
            CustomProductStatus,
            name="custom_product_status_enum",
        ),
        nullable=False,
        default=CustomProductStatus.draft,
        index=True,
    )

    # -------------------------------------------------
    # Merchandising Flags
    # -------------------------------------------------

    is_featured    = Column(Boolean, default=False, index=True)
    is_trending    = Column(Boolean, default=False, index=True)
    is_best_seller = Column(Boolean, default=False, index=True)
    is_new_arrival = Column(Boolean, default=False, index=True)

    # -------------------------------------------------
    # SEO
    # -------------------------------------------------

    seo_title       = Column(String(255), nullable=True)
    seo_description = Column(Text, nullable=True)

    # -------------------------------------------------
    # Analytics (incremented by order/view events)
    # -------------------------------------------------

    view_count   = Column(Integer, nullable=False, default=0)
    orders_count = Column(Integer, nullable=False, default=0)
    sales_count  = Column(Integer, nullable=False, default=0)


    # -------------------------------------------------
    # Inventory
    # -------------------------------------------------

    stock_quantity = Column(
        Integer,
        nullable=False,
        default=0,
        index=True,
    )

    low_stock_threshold = Column(
        Integer,
        nullable=False,
        default=5,
    )

    size = Column(
        String(100),
        nullable=False,
        default="All Size",
    )

    # -------------------------------------------------
    # Timestamps
    # -------------------------------------------------

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)

    # -------------------------------------------------
    # Relationships
    # -------------------------------------------------

    # FK to custom_categories — NOT to products.categories
    category = relationship("CustomCategory", back_populates="products")