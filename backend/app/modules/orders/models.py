"""
app/modules/orders/models.py

Order domain model.

PENDING ALEMBIC MIGRATION
--------------------------
The `item_type` column is new. After Phase 2 files are in place, generate:

    alembic revision --autogenerate -m "orders_add_item_type"
    alembic upgrade head

Migration will:
  - ADD COLUMN item_type VARCHAR(20) NULL on orders table
  - CREATE INDEX ix_orders_item_type ON orders(item_type)

Existing rows will have item_type = NULL, which the service layer treats
as ItemType.PRODUCT for backward compatibility.
"""

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, Numeric, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


def _utcnow() -> datetime:
    """Timezone-aware UTC timestamp — avoids comparing naive/aware datetimes."""
    return datetime.now(timezone.utc)


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)

    # ── Order identifier ─────────────────────────────────────────────────────
    order_number = Column(String(50), unique=True, nullable=False, index=True)

    # Groups all rows that belong to the same checkout session.
    # One checkout with 3 cart items creates 3 Order rows — they share
    # a cart_session_id so the admin can correlate them.
    # Nullable: existing orders and single-item checkouts leave this as NULL.
    cart_session_id = Column(String(50), nullable=True, index=True)

    # ── Item type — the ONLY place Products and Custom Products meet ──────────
    # Values: "PRODUCT" | "CUSTOM_PRODUCT" | NULL (legacy rows treated as PRODUCT)
    # Nullable so existing rows require no migration default value.
    # Service layer always sets this on new orders.
    item_type = Column(String(20), nullable=True, index=True)

    # ── Customer ─────────────────────────────────────────────────────────────
    customer_name  = Column(String(255), nullable=False)
    customer_email = Column(String(255))
    customer_phone = Column(String(20))

    # ── Shipping address ─────────────────────────────────────────────────────
    address_line1 = Column(String(255))
    address_line2 = Column(String(255))
    city          = Column(String(100))
    state         = Column(String(100))
    country       = Column(String(100))
    pincode       = Column(String(20))

    # ── Product snapshot ─────────────────────────────────────────────────────
    product_name  = Column(String(255), nullable=False)
    product_id    = Column(Integer, nullable=True, index=True)
    product_image = Column(String(500))
    size          = Column(String(50))
    color         = Column(String(100))
    quantity      = Column(Integer, default=1)

    # Numeric(10, 2) — exact decimal arithmetic; no floating-point rounding errors.
    price        = Column(Numeric(precision=10, scale=2), default=0)
    total_amount = Column(Numeric(precision=10, scale=2), default=0)

    # ── Payment ──────────────────────────────────────────────────────────────
    payment_method = Column(String(50), default="COD")
    payment_status = Column(String(50), default="PENDING")

    # ── Tracking ─────────────────────────────────────────────────────────────
    tracking_status = Column(String(50), default="PLACED")
    tracking_note   = Column(Text)
    logistics       = Column(String(100), nullable=True)
    tracking_id     = Column(String(100), nullable=True)

    # ── Dates ────────────────────────────────────────────────────────────────
    # timezone=True ensures TIMESTAMPTZ in PostgreSQL so comparisons
    # with timezone-aware Python datetimes never raise TypeError.
    ordered_at             = Column(DateTime(timezone=True), default=_utcnow)
    created_at             = Column(DateTime(timezone=True), default=_utcnow)
    updated_at             = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)
    delivery_days          = Column(Integer, default=5)
    expected_delivery_date = Column(DateTime(timezone=True))
