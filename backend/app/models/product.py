from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, JSON
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.base import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(300), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    collection = Column(String(100), nullable=True)
    tags = Column(JSON, default=list)
    status = Column(String(20), default="draft", nullable=False)  # draft | published | archived
    is_featured = Column(Boolean, default=False)
    thumbnail = Column(String(500), nullable=True)
    seo_title = Column(String(255), nullable=True)
    seo_description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")

    @property
    def total_stock(self) -> int:
        return sum(v.stock_quantity for v in self.variants) if self.variants else 0

    @property
    def min_price(self):
        if not self.variants:
            return None
        prices = [v.selling_price for v in self.variants if v.selling_price is not None]
        return min(prices) if prices else None


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    size = Column(String(10), nullable=False)
    color = Column(String(50), nullable=True)
    color_hex = Column(String(10), nullable=True)
    sku = Column(String(100), unique=True, index=True, nullable=False)
    original_price = Column(Float, nullable=False)
    selling_price = Column(Float, nullable=False)
    discount_percentage = Column(Float, default=0)
    stock_quantity = Column(Integer, default=0)
    low_stock_threshold = Column(Integer, default=5)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    product = relationship("Product", back_populates="variants")
