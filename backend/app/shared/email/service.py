"""
Email service for My Designers.

Supports two providers — whichever is configured in .env:
  1. Resend (recommended): set RESEND_API_KEY
  2. SMTP (fallback): set SMTP_HOST, SMTP_USER, SMTP_PASSWORD

If neither is configured, emails are logged to the server console only
(useful for local dev/testing without a real mail provider).

Usage:
    from app.shared.email.service import send_password_reset_email
    await send_password_reset_email(to_email="user@example.com", reset_url="https://...")
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.header import Header
from typing import Optional, List, Tuple

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def compile_email_branding(db=None) -> dict:
    """
    Compiles standard email branding coordinates by reading centralized
    settings from the database and using fallback Settings parameters.
    """
    from datetime import datetime
    branding = {
        "store_name": settings.STORE_NAME,
        "store_logo": settings.STORE_LOGO_URL or None,
        "store_url": (settings.STORE_URL or settings.FRONTEND_URL).replace("https://", "").replace("http://", "").rstrip("/"),
        "support_email": settings.SUPPORT_EMAIL,
        "support_phone": settings.SUPPORT_PHONE,
        "facebook_url": settings.FACEBOOK_URL,
        "instagram_url": settings.INSTAGRAM_URL,
        "linkedin_url": settings.LINKEDIN_URL,
        "business_address": settings.BUSINESS_ADDRESS,
        "privacy_policy_url": f"{settings.FRONTEND_URL}/privacy-policy",
        "terms_url": f"{settings.FRONTEND_URL}/terms-and-conditions",
        "current_year": str(datetime.now().year),
    }

    local_db = None
    if db is None:
        try:
            from app.core.database import SessionLocal
            local_db = SessionLocal()
            db = local_db
        except Exception:
            pass

    if db is not None:
        try:
            from app.modules.settings.service import get_or_create_store_settings
            s = get_or_create_store_settings(db)
            if s.store_name:
                branding["store_name"] = s.store_name
            if s.store_url:
                branding["store_url"] = s.store_url.replace("https://", "").replace("http://", "").rstrip("/")
            if s.support_email:
                branding["support_email"] = s.support_email
            if s.support_phone:
                branding["support_phone"] = s.support_phone
            if s.logo:
                branding["store_logo"] = s.logo
        except Exception:
            pass
        finally:
            if local_db is not None:
                local_db.close()

    return branding


def get_db_store_name() -> str:
    try:
        from app.core.database import SessionLocal
        from app.modules.settings.service import get_or_create_store_settings
        db = SessionLocal()
        try:
            return get_or_create_store_settings(db).store_name
        finally:
            db.close()
    except Exception:
        return getattr(settings, "SMTP_FROM_NAME", "My Designers") or "My Designers"


def _password_reset_html(reset_url: str, expires_minutes: int, store_name: str) -> str:
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
                {store_name}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 12px;color:#111827;font-size:20px;font-weight:600;">
                Reset your password
              </h2>
              <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
                We received a request to reset the password for your {store_name} account.
                Click the button below to choose a new password. This link expires in
                <strong>{expires_minutes} minutes</strong>.
              </p>

              <div style="text-align:center;margin:32px 0;">
                <a href="{reset_url}"
                   style="display:inline-block;background:#7c3aed;color:#ffffff;
                          font-size:15px;font-weight:600;text-decoration:none;
                          padding:14px 32px;border-radius:8px;letter-spacing:0.1px;">
                  Reset Password
                </a>
              </div>

              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;word-break:break-all;">
                <a href="{reset_url}" style="color:#7c3aed;font-size:13px;">{reset_url}</a>
              </p>

              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

              <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
                If you didn't request a password reset, you can safely ignore this email.
                Your password will not be changed. For security, this link is single-use
                and expires in {expires_minutes} minutes.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                © 2026 {store_name}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _password_reset_text(reset_url: str, expires_minutes: int, store_name: str) -> str:
    return (
        f"Reset your {store_name} password\n\n"
        f"We received a request to reset your password.\n"
        f"Click the link below to set a new password (expires in {expires_minutes} minutes):\n\n"
        f"{reset_url}\n\n"
        f"If you didn't request this, ignore this email — your password won't change.\n"
    )


# ── Provider implementations & Unified Failover ────────────────────────────────

import threading
import time
import base64

METRICS_LOCK = threading.Lock()
METRICS = {
    "emails_sent": 0,
    "emails_failed": 0,
    "resend_success": 0,
    "smtp_success": 0,
    "fallback_count": 0,
    "total_delivery_time_ms": 0.0,
    "timeout_count": 0,
    "provider_errors": 0,
}

def get_email_metrics() -> dict:
    """
    Returns a copy of the current delivery metrics with average delivery time computed.
    """
    with METRICS_LOCK:
        res = dict(METRICS)
        successes = res["resend_success"] + res["smtp_success"]
        if successes > 0:
            avg_time = res["total_delivery_time_ms"] / successes
            res["average_delivery_time_ms"] = round(avg_time, 2)
        else:
            res["average_delivery_time_ms"] = 0.0
        return res

def verify_plain_text(text_body: str, reference_id: Optional[str] = None) -> str:
    """
    Ensures that plain text email body has support contacts, store URL, and reference ID.
    """
    lines = [text_body.strip()]
    store_url = settings.STORE_URL or settings.FRONTEND_URL
    support_email = settings.SUPPORT_EMAIL
    support_phone = settings.SUPPORT_PHONE

    if store_url and store_url not in text_body:
        lines.append(f"Store URL: {store_url}")
    if support_email and support_email not in text_body:
        lines.append(f"Support Contact: {support_email}")
    if support_phone and support_phone not in text_body:
        lines.append(f"Phone Contact: {support_phone}")
    if reference_id and reference_id not in text_body:
        lines.append(f"Reference ID: {reference_id}")
    return "\n\n".join(lines)

def get_sender_identity(provider: str) -> dict:
    """
    Retrieves sender identity config (from name, from email, reply to) for the provider.
    """
    store_name = get_db_store_name()
    if provider.upper() == "RESEND":
        from_name = settings.RESEND_FROM_NAME or settings.SMTP_FROM_NAME or store_name
        from_email = settings.RESEND_FROM_EMAIL or settings.SMTP_FROM_EMAIL
        reply_to = settings.RESEND_REPLY_TO or settings.SMTP_REPLY_TO or settings.SUPPORT_EMAIL
    else:
        from_name = settings.SMTP_FROM_NAME or store_name
        from_email = settings.SMTP_FROM_EMAIL
        reply_to = settings.SMTP_REPLY_TO or settings.SUPPORT_EMAIL
    return {
        "from_name": from_name,
        "from_email": from_email,
        "reply_to": reply_to,
    }

def normalize_attachments(attachments: Optional[List[dict]] = None) -> Tuple[List[dict], List[dict]]:
    """
    Normalizes attachments and filters out files exceeding the 10MB limit.
    Returns (smtp_attachments, resend_attachments).
    """
    smtp_list = []
    resend_list = []
    if not attachments:
        return smtp_list, resend_list

    max_size = 10 * 1024 * 1024  # 10MB
    for att in attachments:
        name = att.get("filename", "attachment.bin")
        content = att.get("content")
        if not content:
            continue

        content_bytes = b""
        if isinstance(content, str):
            try:
                content_bytes = base64.b64decode(content)
            except Exception:
                content_bytes = content.encode("utf-8")
        elif isinstance(content, bytes):
            content_bytes = content

        if len(content_bytes) > max_size:
            logger.warning(
                "Attachment '%s' exceeds 10MB limit (%d bytes). Skipping attachment.",
                name, len(content_bytes)
            )
            continue

        smtp_list.append({
            "filename": name,
            "content": content_bytes,
            "type": att.get("type", "application/octet-stream")
        })

        resend_list.append({
            "filename": name,
            "content": base64.b64encode(content_bytes).decode("utf-8")
        })

    return smtp_list, resend_list

def _run_async_in_sync(coro) -> bool:
    """
    Safely runs an async coroutine synchronously from a sync function context.
    Works perfectly regardless of whether we are inside or outside a running event loop.
    """
    import asyncio
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        # Event loop is running in this thread (e.g. FastAPI main thread).
        # We spawn a worker thread to execute the coroutine and block-wait on its result.
        result = [False]
        def worker():
            new_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(new_loop)
            try:
                result[0] = new_loop.run_until_complete(coro)
            finally:
                new_loop.close()
        t = threading.Thread(target=worker)
        t.start()
        t.join()
        return result[0]
    else:
        return asyncio.run(coro)

async def _send_via_resend_raw(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str,
    resend_attachments: List[dict],
    sender_info: dict,
) -> None:
    payload = {
        "from": f"{sender_info['from_name']} <{sender_info['from_email']}>",
        "to": [to_email],
        "subject": subject,
        "html": html_body,
        "text": text_body,
    }
    if sender_info.get("reply_to"):
        payload["reply_to"] = sender_info["reply_to"]
    if resend_attachments:
        payload["attachments"] = resend_attachments

    timeout = settings.RESEND_TIMEOUT or 15
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
    if resp.status_code not in (200, 201):
        raise RuntimeError(
            f"Resend API error {resp.status_code}: {resp.text}"
        )

def _send_via_smtp_raw(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str,
    smtp_attachments: List[dict],
    sender_info: dict,
) -> None:
    msg = MIMEMultipart("mixed")
    msg["Subject"] = Header(subject, "utf-8")
    msg["From"] = f"{Header(sender_info['from_name'], 'utf-8').encode()} <{sender_info['from_email']}>"
    msg["To"] = to_email
    if sender_info.get("reply_to"):
        msg["Reply-To"] = sender_info["reply_to"]

    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(text_body, "plain", "utf-8"))
    alt.attach(MIMEText(html_body, "html", "utf-8"))
    msg.attach(alt)

    for att in smtp_attachments:
        part = MIMEApplication(att["content"], _subtype="pdf")
        part.add_header("Content-Disposition", "attachment", filename=att["filename"])
        msg.attach(part)

    timeout = settings.SMTP_TIMEOUT or 15
    smtp_cls = smtplib.SMTP_SSL if settings.SMTP_SSL else smtplib.SMTP
    with smtp_cls(settings.SMTP_HOST, settings.SMTP_PORT, timeout=timeout) as server:
        if settings.SMTP_TLS and not settings.SMTP_SSL:
            server.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(sender_info["from_email"], to_email, msg.as_string())

async def send_email_unified(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str,
    attachments: Optional[List[dict]] = None,
    reference_id: Optional[str] = None,
    reply_to: Optional[str] = None,
    provider_override: Optional[str] = None,
) -> bool:
    """
    Production-grade Unified Email Delivery Engine.
    Implements:
      1. Automatic provider prioritization (Resend -> SMTP -> Simulation)
      2. Configurable timeout enforcement
      3. Automatic provider retry (2 attempts per provider)
      4. Auto-failover to SMTP if Resend fails
      5. Safe execution - logs errors but never crashes or rollbacks transactions
      6. Delivery metrics collection
    """
    start_time = time.time()
    text_body = verify_plain_text(text_body, reference_id)
    smtp_atts, resend_atts = normalize_attachments(attachments)

    resend_configured = bool(settings.RESEND_API_KEY and settings.RESEND_API_KEY.strip())
    smtp_configured = bool(settings.SMTP_HOST and settings.SMTP_HOST.strip())

    try_resend = settings.RESEND_ENABLED and resend_configured
    try_smtp = settings.SMTP_ENABLED and smtp_configured

    if provider_override:
        if provider_override.upper() == "RESEND":
            try_smtp = False
        elif provider_override.upper() == "SMTP":
            try_resend = False

    provider_selected = "SIMULATION"
    success = False

    # 1. Attempt Resend
    if try_resend:
        provider_selected = "RESEND"
        sender_info = get_sender_identity("RESEND")
        if reply_to:
            sender_info["reply_to"] = reply_to
        for attempt in range(1, 3):
            try:
                logger.info(
                    "Attempting email delivery via Resend (Attempt %d/2, Recipient: %s, Ref: %s)",
                    attempt, to_email, reference_id
                )
                await _send_via_resend_raw(to_email, subject, html_body, text_body, resend_atts, sender_info)
                success = True
                with METRICS_LOCK:
                    METRICS["resend_success"] += 1
                break
            except Exception as e:
                logger.error("Resend attempt %d failed due to error: %s", attempt, str(e), exc_info=True)
                with METRICS_LOCK:
                    METRICS["provider_errors"] += 1
                if "timeout" in str(e).lower() or isinstance(e, httpx.TimeoutException):
                    with METRICS_LOCK:
                        METRICS["timeout_count"] += 1
                if attempt == 2:
                    logger.error("Resend delivery failed completely. Triggering fallback failover.")
                    with METRICS_LOCK:
                        METRICS["fallback_count"] += 1

    # 2. Attempt SMTP
    if not success and try_smtp:
        if provider_selected == "RESEND":
            logger.info("Failing over to SMTP fallback for recipient: %s", to_email)
        provider_selected = "SMTP"
        sender_info = get_sender_identity("SMTP")
        if reply_to:
            sender_info["reply_to"] = reply_to
        for attempt in range(1, 3):
            try:
                logger.info(
                    "Attempting email delivery via SMTP (Attempt %d/2, Recipient: %s, Ref: %s)",
                    attempt, to_email, reference_id
                )
                import asyncio
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None, _send_via_smtp_raw, to_email, subject, html_body, text_body, smtp_atts, sender_info
                )
                success = True
                with METRICS_LOCK:
                    METRICS["smtp_success"] += 1
                break
            except Exception as e:
                logger.error("SMTP attempt %d failed due to error: %s", attempt, str(e), exc_info=True)
                with METRICS_LOCK:
                    METRICS["provider_errors"] += 1
                if "timeout" in str(e).lower() or "timed out" in str(e).lower():
                    with METRICS_LOCK:
                        METRICS["timeout_count"] += 1
                if attempt == 2:
                    logger.error("SMTP delivery failed completely for recipient: %s", to_email)

    # 3. Fall back to Simulation (Logs to console)
    if not success and not try_resend and not try_smtp:
        provider_selected = "SIMULATION"
        logger.warning(
            "[SIMULATION] Email to %s (Subject: %s, Ref: %s):\n%s",
            to_email, subject, reference_id, text_body
        )
        success = True

    duration = (time.time() - start_time) * 1000
    with METRICS_LOCK:
        if success:
            METRICS["emails_sent"] += 1
            METRICS["total_delivery_time_ms"] += duration
        else:
            METRICS["emails_failed"] += 1

    metrics_summary = get_email_metrics()
    logger.info(
        "Email Delivery Attempt Completed - Recipient: %s, Reference ID: %s, "
        "Provider: %s, Success: %s, Duration: %.2fms, Metrics: %s",
        to_email, reference_id or "N/A", provider_selected, success, duration, metrics_summary
    )

    return success

# Expose legacy implementations as compatibility wrappers
async def _send_via_resend(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str,
    attachments: Optional[List[dict]] = None,
) -> None:
    await send_email_unified(to_email, subject, html_body, text_body, attachments=attachments)

def _send_via_smtp(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str,
    attachments: Optional[List[dict]] = None,
) -> None:
    _run_async_in_sync(
        send_email_unified(to_email, subject, html_body, text_body, attachments=attachments)
    )

# ── Public API ────────────────────────────────────────────────────────────────

async def send_password_reset_email(to_email: str, reset_url: str) -> None:
    store_name = get_db_store_name()
    expires = settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
    subject = f"Reset your {store_name} password"
    html_body = _password_reset_html(reset_url, expires, store_name)
    text_body = _password_reset_text(reset_url, expires, store_name)
    reference_id = f"RST-{to_email}"

    await send_email_unified(
        to_email=to_email,
        subject=subject,
        html_body=html_body,
        text_body=text_body,
        reference_id=reference_id
    )


async def send_welcome_email(to_email: str, customer_name: str) -> None:
    branding = compile_email_branding()
    store_name = branding.get("store_name", "My Designers")
    subject = f"Welcome to {store_name}! 🎉"
    
    from app.shared.email.builder import build_welcome_email
    html_body, text_body = build_welcome_email(branding, customer_name)
    reference_id = f"WLC-{to_email}"
    
    await send_email_unified(
        to_email=to_email,
        subject=subject,
        html_body=html_body,
        text_body=text_body,
        reference_id=reference_id
    )


async def send_welcome_email_background(to_email: str, customer_name: str) -> None:
    try:
        await send_welcome_email(to_email, customer_name)
    except Exception as exc:
        logger.error(
            "Background Welcome Email Failed - Email: %s, Error: %s",
            to_email, str(exc), exc_info=True
        )

# ── Order Confirmation with Invoice Attachment ─────────────────────────────────

async def send_order_confirmation_with_invoice(
    order,
    db=None,
) -> None:
    to_email = getattr(order, "customer_email", None)
    if not to_email:
        logger.warning("send_order_confirmation_with_invoice: no customer_email on order — skipping.")
        return

    order_number = getattr(order, "order_number", "N/A")
    reference_id = f"ORD-{order_number}"
    branding = compile_email_branding(db=db)

    expected_del_date = getattr(order, "expected_delivery_date", None)
    if expected_del_date:
        if hasattr(expected_del_date, "strftime"):
            expected_delivery = expected_del_date.strftime("%B %d, %Y")
        else:
            expected_delivery = str(expected_del_date)
    else:
        ordered_date = getattr(order, "ordered_at", None)
        if ordered_date and hasattr(ordered_date, "strftime"):
            from datetime import timedelta
            expected_delivery = (ordered_date + timedelta(days=int(getattr(order, "delivery_days", 5) or 5))).strftime("%B %d, %Y")
        else:
            expected_delivery = "Standard (3-5 business days)"

    address_parts = []
    if getattr(order, "address_line1", None):
        address_parts.append(order.address_line1)
    if getattr(order, "address_line2", None):
        address_parts.append(order.address_line2)
    city_parts = []
    if getattr(order, "city", None):
        city_parts.append(order.city)
    if getattr(order, "state", None):
        city_parts.append(order.state)
    if getattr(order, "pincode", None):
        city_parts.append(order.pincode)
    if city_parts:
        address_parts.append(", ".join(city_parts))
    if getattr(order, "country", None):
        address_parts.append(order.country)

    shipping_addr_html = "<br/>".join(address_parts) if address_parts else "N/A"
    shipping_addr_text = "\n".join(address_parts) if address_parts else "N/A"

    price = float(getattr(order, "price", 0) or 0)
    qty = int(getattr(order, "quantity", 1) or 1)
    subtotal = price * qty
    shipping_fee = float(getattr(order, "shipping_fee", 0) or 0)
    total_amount = float(getattr(order, "total_amount", 0) or 0)

    variant_parts = []
    if getattr(order, "size", None):
        variant_parts.append(f"Size: {order.size}")
    if getattr(order, "color", None):
        variant_parts.append(f"Color: {order.color}")
    variant_str = ", ".join(variant_parts) if variant_parts else "N/A"

    order_data = {
        "order_number": order_number,
        "customer_name": getattr(order, "customer_name", "Valued Customer"),
        "payment_method": getattr(order, "payment_method", "COD"),
        "payment_status": getattr(order, "payment_status", "PENDING"),
        "expected_delivery": expected_delivery,
        "view_order_url": f"{settings.FRONTEND_URL}/orders/{getattr(order, 'id', 0)}",
        "price": price,
        "quantity": qty,
        "subtotal": subtotal,
        "shipping_fee": shipping_fee,
        "total_amount": total_amount,
        "product_name": getattr(order, "product_name", "Product"),
        "variant_str": variant_str,
        "shipping_addr_html": shipping_addr_html,
        "shipping_addr_text": shipping_addr_text,
    }

    pdf_bytes: Optional[bytes] = None
    pdf_filename = f"Invoice_{order_number}.pdf"
    try:
        from app.shared.invoice.service import generate_invoice_pdf, invoice_filename as _inv_fn
        pdf_bytes = generate_invoice_pdf(order, db=db)
        pdf_filename = _inv_fn(order)
    except Exception as pdf_exc:
        logger.error(
            "Failed to generate invoice PDF for order %s: %s",
            order_number, pdf_exc, exc_info=True,
        )

    from app.shared.email.builder import build_order_confirmation
    subject = f"Your Order #{order_number} is Confirmed 🎉"
    html_body, text_body = build_order_confirmation(
        branding=branding,
        order_data=order_data,
        reference_id=reference_id
    )

    attachments = [{"filename": pdf_filename, "content": pdf_bytes}] if pdf_bytes else None

    await send_email_unified(
        to_email=to_email,
        subject=subject,
        html_body=html_body,
        text_body=text_body,
        attachments=attachments,
        reference_id=reference_id
    )

async def send_order_confirmation_with_invoice_background(order_id: int) -> None:
    from app.core.database import SessionLocal
    from app.modules.orders.models import Order
    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if order:
            await send_order_confirmation_with_invoice(order, db=db)
        else:
            logger.error(
                "Background Order Confirmation Failed - Order ID %d not found in database.",
                order_id
            )
    except Exception as exc:
        logger.error(
            "Background Order Confirmation Failed - Order ID: %d, Error: %s",
            order_id, str(exc), exc_info=True
        )
    finally:
        db.close()

# ── Health, Verification & Startup Diagnostics ─────────────────────────────────

def test_email_providers() -> dict:
    """
    Diagnoses and runs safe test checks against configured email providers.
    Validates API authentication and server handshakes without sending customer emails.
    """
    resend_ok = False
    resend_error = None
    if settings.RESEND_API_KEY and settings.RESEND_API_KEY.strip():
        try:
            resp = httpx.get(
                "https://api.resend.com/domains",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                timeout=5
            )
            if resp.status_code == 200:
                resend_ok = True
            else:
                resend_error = f"API returned status {resp.status_code}: {resp.text}"
        except Exception as e:
            resend_error = str(e)

    smtp_ok = False
    smtp_error = None
    if settings.SMTP_HOST and settings.SMTP_HOST.strip():
        try:
            smtp_cls = smtplib.SMTP_SSL if settings.SMTP_SSL else smtplib.SMTP
            timeout = settings.SMTP_TIMEOUT or 15
            with smtp_cls(settings.SMTP_HOST, settings.SMTP_PORT, timeout=timeout) as server:
                if settings.SMTP_TLS and not settings.SMTP_SSL:
                    server.starttls()
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                smtp_ok = True
        except Exception as e:
            smtp_error = str(e)

    return {
        "resend": {"configured": bool(settings.RESEND_API_KEY), "enabled": settings.RESEND_ENABLED, "authenticated": resend_ok, "error": resend_error},
        "smtp": {"configured": bool(settings.SMTP_HOST), "enabled": settings.SMTP_ENABLED, "authenticated": smtp_ok, "error": smtp_error}
    }

def validate_email_configuration_at_startup() -> None:
    """
    Validates email provider settings statically and outputs status logs.
    Never blocks application launch or exposes credentials.
    """
    resend_configured = bool(settings.RESEND_API_KEY and settings.RESEND_API_KEY.strip())
    smtp_configured = bool(settings.SMTP_HOST and settings.SMTP_HOST.strip())

    resend_status = "✓ Resend configured" if resend_configured else "⚠ Resend NOT configured (missing API Key)"
    if not settings.RESEND_ENABLED:
        resend_status += " (Disabled in settings)"

    smtp_status = "✓ SMTP configured" if smtp_configured else "⚠ SMTP NOT configured (missing host)"
    if not settings.SMTP_ENABLED:
        smtp_status += " (Disabled in settings)"

    primary = "Simulation Only"
    fallback = "None"

    if settings.RESEND_ENABLED and resend_configured:
        primary = "Resend"
        if settings.SMTP_ENABLED and smtp_configured:
            fallback = "SMTP"
    elif settings.SMTP_ENABLED and smtp_configured:
        primary = "SMTP"

    logger.info("=========================================")
    logger.info("  EMAIL SERVICE CONFIGURATION AUDIT      ")
    logger.info("=========================================")
    logger.info(resend_status)
    logger.info(smtp_status)
    logger.info(f"✓ Primary Provider: {primary}")
    logger.info(f"✓ Fallback Provider: {fallback}")
    logger.info("=========================================")


