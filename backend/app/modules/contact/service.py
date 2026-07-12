"""
app/modules/contact/service.py

Business logic for contact message management.
Handles contact message creation, retrieval, status updates, and replies.
"""

from datetime import datetime, timezone
from typing import Optional, List, Tuple

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.modules.contact.models import ContactMessage, ContactStatus
from app.modules.contact.repository import ContactRepository
from app.modules.contact.email_service import (
    send_admin_notification,
    send_customer_auto_reply,
    send_admin_reply_to_customer,
)
from app.modules.contact.schemas import (
    ContactMessageCreate,
    ContactMessageResponse,
    ContactMessageListResponse,
    ContactMessageDetailResponse,
)


class ContactService:
    """Service layer for contact message operations."""

    @staticmethod
    def create_contact_message(
        db: Session,
        contact_data: ContactMessageCreate,
        background_tasks: Optional[BackgroundTasks] = None,
        phone: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> ContactMessageResponse:
        """
        Create a new contact message with automatic email notifications.

        Performs:
        1. Save message to database
        2. Send email notification to admin
        3. Send auto-reply email to customer

        Args:
            db: Database session
            contact_data: Contact message data

        Returns:
            ContactMessageResponse object
        """
        # Save to database
        message = ContactRepository.create(
            db=db,
            name=contact_data.name,
            email=contact_data.email,
            subject=contact_data.subject,
            message=contact_data.message,
        )

        visitor_phone = phone or contact_data.phone

        if background_tasks:
            # Send admin notification in the background
            background_tasks.add_task(
                send_admin_notification,
                customer_name=contact_data.name,
                customer_email=contact_data.email,
                subject=contact_data.subject,
                message=contact_data.message,
                submitted_at=message.created_at,
                phone=visitor_phone,
                ip_address=ip_address,
                user_agent=user_agent
            )
            # Send customer auto-reply in the background
            background_tasks.add_task(
                send_customer_auto_reply,
                customer_name=contact_data.name,
                customer_email=contact_data.email,
            )
        else:
            # Send admin notification synchronously
            send_admin_notification(
                customer_name=contact_data.name,
                customer_email=contact_data.email,
                subject=contact_data.subject,
                message=contact_data.message,
                submitted_at=message.created_at,
                phone=visitor_phone,
                ip_address=ip_address,
                user_agent=user_agent
            )
            # Send customer auto-reply synchronously
            send_customer_auto_reply(
                customer_name=contact_data.name,
                customer_email=contact_data.email,
            )

        return ContactMessageResponse.from_orm(message)

    @staticmethod
    def get_contact_message(
        db: Session,
        message_id: int,
    ) -> Optional[ContactMessageDetailResponse]:
        """
        Get a contact message by ID.

        Args:
            db: Database session
            message_id: Contact message ID

        Returns:
            ContactMessageDetailResponse or None if not found
        """
        message = ContactRepository.get_by_id(db, message_id)
        if message:
            return ContactMessageDetailResponse.from_orm(message)
        return None

    @staticmethod
    def list_contact_messages(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> ContactMessageListResponse:
        """
        Get paginated list of contact messages.

        Args:
            db: Database session
            skip: Number of records to skip
            limit: Number of records per page
            search: Search term for name, email, or subject
            status: Filter by status (New, Pending, Replied, Closed)
            sort_by: Field to sort by
            sort_order: Sort order (asc, desc)

        Returns:
            ContactMessageListResponse with paginated results
        """
        messages, total = ContactRepository.list_paginated(
            db=db,
            skip=skip,
            limit=limit,
            search=search,
            status=status,
            sort_by=sort_by,
            sort_order=sort_order,
        )

        page = (skip // limit) + 1 if limit > 0 else 1
        pages = (total + limit - 1) // limit if limit > 0 else 1

        return ContactMessageListResponse(
            items=[ContactMessageResponse.from_orm(msg) for msg in messages],
            total=total,
            page=page,
            page_size=limit,
            pages=pages,
        )

    @staticmethod
    def get_all_matching_messages(
        db: Session,
        search: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> List[ContactMessageResponse]:
        """Get all contact messages matching filters without pagination."""
        messages = ContactRepository.get_all_matching(
            db=db,
            search=search,
            status=status,
            sort_by=sort_by,
            sort_order=sort_order,
        )
        return [ContactMessageResponse.from_orm(msg) for msg in messages]


    @staticmethod
    def update_contact_status(
        db: Session,
        message_id: int,
        status: str,
    ) -> Optional[ContactMessageResponse]:
        """
        Update contact message status.

        Args:
            db: Database session
            message_id: Contact message ID
            status: New status (New, Pending, Replied, Closed)

        Returns:
            Updated ContactMessageResponse or None if not found
        """
        message = ContactRepository.update_status(db, message_id, status)
        if message:
            return ContactMessageResponse.from_orm(message)
        return None

    @staticmethod
    def send_reply(
        db: Session,
        message_id: int,
        reply_message: str,
        admin_id: Optional[int] = None,
        background_tasks: Optional[BackgroundTasks] = None,
    ) -> Optional[ContactMessageResponse]:
        """
        Send reply to a contact message.

        Performs:
        1. Save reply to database
        2. Update status to "Replied"
        3. Set replied_at timestamp
        4. Send email reply to customer

        Args:
            db: Database session
            message_id: Contact message ID to reply to
            reply_message: Admin's reply message
            admin_id: ID of admin sending the reply

        Returns:
            Updated ContactMessageResponse or None if not found
        """
        # Get the original message
        original_message = ContactRepository.get_by_id(db, message_id)
        if not original_message:
            return None

        # Add reply and update status
        message = ContactRepository.add_reply(
            db=db,
            message_id=message_id,
            reply_message=reply_message,
            admin_id=admin_id,
        )

        if background_tasks:
            # Send reply email to customer in the background
            background_tasks.add_task(
                send_admin_reply_to_customer,
                customer_name=original_message.name,
                customer_email=original_message.email,
                subject=original_message.subject,
                reply_message=reply_message,
            )
        else:
            # Send reply email to customer synchronously
            send_admin_reply_to_customer(
                customer_name=original_message.name,
                customer_email=original_message.email,
                subject=original_message.subject,
                reply_message=reply_message,
            )

        return ContactMessageResponse.from_orm(message)

    @staticmethod
    def delete_contact_message(
        db: Session,
        message_id: int,
    ) -> bool:
        """
        Delete a contact message.

        Args:
            db: Database session
            message_id: Contact message ID

        Returns:
            True if deleted, False if not found
        """
        return ContactRepository.delete(db, message_id)

    @staticmethod
    def get_stats(db: Session) -> dict:
        """
        Get contact message statistics for dashboard.

        Returns:
            Dictionary with statistics
        """
        return ContactRepository.get_stats(db)

    @staticmethod
    def get_recent_messages(
        db: Session,
        limit: int = 5,
    ) -> List[ContactMessageResponse]:
        """
        Get recent contact messages.

        Args:
            db: Database session
            limit: Number of recent messages to return

        Returns:
            List of recent ContactMessageResponse objects
        """
        messages = ContactRepository.get_recent_messages(db, limit)
        return [ContactMessageResponse.from_orm(msg) for msg in messages]
