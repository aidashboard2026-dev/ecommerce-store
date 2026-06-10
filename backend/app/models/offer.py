from datetime import datetime

from app.database.base import Base

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Date,
    Time,
    DateTime
)

class Offer(Base):
    __tablename__ = "offers"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(255), nullable=False)

    percentage = Column(String(50))

    description = Column(Text)

    banner_image = Column(String(500))

    start_date = Column(Date)

    end_date = Column(Date)

    start_time = Column(Time)

    end_time = Column(Time)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    status = Column(
        String(20),
        default="saved"
    )

    published_at = Column(
        DateTime,
        nullable=True
    )

    expires_at = Column(
        DateTime,
        nullable=True
    )