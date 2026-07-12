from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
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


class CustomerCartItem(Base):
    """
    Stores cart items for an authenticated customer.

    Guest cart items remain temporarily in the
    browser and are merged after customer login.
    """

    __tablename__ = "customer_cart_items"

    __table_args__ = (
        CheckConstraint(
            "quantity > 0",
            name="ck_customer_cart_quantity_positive",
        ),
        UniqueConstraint(
            "customer_id",
            "product_id",
            "variant_id",
            name="uq_customer_cart_product_variant",
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
        index=True,
    )

    variant_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey(
            "product_variants.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        server_default="1",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    customer = relationship(
        "Customer",
        foreign_keys=[customer_id],
    )

    product = relationship(
        "Product",
        foreign_keys=[product_id],
    )

    variant = relationship(
        "ProductVariant",
        foreign_keys=[variant_id],
    )