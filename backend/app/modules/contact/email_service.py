"""
app/modules/contact/email_service.py

Email service for contact messages with professional HTML and plain-text templates.
Handles sending emails to admin and automatic customer replies.
Uses the centralized Settings and builder presentation layer.
"""

import time
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from typing import Tuple

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Helpers ──────────────────────────────────────────────────────────────────

def generate_msg_reference_id() -> str:
    """Generates a human-readable unique reference ID for support messages."""
    timestamp = datetime.now().strftime("%Y%m%d")
    unique_suffix = f"{int(time.time() * 1000) % 1000000:06d}"
    return f"MSG-{timestamp}-{unique_suffix}"


# ── Email Template Adapters ──────────────────────────────────────────────────

def get_admin_email_html(
    customer_name: str,
    customer_email: str,
    subject: str,
    message: str,
    submitted_at: datetime,
    reference_id: str,
    phone: str = None,
    ip_address: str = None,
    user_agent: str = None,
) -> Tuple[str, str]:
    """Generate professional HTML and plain-text templates for admin notification."""
    from app.shared.email.builder import build_contact_admin_notification
    from app.shared.email.service import compile_email_branding
    
    submitted_date = submitted_at.strftime("%B %d, %Y")
    submitted_time = submitted_at.strftime("%I:%M %p")
    branding = compile_email_branding()
    return build_contact_admin_notification(
        branding=branding,
        customer_name=customer_name,
        customer_email=customer_email,
        subject=subject,
        message=message,
        submitted_date=submitted_date,
        submitted_time=submitted_time,
        reference_id=reference_id,
        phone=phone,
        ip_address=ip_address,
        user_agent=user_agent
    )


def get_customer_reply_html(customer_name: str, reference_id: str) -> Tuple[str, str]:
    """Generate professional HTML and plain-text templates for customer auto-reply."""
    from app.shared.email.builder import build_contact_auto_reply
    from app.shared.email.service import compile_email_branding
    
    branding = compile_email_branding()
    submitted_date = datetime.now().strftime("%B %d, %Y")
    return build_contact_auto_reply(
        branding=branding,
        customer_name=customer_name,
        submitted_subject="General Inquiry",
        submitted_date=submitted_date,
        reference_id=reference_id
    )


def get_admin_reply_html(customer_name: str, subject: str, reply_message: str, reference_id: str) -> Tuple[str, str]:
    """Generate professional HTML and plain-text templates for admin reply to customer."""
    from app.shared.email.builder import build_admin_reply
    from app.shared.email.service import compile_email_branding
    
    branding = compile_email_branding()
    return build_admin_reply(
        branding=branding,
        customer_name=customer_name,
        subject=subject,
        reply_message=reply_message,
        reference_id=reference_id
    )


# ── Email Sending Functions ──────────────────────────────────────────────────

def send_admin_notification(
    customer_name: str,
    customer_email: str,
    subject: str,
    message: str,
    submitted_at: datetime,
    phone: str = None,
    ip_address: str = None,
    user_agent: str = None,
) -> bool:
    """Send HTML and plain-text email notification to admin about new contact message."""
    reference_id = generate_msg_reference_id()
    try:
        from app.shared.email.service import compile_email_branding, send_email_unified, _run_async_in_sync
        branding = compile_email_branding()
        store_name = branding.get("store_name", "My Designers")
        support_email = branding.get("support_email", settings.SUPPORT_EMAIL)

        html_content, text_content = get_admin_email_html(
            customer_name=customer_name,
            customer_email=customer_email,
            subject=subject,
            message=message,
            submitted_at=submitted_at,
            reference_id=reference_id,
            phone=phone,
            ip_address=ip_address,
            user_agent=user_agent
        )

        full_subject = f"[{store_name}] New Contact: {subject}"

        return _run_async_in_sync(
            send_email_unified(
                to_email=support_email,
                subject=full_subject,
                html_body=html_content,
                text_body=text_content,
                reference_id=reference_id,
                reply_to=customer_email,
                provider_override="RESEND"
            )
        )
    except Exception as e:
        logger.error(
            "Failed to send admin notification for reference %s: %s",
            reference_id, e, exc_info=True
        )
        return False


def send_customer_auto_reply(customer_name: str, customer_email: str) -> bool:
    """Send automatic thank-you email to customer."""
    reference_id = generate_msg_reference_id()
    try:
        from app.shared.email.service import compile_email_branding, send_email_unified, _run_async_in_sync
        branding = compile_email_branding()
        store_name = branding.get("store_name", "My Designers")

        html_content, text_content = get_customer_reply_html(customer_name, reference_id)
        full_subject = "We've received your message"

        return _run_async_in_sync(
            send_email_unified(
                to_email=customer_email,
                subject=full_subject,
                html_body=html_content,
                text_body=text_content,
                reference_id=reference_id,
                provider_override="RESEND"
            )
        )
    except Exception as e:
        logger.error(
            "Failed to send customer auto-reply for reference %s: %s",
            reference_id, e, exc_info=True
        )
        return False


def send_admin_reply_to_customer(
    customer_name: str,
    customer_email: str,
    subject: str,
    reply_message: str,
) -> bool:
    """Send admin reply email to customer."""
    reference_id = generate_msg_reference_id()
    try:
        from app.shared.email.service import send_email_unified, _run_async_in_sync
        
        html_content, text_content = get_admin_reply_html(
            customer_name,
            subject,
            reply_message,
            reference_id
        )
        full_subject = f"Re: {subject}"

        return _run_async_in_sync(
            send_email_unified(
                to_email=customer_email,
                subject=full_subject,
                html_body=html_content,
                text_body=text_content,
                reference_id=reference_id,
                provider_override="RESEND"
            )
        )
    except Exception as e:
        logger.error(
            "Failed to send admin support reply for reference %s: %s",
            reference_id, e, exc_info=True
        )
        return False


# ── Legacy function for backward compatibility ────────────────────────────────

def send_contact_email(
    name: str,
    email: str,
    subject: str,
    message: str,
    phone: str = None,
    ip_address: str = None,
    user_agent: str = None,
) -> bool:
    """Legacy function - calls the new separate email functions."""
    from datetime import datetime, timezone

    submitted_at = datetime.now(timezone.utc)

    admin_ok = send_admin_notification(
        customer_name=name,
        customer_email=email,
        subject=subject,
        message=message,
        submitted_at=submitted_at,
        phone=phone,
        ip_address=ip_address,
        user_agent=user_agent
    )
    customer_ok = send_customer_auto_reply(name, email)

    return admin_ok and customer_ok
