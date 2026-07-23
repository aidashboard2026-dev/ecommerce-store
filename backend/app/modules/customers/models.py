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

from app.core.database import Base


class Customer(Base):
    __tablename__ = "customers"

    # ------------------------------------------------------------------
    # Primary Key
    # ------------------------------------------------------------------

    id = Column(Integer, primary_key=True, index=True)

    # ------------------------------------------------------------------
    # Firebase Authentication
    # ------------------------------------------------------------------

    firebase_uid = Column(
        String(128),
        unique=True,
        nullable=True,
        index=True,
    )

    auth_provider = Column(
        String(30),
        nullable=False,
        default="firebase",
    )

    email_verified = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    photo_url = Column(
        String(1000),
        nullable=True,
    )

    google_name = Column(
        String(255),
        nullable=True,
    )

    # ------------------------------------------------------------------
    # Basic Information
    # ------------------------------------------------------------------

    first_name = Column(
        String(100),
        nullable=False,
    )

    last_name = Column(
        String(100),
        nullable=False,
    )

    email = Column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    phone = Column(
        String(20),
        nullable=True,
    )

    dob = Column(
        Date,
        nullable=True,
    )

    # ------------------------------------------------------------------
    # Address
    # ------------------------------------------------------------------

    address_line1 = Column(
        String(255),
        nullable=True,
    )

    address_line2 = Column(
        String(255),
        nullable=True,
    )

    city = Column(
        String(100),
        nullable=True,
    )

    state = Column(
        String(100),
        nullable=True,
    )

    country = Column(
        String(100),
        nullable=True,
    )

    pincode = Column(
        String(20),
        nullable=True,
    )

    # ------------------------------------------------------------------
    # Admin
    # ------------------------------------------------------------------

    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
    )

    tags = Column(
        String(500),
        nullable=True,
    )

    notes = Column(
        Text,
        nullable=True,
    )

    # ------------------------------------------------------------------
    # Activity
    # ------------------------------------------------------------------

    last_login_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
