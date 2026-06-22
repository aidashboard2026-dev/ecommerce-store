from datetime import datetime

from app.database.base import Base

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
)


class Banner(Base):
    __tablename__ = "banners"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(255), nullable=False)

    subtitle = Column(String(500))

    banner_image = Column(String(500))

    cta_text = Column(String(100))

    cta_link = Column(String(500))

    placement = Column(String(50), nullable=False, default="hero", index=True)

    sort_order = Column(Integer, default=0)

    is_active = Column(Boolean, default=True, index=True)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )