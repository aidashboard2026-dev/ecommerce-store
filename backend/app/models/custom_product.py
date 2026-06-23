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
    Enum as SAEnum,
)

from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.base import Base


# =====================================================
# Custom Product Status
# =====================================================

class CustomProductStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


# =====================================================
# Custom Product
# =====================================================

class CustomProduct(Base):
    __tablename__ = "custom_products"

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
    # Category & Collection
    # -------------------------------------------------

    category_id = Column(
        Integer,
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    collection_id = Column(
        Integer,
        ForeignKey("collections.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    collection = Column(
        String(100),
        nullable=True,
    )

    # Size
    size = Column(
        String(50),
        nullable=False,
        default="All Size"
    )
    # -------------------------------------------------
    # Tags
    # -------------------------------------------------

    tags = Column(
        JSON,
        default=list,
    )

    # -------------------------------------------------
    # Images
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
    # Example:
    # Original : 340 - 900
    # Discount : 250 - 600
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
    # Inventory
    # -------------------------------------------------

    stock_quantity = Column(
        Integer,
        nullable=False,
        default=0,
    )

    low_stock_threshold = Column(
        Integer,
        nullable=False,
        default=5,
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

    is_featured = Column(
        Boolean,
        default=False,
        index=True,
    )

    is_trending = Column(
        Boolean,
        default=False,
        index=True,
    )

    is_best_seller = Column(
        Boolean,
        default=False,
        index=True,
    )

    is_new_arrival = Column(
        Boolean,
        default=False,
        index=True,
    )

    # -------------------------------------------------
    # SEO
    # -------------------------------------------------

    seo_title = Column(
        String(255),
        nullable=True,
    )

    seo_description = Column(
        Text,
        nullable=True,
    )

    # -------------------------------------------------
    # Analytics
    # -------------------------------------------------

    view_count = Column(
        Integer,
        nullable=False,
        default=0,
    )

    orders_count = Column(
        Integer,
        nullable=False,
        default=0,
    )

    sales_count = Column(
        Integer,
        nullable=False,
        default=0,
    )

    # -------------------------------------------------
    # Timestamps
    # -------------------------------------------------

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    deleted_at = Column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    # -------------------------------------------------
    # Relationships
    # -------------------------------------------------

    category = relationship("Category")

    collection_rel = relationship("Collection")

    # -------------------------------------------------
    # Computed Properties
    # -------------------------------------------------

    @property
    def inventory_status(self):
        if self.stock_quantity <= 0:
            return "out_of_stock"

        if self.stock_quantity <= self.low_stock_threshold:
            return "low_stock"

        return "in_stock"