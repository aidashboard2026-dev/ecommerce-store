from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, String
from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    discount_percent = Column(Numeric(precision=5, scale=2), nullable=False)
    max_discount = Column(Numeric(precision=10, scale=2), nullable=True)
    min_order = Column(Numeric(precision=10, scale=2), default=0)
    max_uses = Column(Integer, default=0)
    max_uses_per_user = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    valid_from = Column(DateTime(timezone=True), nullable=False)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)


class CouponUsage(Base):
    __tablename__ = "coupon_usages"

    id = Column(Integer, primary_key=True, index=True)
    coupon_id = Column(Integer, nullable=False, index=True)
    order_id = Column(Integer, nullable=False)
    customer_email = Column(String(255), nullable=False, index=True)
    used_at = Column(DateTime(timezone=True), default=_utcnow)
