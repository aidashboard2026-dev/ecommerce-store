from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, backref

from app.core.database import Base


class StoreSettings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    store_name = Column(String(150), nullable=False, default="My Store")
    store_url = Column(String(500), nullable=False, default="https://example.com")
    support_email = Column(String(255), nullable=False, default="support@example.com")
    support_phone = Column(String(30), nullable=True)
    description = Column(Text, nullable=True)
    store_location = Column(Text, nullable=True)
    logo = Column(Text, nullable=True)
    country = Column(String(100), nullable=False, default="India")
    currency = Column(String(10), nullable=False, default="INR")
    timezone = Column(String(100), nullable=False, default="Asia/Kolkata")
    weight_unit = Column(String(20), nullable=False, default="kg")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AdminSecurity(Base):
    __tablename__ = "admin_security"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("admins.id", ondelete="CASCADE"), nullable=False, unique=True)
    username = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    two_factor_enabled = Column(Boolean, nullable=False, default=False)
    email_verified = Column(Boolean, nullable=False, default=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    admin = relationship("Admin", backref=backref("security", uselist=False))


class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=False)
    fee = Column(Numeric(8, 2), nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class NotificationSetting(Base):
    __tablename__ = "notification_settings"

    id = Column(Integer, primary_key=True, index=True)
    event_name = Column(String(120), nullable=False, unique=True, index=True)
    email_enabled = Column(Boolean, nullable=False, default=True)
    whatsapp_enabled = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
