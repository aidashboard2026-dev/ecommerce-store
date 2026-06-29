"""
app/shared/notifications/service.py

Notification dispatcher that respects active toggles in the notification_settings table.
If a channel is turned OFF, it is guaranteed that the backend will not send it.
"""

import logging
import asyncio
from sqlalchemy.orm import Session
from app.modules.settings.models import NotificationSetting
from app.shared.email.service import _send_via_resend, _send_via_smtp
from app.core.config import settings

logger = logging.getLogger("app.notifications")

async def send_notification(
    db: Session,
    event_name: str,
    to_email: str,
    context: dict,
    subject: str,
    text_body: str,
    html_body: str,
) -> None:
    """
    Check notification toggles in the database before sending notifications.
    """
    # Normalize event name
    normalized_name = event_name
    if event_name == "New Review Published":
        normalized_name = "New Review Posted"

    # Query DB configuration
    setting = db.query(NotificationSetting).filter(
        NotificationSetting.event_name == normalized_name
    ).first()

    email_enabled = True
    whatsapp_enabled = False

    if setting:
        email_enabled = setting.email_enabled
        whatsapp_enabled = setting.whatsapp_enabled
    else:
        logger.warning(f"Notification setting for event '{event_name}' not found. Defaulting to Email: True, WhatsApp: False.")

    if email_enabled:
        logger.info(f"Dispatching Email notification for event '{event_name}' to {to_email}")
        try:
            if settings.RESEND_API_KEY:
                await _send_via_resend(to_email, subject, html_body, text_body)
            elif settings.SMTP_HOST:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None, _send_via_smtp, to_email, subject, html_body, text_body
                )
            else:
                logger.warning(
                    f"[SIMULATION] Email sent to {to_email} (Subject: {subject}): {text_body}"
                )
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}", exc_info=True)
    else:
        logger.info(f"Email notification for event '{event_name}' is disabled. Skipping.")

    if whatsapp_enabled:
        logger.info(f"Dispatching WhatsApp notification for event '{event_name}' to {to_email}")
        logger.warning(
            f"[SIMULATION] WhatsApp message sent to client: {text_body}"
        )
    else:
        logger.info(f"WhatsApp notification for event '{event_name}' is disabled. Skipping.")


def send_notification_sync(
    db: Session,
    event_name: str,
    to_email: str,
    context: dict,
    subject: str,
    text_body: str,
    html_body: str,
) -> None:
    """
    Synchronous wrapper for send_notification. Safe to call from sync services.
    """
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        # Safely submit to the running event loop
        loop.create_task(
            send_notification(db, event_name, to_email, context, subject, text_body, html_body)
        )
    else:
        # Run blocking synchronously
        asyncio.run(
            send_notification(db, event_name, to_email, context, subject, text_body, html_body)
        )
