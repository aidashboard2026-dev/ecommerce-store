"""
Email service for AuraStore.

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
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


# ── HTML email templates ───────────────────────────────────────────────────────

def _password_reset_html(reset_url: str, expires_minutes: int) -> str:
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
                AuraStore
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
                We received a request to reset the password for your AuraStore account.
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
                © 2026 AuraStore. All rights reserved.
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


def _password_reset_text(reset_url: str, expires_minutes: int) -> str:
    return (
        f"Reset your AuraStore password\n\n"
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
) -> None:
    """Send email using the Resend API (https://resend.com)."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>",
                "to": [to_email],
                "subject": subject,
                "html": html_body,
                "text": text_body,
            },
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
) -> None:
    """Send email via SMTP (blocking — run in a thread if needed)."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to_email

    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

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
    expires = settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
    subject = "Reset your AuraStore password"
    html_body = _password_reset_html(reset_url, expires)
    text_body = _password_reset_text(reset_url, expires)

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
