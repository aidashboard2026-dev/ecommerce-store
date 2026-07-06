"""
app/modules/contact/models.py

Contact Message domain model for enterprise contact management.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, Index, Enum
from sqlalchemy.sql import func
from app.core.database import Base
import enum


def _utcnow() -> datetime:
    """Timezone-aware UTC timestamp — avoids comparing naive/aware datetimes."""
    return datetime.now(timezone.utc)


class ContactStatus(str, enum.Enum):
    """Contact message status enumeration."""
    NEW = "New"
    PENDING = "Pending"
    REPLIED = "Replied"
    CLOSED = "Closed"


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    # ── Primary Key ──────────────────────────────────────────────────────────
    id = Column(Integer, primary_key=True, index=True)

    # ── Contact Information ──────────────────────────────────────────────────
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    subject = Column(String(500), nullable=False)
    message = Column(Text, nullable=False)

    # ── Status Management ────────────────────────────────────────────────────
    status = Column(
        String(20),
        nullable=False,
        default=ContactStatus.NEW,
        index=True
    )

    # ── Tracking Dates ───────────────────────────────────────────────────────
    replied_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, index=True)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    # ── Admin reply information ──────────────────────────────────────────────
    admin_reply = Column(Text, nullable=True)
    admin_id = Column(Integer, nullable=True, index=True)

    # ── Indexes for common queries ───────────────────────────────────────────
    __table_args__ = (
        Index('ix_contact_messages_status', 'status'),
        Index('ix_contact_messages_created_at', 'created_at'),
        Index('ix_contact_messages_email', 'email'),
        Index('ix_contact_messages_status_created_at', 'status', 'created_at'),
    )
