from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Text
)

from app.database.base import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)

    # Order
    order_number = Column(String(50), unique=True, nullable=False, index=True)

    # Customer
    customer_name = Column(String(255), nullable=False)
    customer_email = Column(String(255))
    customer_phone = Column(String(20))

    # Address
    address_line1 = Column(String(255))
    address_line2 = Column(String(255))

    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))

    pincode = Column(String(20))

    # Product
    product_name = Column(String(255), nullable=False)

    product_image = Column(String(500))

    size = Column(String(50))

    color = Column(String(100))

    quantity = Column(Integer, default=1)

    price = Column(Float, default=0)

    total_amount = Column(Float, default=0)

    # Payment
    payment_method = Column(
        String(50),
        default="COD"
    )

    payment_status = Column(
        String(50),
        default="PENDING"
    )

    # Tracking
    tracking_status = Column(
        String(50),
        default="PLACED"
    )

    tracking_note = Column(Text)

    # Logistics provider and tracking identifier
    logistics = Column(String(100), nullable=True)
    tracking_id = Column(String(100), nullable=True)

    # Dates
    ordered_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    delivery_days = Column(
        Integer,
        default=5
    )

    expected_delivery_date = Column(
        DateTime
    )