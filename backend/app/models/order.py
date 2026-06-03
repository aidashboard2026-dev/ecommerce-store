from sqlalchemy import Column, DateTime, Integer, Numeric, String
from sqlalchemy.sql import func

from app.database.base import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(32), unique=True, index=True, nullable=False)
    customer = Column(String(100), nullable=False)
    items = Column(Integer, nullable=False, default=1)
    total = Column(Numeric(12, 2), nullable=False, default=0)
    status = Column(String(50), nullable=False, default="pending")
    payment = Column(String(50), nullable=False, default="Paid")
    ordered_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
