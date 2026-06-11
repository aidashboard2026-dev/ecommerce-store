"""
app/models/product.py
Production-hardened ecommerce product models

FIX (HP-03): Added explicit length constraints to all String columns that were
previously declared as bare String (= TEXT in PostgreSQL). The migration files
already had length=255 on several columns, but the ORM model did not, creating
a schema drift risk: if SQLAlchemy ever generated the schema from the model
(e.g. in tests using create_all), columns would be created as TEXT instead of
VARCHAR(255), silently diverging from the migration-managed schema.

Lengths chosen to match the existing migration `ae78e3561c2b_initial_schema.py`
and to be consistent with the Pydantic schema validators added in product.py.
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

from app.database.base import Base


# ─────────────────────────────────────────────────────────────
# Product status enum
# ─────────────────────────────────────────────────────────────

class ProductStatus(str, enum.Enum):
    """
    Allowed product lifecycle states.

    Using str + enum.Enum ensures:
    - FastAPI serializes cleanly
    - OpenAPI docs remain readable
    - SQLAlchemy stores constrained DB values
    """

    draft = "draft"
    published = "published"
    archived = "archived"


# ─────────────────────────────────────────────────────────────
# Product model
# ─────────────────────────────────────────────────────────────

class Product(Base):
    __tablename__ = "products"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # FIX (HP-03): was String (= TEXT). Now String(255) to match migration
    # ae78e3561c2b and the 200-char Pydantic validator in ProductCreate.
    title = Column(
        String(255),
        nullable=False,
    )

    # FIX (HP-03): was String (= TEXT). Slugs are derived from titles
    # (max 200 chars) plus optional counter suffixes — 255 is sufficient.
    slug = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    description = Column(
        Text,
        nullable=True,
    )

    # FIX (HP-03): was String (= TEXT). Collection names are short labels.
    collection = Column(
        String(100),
        nullable=True,
    )

    tags = Column(
        JSON,
        default=list,
    )

    status = Column(
        SAEnum(
            ProductStatus,
            name="product_status_enum",
        ),
        default=ProductStatus.draft,
        nullable=False,
        index=True,
    )

    is_featured = Column(
        Boolean,
        default=False,
    )

    # Current MVP image approach: single thumbnail URL path
    # FIX (HP-03): was String (= TEXT). URL paths are bounded in length.
    thumbnail = Column(
        String(500),
        nullable=True,
    )

    # FIX (HP-03): was String (= TEXT). SEO titles should be ≤ 60 chars;
    # 255 is a generous upper bound that matches common CMS conventions.
    seo_title = Column(
        String(255),
        nullable=True,
    )

    seo_description = Column(
        Text,
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Soft delete support
    deleted_at = Column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    # ─────────────────────────────────────────────────────────
    # Relationships
    # ─────────────────────────────────────────────────────────

    variants = relationship(
        "ProductVariant",
        back_populates="product",
        cascade="all, delete-orphan",
    )

    # ─────────────────────────────────────────────────────────
    # Computed helpers
    # ─────────────────────────────────────────────────────────

    @property
    def total_stock(self) -> int:
        """
        Total stock across all variants.

        NOTE: This property loads all variant ORM objects into memory.
        It is only safe to call when variants are already loaded (e.g. via
        selectinload in get_product). In get_products_paginated, total_stock
        is computed via SQL aggregation in the service layer to avoid N+1.
        """
        return sum(v.stock_quantity for v in self.variants)

    @property
    def min_price(self):
        """
        Lowest selling price among variants.

        Same caveat as total_stock — safe when variants are already loaded.
        The service layer uses SQL MIN() for the list endpoint.
        """
        prices = [
            v.selling_price
            for v in self.variants
            if v.selling_price is not None
        ]
        return min(prices) if prices else None


# ─────────────────────────────────────────────────────────────
# Product variant model
# ─────────────────────────────────────────────────────────────

class ProductVariant(Base):
    __tablename__ = "product_variants"

    # Prevent duplicate size/color combinations + data integrity constraints
    __table_args__ = (
        UniqueConstraint(
            "product_id",
            "size",
            "color",
            name="uq_variant_product_size_color",
        ),
        CheckConstraint(
            "stock_quantity >= 0",
            name="ck_variant_stock_nonneg",
        ),
        CheckConstraint(
            "original_price > 0",
            name="ck_variant_orig_price_pos",
        ),
        CheckConstraint(
            "selling_price > 0",
            name="ck_variant_sell_price_pos",
        ),
        CheckConstraint(
            "selling_price <= original_price",
            name="ck_variant_sell_lte_orig",
        ),
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    product_id = Column(
        Integer,
        ForeignKey(
            "products.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # Critical inventory identifier
    # FIX (HP-03): was String (= TEXT). SKUs follow a predictable format;
    # 100 chars is a very generous bound.
    sku = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )

    # FIX (HP-03): was String (= TEXT). Size labels are short (e.g. XS, XL, 42).
    size = Column(
        String(50),
        nullable=False,
    )

    # FIX (HP-03): was String (= TEXT). Color names are short labels.
    color = Column(
        String(100),
        nullable=True,
    )

    # FIX (HP-03): was String (= TEXT). Hex codes are exactly 4 or 7 chars.
    color_hex = Column(
        String(7),
        nullable=True,
    )

    # Money fields — Numeric avoids float precision bugs
    original_price = Column(
        Numeric(10, 2),
        nullable=False,
    )

    selling_price = Column(
        Numeric(10, 2),
        nullable=False,
    )

    discount_percentage = Column(
        Numeric(5, 2),
        default=0.00,
    )

    # Inventory fields
    stock_quantity = Column(
        Integer,
        default=0,
        nullable=False,
    )

    low_stock_threshold = Column(
        Integer,
        default=5,
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # ─────────────────────────────────────────────────────────
    # Relationships
    # ─────────────────────────────────────────────────────────

    product = relationship(
        "Product",
        back_populates="variants",
    )