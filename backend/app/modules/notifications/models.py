from sqlalchemy import Column, Index, Integer, String, Text, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from app.core.database import Base

class AdminNotification(Base):
    __tablename__ = "admin_notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), nullable=False, default="info") # success, warning, error, info
    event = Column(String(100), nullable=False) # New Order Placed, Payment Received, Order Cancelled, Low Stock Alert
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    metadata_json = Column("metadata", JSON, nullable=True)

    __table_args__ = (
        Index("ix_admin_notif_unread", "is_read", "created_at"),
    )
