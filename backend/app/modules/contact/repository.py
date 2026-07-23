"""
app/modules/contact/repository.py

Data access layer for contact messages.
Handles all database operations.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, and_, or_

from app.modules.contact.models import ContactMessage, ContactStatus


# Allowlist of sortable columns for contact messages.
# Using getattr() on a model class is unsafe because an attacker could
# reference internal SQLAlchemy attributes or relationships that return
# unexpected column expressions.  This explicit dict restricts sorting
# to known safe columns only.
_ALLOWED_SORT_FIELDS = {
    "id": ContactMessage.id,
    "name": ContactMessage.name,
    "email": ContactMessage.email,
    "subject": ContactMessage.subject,
    "status": ContactMessage.status,
    "replied_at": ContactMessage.replied_at,
    "created_at": ContactMessage.created_at,
    "updated_at": ContactMessage.updated_at,
}


class ContactRepository:
    """Repository for contact message database operations."""

    @staticmethod
    def create(
        db: Session,
        name: str,
        email: str,
        subject: str,
        message: str,
    ) -> ContactMessage:
        """Create a new contact message."""
        contact_msg = ContactMessage(
            name=name,
            email=email,
            subject=subject,
            message=message,
            status=ContactStatus.NEW,
        )
        db.add(contact_msg)
        db.commit()
        db.refresh(contact_msg)
        return contact_msg

    @staticmethod
    def get_by_id(db: Session, message_id: int) -> Optional[ContactMessage]:
        """Get a contact message by ID."""
        return db.query(ContactMessage).filter(ContactMessage.id == message_id).first()

    @staticmethod
    def list_paginated(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> Tuple[List[ContactMessage], int]:
        """
        Get paginated list of contact messages with optional filtering and sorting.

        Args:
            db: Database session
            skip: Number of records to skip
            limit: Number of records per page
            search: Search term for name, email, or subject
            status: Filter by status
            sort_by: Field to sort by (created_at, status, name, email)
            sort_order: Sort order (asc, desc)

        Returns:
            Tuple of (messages list, total count)
        """
        query = db.query(ContactMessage)

        # Apply search filter
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    ContactMessage.name.ilike(search_term),
                    ContactMessage.email.ilike(search_term),
                    ContactMessage.subject.ilike(search_term),
                )
            )

        # Apply status filter
        if status:
            query = query.filter(ContactMessage.status == status)

        # Get total count before pagination
        total = query.count()

        # Apply sorting
        sort_column = _ALLOWED_SORT_FIELDS.get(sort_by, ContactMessage.created_at)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        # Apply pagination
        messages = query.offset(skip).limit(limit).all()

        return messages, total

    @staticmethod
    def get_all_matching(
        db: Session,
        search: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> List[ContactMessage]:
        """Get all contact messages matching filters without pagination."""
        query = db.query(ContactMessage)

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    ContactMessage.name.ilike(search_term),
                    ContactMessage.email.ilike(search_term),
                    ContactMessage.subject.ilike(search_term),
                )
            )

        if status:
            query = query.filter(ContactMessage.status == status)

        sort_column = _ALLOWED_SORT_FIELDS.get(sort_by, ContactMessage.created_at)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        return query.all()


    @staticmethod
    def update_status(
        db: Session,
        message_id: int,
        status: str,
    ) -> Optional[ContactMessage]:
        """Update the status of a contact message."""
        contact_msg = db.query(ContactMessage).filter(
            ContactMessage.id == message_id
        ).first()

        if contact_msg:
            contact_msg.status = status
            contact_msg.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(contact_msg)

        return contact_msg

    @staticmethod
    def add_reply(
        db: Session,
        message_id: int,
        reply_message: str,
        admin_id: Optional[int] = None,
    ) -> Optional[ContactMessage]:
        """Add reply to a contact message."""
        contact_msg = db.query(ContactMessage).filter(
            ContactMessage.id == message_id
        ).first()

        if contact_msg:
            contact_msg.admin_reply = reply_message
            contact_msg.status = ContactStatus.REPLIED
            contact_msg.replied_at = datetime.now(timezone.utc)
            contact_msg.admin_id = admin_id
            contact_msg.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(contact_msg)

        return contact_msg

    @staticmethod
    def delete(db: Session, message_id: int) -> bool:
        """Delete a contact message."""
        contact_msg = db.query(ContactMessage).filter(
            ContactMessage.id == message_id
        ).first()

        if contact_msg:
            db.delete(contact_msg)
            db.commit()
            return True

        return False

    @staticmethod
    def get_stats(db: Session) -> dict:
        """Get contact message statistics."""
        from sqlalchemy import case, func as sqla_func

        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        # Single query for all time-windowed counts
        time_stats = db.query(
            sqla_func.count(ContactMessage.id).label("total"),
            sqla_func.sum(case((ContactMessage.created_at >= today, 1), else_=0)).label("today"),
            sqla_func.sum(case((ContactMessage.created_at >= week_ago, 1), else_=0)).label("week"),
            sqla_func.sum(case((ContactMessage.created_at >= month_ago, 1), else_=0)).label("month"),
        ).one()

        # Single query for status-based counts
        status_stats = db.query(
            sqla_func.sum(case((ContactMessage.status.in_([ContactStatus.NEW, ContactStatus.PENDING]), 1), else_=0)).label("pending"),
            sqla_func.sum(case((ContactMessage.status == ContactStatus.CLOSED, 1), else_=0)).label("closed"),
        ).one()

        return {
            "total_messages": int(time_stats.total or 0),
            "today_messages": int(time_stats.today or 0),
            "week_messages": int(time_stats.week or 0),
            "month_messages": int(time_stats.month or 0),
            "pending_count": int(status_stats.pending or 0),
            "closed_count": int(status_stats.closed or 0),
        }

    @staticmethod
    def get_recent_messages(db: Session, limit: int = 5) -> List[ContactMessage]:
        """Get recent contact messages."""
        return (
            db.query(ContactMessage)
            .order_by(desc(ContactMessage.created_at))
            .limit(limit)
            .all()
        )
