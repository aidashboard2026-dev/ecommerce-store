from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.core.database import Base


class CustomerWishlistItem(Base):
    """
    Stores wishlist items for an authenticated
    customer.

    Each customer can save a product only once.
    """

    __tablename__ = "customer_wishlist_items"

    __table_args__ = (
        UniqueConstraint(
            "customer_id",
            "product_id",
            name=(
                "uq_customer_wishlist_"
                "customer_product"
            ),
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    customer_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(
            "customers.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(
            "products.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    customer = relationship(
        "Customer",
        foreign_keys=[customer_id],
    )

    product = relationship(
        "Product",
        foreign_keys=[product_id],
    )