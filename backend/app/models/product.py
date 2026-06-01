"""
app/models/product.py
Production-hardened ecommerce product models
"""

import enum

from sqlalchemy import (
    Boolean,
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

    title = Column(
        String,
        nullable=False,
    )

    slug = Column(
        String,
        unique=True,
        nullable=False,
        index=True,
    )

    description = Column(
        Text,
        nullable=True,
    )

    collection = Column(
        String,
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

    # Current MVP image approach:
    # single thumbnail URL
    thumbnail = Column(
        String,
        nullable=True,
    )

    seo_title = Column(
        String,
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
        """
        return sum(v.stock_quantity for v in self.variants)

    @property
    def min_price(self):
        """
        Lowest selling price among variants.
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

    # Prevent duplicate size/color combinations
    __table_args__ = (
        UniqueConstraint(
            "product_id",
            "size",
            "color",
            name="uq_variant_product_size_color",
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
    sku = Column(
        String,
        unique=True,
        nullable=False,
        index=True,
    )

    size = Column(
        String,
        nullable=False,
    )

    color = Column(
        String,
        nullable=True,
    )

    color_hex = Column(
        String,
        nullable=True,
    )

    # Money fields
    # Numeric avoids float precision bugs
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

