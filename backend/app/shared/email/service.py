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
from typing import Optional, List

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


# ── HTML email templates ───────────────────────────────────────────────────────

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


# ── Provider implementations ───────────────────────────────────────────────────

async def _send_via_resend(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str,
    attachments: Optional[List[dict]] = None,
) -> None:
    """Send email using the Resend API (https://resend.com).

    attachments: list of {"filename": str, "content": base64_str, "type": mime_type}
    """
    payload: dict = {
        "from": f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>",
        "to": [to_email],
        "subject": subject,
        "html": html_body,
        "text": text_body,
    }
    if attachments:
        payload["attachments"] = attachments

    async with httpx.AsyncClient(timeout=15) as client:
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
    logger.info("Email sent via Resend to %s (subject: %s)", to_email, subject)


def _send_via_smtp(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str,
    attachments: Optional[List[dict]] = None,
) -> None:
    """Send email via SMTP (blocking — run in a thread if needed).

    attachments: list of {"filename": str, "content": bytes, "type": mime_type}
    """
    msg = MIMEMultipart("mixed")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to_email

    # Alternative part (text + HTML)
    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(text_body, "plain", "utf-8"))
    alt.attach(MIMEText(html_body, "html", "utf-8"))
    msg.attach(alt)

    # Attachments
    for att in (attachments or []):
        part = MIMEApplication(att["content"], _subtype="pdf")
        part.add_header("Content-Disposition", "attachment", filename=att["filename"])
        msg.attach(part)

    smtp_cls = smtplib.SMTP_SSL if not settings.SMTP_TLS else smtplib.SMTP
    with smtp_cls(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        if settings.SMTP_TLS:
            server.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM_EMAIL, to_email, msg.as_string())

    logger.info("Email sent via SMTP to %s (subject: %s)", to_email, subject)


# ── Public API ────────────────────────────────────────────────────────────────

async def send_password_reset_email(to_email: str, reset_url: str) -> None:
    """
    Send a password-reset email to the customer.

    Automatically selects the configured provider:
      - RESEND_API_KEY set → Resend
      - SMTP_HOST set     → SMTP
      - Neither           → logs to console only (dev mode)

    Errors from the mail provider are logged but not re-raised — a failed
    email must never cause the HTTP endpoint to return 500, to avoid leaking
    whether an email address is registered (SEC-08 mitigation).
    """
    store_name = get_db_store_name()
    expires = settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
    subject = f"Reset your {store_name} password"
    html_body = _password_reset_html(reset_url, expires, store_name)
    text_body = _password_reset_text(reset_url, expires, store_name)

    try:
        if settings.RESEND_API_KEY:
            await _send_via_resend(to_email, subject, html_body, text_body)
        elif settings.SMTP_HOST:
            import asyncio
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None, _send_via_smtp, to_email, subject, html_body, text_body
            )
        else:
            # No provider configured — log for local dev
            logger.warning(
                "No email provider configured. Password-reset URL for %s:\n%s",
                to_email,
                reset_url,
            )
    except Exception as exc:
        # Log the error but don't propagate — see docstring.
        logger.error(
            "Failed to send password-reset email to %s: %s",
            to_email,
            exc,
            exc_info=True,
        )


# ── Order Confirmation with Invoice Attachment ─────────────────────────────────

async def send_order_confirmation_with_invoice(
    order,
    db=None,
) -> None:
    """
    Send an order confirmation email with the invoice PDF attached.

    This function is the SINGLE call site for the confirmation+invoice flow.
    It uses generate_invoice_pdf() (app.shared.invoice.service) — the same
    generator used by the Admin download endpoint and the Customer download
    endpoint. One generator, three paths.

    Args:
        order:  An OrderResponse Pydantic model OR an Order ORM object.
        db:     Optional SQLAlchemy Session for dynamic store branding.

    Error policy:
        A failed email/attachment must NEVER cause the order creation to fail.
        All exceptions are caught, logged, and swallowed.
    """
    to_email = getattr(order, "customer_email", None)
    if not to_email:
        logger.warning("send_order_confirmation_with_invoice: no customer_email on order — skipping.")
        return

    order_number   = getattr(order, "order_number", "N/A")
    customer_name  = (getattr(order, "customer_name", None) or "Valued Customer").split()[0]
    store_name     = get_db_store_name()
    payment_method = getattr(order, "payment_method", "")

    # ── Generate the invoice PDF bytes ────────────────────────────────────────
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



    # ── Build email body ──────────────────────────────────────────────────────
    is_online = payment_method.upper() not in ("COD", "CASH ON DELIVERY", "CASH_ON_DELIVERY")
    payment_note = (
        "Your payment has been confirmed."
        if is_online else
        "Payment will be collected on delivery."
    )

    subject = f"Your Order #{order_number} is Confirmed 🎉"

    html_body = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order Confirmed</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background-color:#f9fafb;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05),0 2px 4px -1px rgba(0,0,0,0.03);">

        <!-- Body content -->
        <tr>
          <td style="padding:48px 40px;">
            <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Hi {customer_name},</h2>
            <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;">
              Thank you for shopping with <strong>{store_name}</strong>.<br/>
              We're happy to let you know that your order has been confirmed successfully.
            </p>

            <!-- Order info card -->
            <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:12px;">
                    <p style="margin:0;color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Order ID</p>
                    <p style="margin:4px 0 0;color:#111827;font-size:15px;font-weight:700;font-family:monospace;">{order_number}</p>
                  </td>
                </tr>
                <tr>
                  <td style="border-top:1px solid #f3f4f6;padding-top:12px;">
                    <p style="margin:0;color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Payment Details</p>
                    <p style="margin:4px 0 0;color:#111827;font-size:14px;line-height:1.5;">{payment_method} — {payment_note}</p>
                  </td>
                </tr>
              </table>
            </div>

            <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;">
              Your invoice is attached with this email for your reference.<br/>
              You can also download it anytime from your account.
            </p>

            <p style="margin:0 0 32px;color:#4b5563;font-size:15px;line-height:1.6;">
              If you have any questions, our support team is always happy to help.
            </p>

            <p style="margin:0;color:#4b5563;font-size:15px;line-height:1.6;">
              Thank you for choosing {store_name}.
            </p>
            
            <p style="margin:24px 0 0;color:#111827;font-size:15px;font-weight:700;line-height:1.6;">
              Regards,<br/>
              <span style="color:#6b7280;font-weight:500;">{store_name} Team</span>
            </p>

            <!-- Divider -->
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 24px;" />

            <!-- Support Details -->
            <table width="100%" cellpadding="0" cellspacing="0" style="color:#9ca3af;font-size:13px;line-height:1.5;">
              <tr>
                <td>
                  <strong>Website:</strong> <a href="https://{store_url}" style="color:#6b7280;text-decoration:none;">{store_url}</a><br/>
                  <strong>Support:</strong> <a href="mailto:{support_email}" style="color:#6b7280;text-decoration:none;">{support_email}</a><br/>
                  <strong>Phone:</strong> <span style="color:#6b7280;">{support_phone}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer Bar -->
        <tr>
          <td style="padding:24px 40px;background:#fafafa;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 {store_name}. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
"""
    text_body = (
        f"Hi {customer_name},\n\n"
        f"Thank you for shopping with {store_name}.\n\n"
        f"We're happy to let you know that your order has been confirmed successfully.\n\n"
        f"Your invoice is attached with this email for your reference.\n"
        f"You can also download it anytime from your account.\n\n"
        f"If you have any questions, our support team is always happy to help.\n\n"
        f"Thank you for choosing {store_name}.\n\n"
        f"Regards,\n"
        f"{store_name} Team\n\n"
        f"Website: {store_url}\n"
        f"Support: {support_email}\n"
        f"Phone: {support_phone}"
    )


    # ── Build attachment list ─────────────────────────────────────────────────
    smtp_attachments: list = []
    resend_attachments: list = []

    if pdf_bytes:
        smtp_attachments  = [{"filename": pdf_filename, "content": pdf_bytes}]
        import base64
        resend_attachments = [{
            "filename": pdf_filename,
            "content":  base64.b64encode(pdf_bytes).decode("utf-8"),
        }]

    # ── Send ──────────────────────────────────────────────────────────────────
    try:
        if settings.RESEND_API_KEY:
            await _send_via_resend(
                to_email, subject, html_body, text_body,
                attachments=resend_attachments or None,
            )
        elif settings.SMTP_HOST:
            import asyncio
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: _send_via_smtp(
                    to_email, subject, html_body, text_body,
                    attachments=smtp_attachments or None,
                ),
            )
        else:
            logger.warning(
                "[SIMULATION] Order confirmation for %s (Order: %s). "
                "Invoice attachment: %s",
                to_email, order_number,
                pdf_filename if pdf_bytes else "NOT GENERATED",
            )
    except Exception as exc:
        logger.error(
            "Failed to send order confirmation with invoice for order %s to %s: %s",
            order_number, to_email, exc, exc_info=True,
        )

