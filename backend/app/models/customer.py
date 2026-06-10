from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Integer,
    String,
    Text,
)
from sqlalchemy.sql import func

from app.database.base import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)

    # ── Identity ─────────────────────────────────────────────────────────────
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    dob = Column(Date, nullable=True)

    # ── Auth (admin-created; password_hash kept from original) ───────────────
    password_hash = Column(String(255), nullable=True)   # nullable — admin-created customers may not have a password

    # ── Status & Segmentation ────────────────────────────────────────────────
    is_active = Column(Boolean, default=True, nullable=False)
    # Comma-separated tags: "vip,wholesale,returner"
    tags = Column(String(500), nullable=True)

    # ── Location (denormalised from latest order) ─────────────────────────────
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)

    # ── Admin notes ──────────────────────────────────────────────────────────
    notes = Column(Text, nullable=True)

    # ── Timestamps ───────────────────────────────────────────────────────────
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now(),
        nullable=True,
    )
