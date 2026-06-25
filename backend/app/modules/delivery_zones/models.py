from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String

from app.core.database import Base


class DeliveryZone(Base):
    __tablename__ = "delivery_zones"

    id = Column(
        Integer,
        primary_key=True
    )

    city = Column(
        String(100),
        unique=True
    )

    delivery_days = Column(
        Integer,
        nullable=False
    )