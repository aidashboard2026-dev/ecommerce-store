"""
app/modules/contact/email_service.py

Email service for contact messages with professional HTML templates.
Handles sending emails to admin and automatic customer replies.
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from typing import Optional


# ── SMTP Configuration ───────────────────────────────────────────────────────

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL")
STORE_NAME = os.getenv("STORE_NAME", "My Designers")
STORE_LOGO_URL = os.getenv("STORE_LOGO_URL", "")

print("SMTP_HOST:", SMTP_HOST)
print("SMTP_PORT:", SMTP_PORT)
print("SMTP_EMAIL:", SMTP_EMAIL)
print("SUPPORT_EMAIL:", SUPPORT_EMAIL)
print("SMTP_PASSWORD:", "Loaded" if SMTP_PASSWORD else "Missing")


# ── Email Templates ─────────────────────────────────────────────────────────

def get_admin_email_html(
    customer_name: str,
    customer_email: str,
    subject: str,
    message: str,
    submitted_at: datetime,
) -> str:
    """Generate professional HTML email template for admin notification."""

    submitted_date = submitted_at.strftime("%B %d, %Y")
    submitted_time = submitted_at.strftime("%I:%M %p")

    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Form Submission</title>
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background-color: #f5f7fa;
                line-height: 1.6;
                color: #333;
            }}
            
            .container {{
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                overflow: hidden;
            }}
            
            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 30px;
                text-align: center;
                color: #ffffff;
            }}
            
            .header h1 {{
                font-size: 24px;
                margin-bottom: 10px;
                font-weight: 600;
            }}
            
            .header p {{
                font-size: 14px;
                opacity: 0.9;
            }}
            
            .content {{
                padding: 30px;
            }}
            
            .greeting {{
                font-size: 16px;
                margin-bottom: 20px;
                color: #333;
            }}
            
            .info-section {{
                background-color: #f8fafc;
                border-left: 4px solid #667eea;
                padding: 15px;
                margin-bottom: 20px;
                border-radius: 4px;
            }}
            
            .info-label {{
                font-weight: 600;
                color: #667eea;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 5px;
            }}
            
            .info-value {{
                color: #333;
                font-size: 14px;
                word-break: break-word;
            }}
            
            .message-box {{
                background-color: #fafbfc;
                border: 1px solid #e2e8f0;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }}
            
            .message-label {{
                font-weight: 600;
                color: #333;
                margin-bottom: 10px;
                font-size: 14px;
            }}
            
            .message-content {{
                color: #555;
                font-size: 14px;
                line-height: 1.8;
                white-space: pre-wrap;
                word-break: break-word;
            }}
            
            .meta-info {{
                background-color: #f0f4f8;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                font-size: 13px;
                color: #666;
            }}
            
            .footer {{
                background-color: #f8fafc;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #888;
                border-top: 1px solid #e2e8f0;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📧 New Contact Form Submission</h1>
                <p>You've received a new message from your website</p>
            </div>
            
            <div class="content">
                <p class="greeting">Hello Admin,</p>
                
                <p style="margin-bottom: 20px; color: #555;">A new contact form submission has been received.</p>
                
                <div class="info-section">
                    <div class="info-label">👤 From</div>
                    <div class="info-value">{customer_name} &lt;{customer_email}&gt;</div>
                </div>
                
                <div class="info-section">
                    <div class="info-label">📌 Subject</div>
                    <div class="info-value">{subject}</div>
                </div>
                
                <div class="message-box">
                    <div class="message-label">💬 Message</div>
                    <div class="message-content">{message}</div>
                </div>
                
                <div class="meta-info">
                    <div><strong>📅 Submitted:</strong> {submitted_date} at {submitted_time}</div>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>{STORE_NAME}</strong> - Support Dashboard</p>
                <p>&copy; {datetime.now().year} {STORE_NAME}. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """


def get_customer_reply_html(customer_name: str) -> str:
    """Generate professional HTML email template for customer auto-reply."""
    current_year = datetime.now().year

    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thank You for Contacting {STORE_NAME}</title>
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background-color: #f5f7fa;
                line-height: 1.6;
                color: #333;
            }}
            
            .container {{
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                overflow: hidden;
            }}
            
            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 30px;
                text-align: center;
                color: #ffffff;
            }}
            
            .content {{
                padding: 30px;
            }}
            
            .greeting {{
                font-size: 18px;
                color: #333;
                margin-bottom: 15px;
                font-weight: 600;
            }}
            
            .message {{
                line-height: 1.8;
                color: #555;
                margin-bottom: 20px;
                font-size: 14px;
            }}
            
            .highlight-box {{
                background-color: #f0f4f8;
                border-left: 4px solid #667eea;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }}
            
            .footer {{
                background-color: #f8fafc;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #888;
                border-top: 1px solid #e2e8f0;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Thank You!</h1>
                <p>We've received your message</p>
            </div>
            
            <div class="content">
                <p class="greeting">Hello {customer_name},</p>
                
                <p class="message">
                    Thank you for contacting <strong>{STORE_NAME}</strong>.
                </p>
                
                <p class="message">
                    We have received your message successfully. Your inquiry is important to us.
                </p>
                
                <div class="highlight-box">
                    <p><strong>⏱️ What's Next?</strong></p>
                    <p>Our dedicated support team will review your request and respond within <strong>24 hours</strong>.</p>
                </div>
                
                <p class="message">
                    In the meantime, if you have any additional information, please feel free to reach out.
                </p>
                
                <p style="margin-top: 30px; color: #555;">
                    Best regards,<br>
                    <strong>{STORE_NAME} Support Team</strong>
                </p>
            </div>
            
            <div class="footer">
                <p>&copy; {current_year} {STORE_NAME}. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """


def get_admin_reply_html(customer_name: str, subject: str, reply_message: str) -> str:
    """Generate professional HTML email template for admin reply to customer."""
    current_year = datetime.now().year

    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reply from {STORE_NAME}</title>
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background-color: #f5f7fa;
                line-height: 1.6;
                color: #333;
            }}
            
            .container {{
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                overflow: hidden;
            }}
            
            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 30px;
                text-align: center;
                color: #ffffff;
            }}
            
            .content {{
                padding: 30px;
            }}
            
            .greeting {{
                font-size: 18px;
                color: #333;
                margin-bottom: 15px;
                font-weight: 600;
            }}
            
            .subject-box {{
                background-color: #f0f4f8;
                border-left: 4px solid #667eea;
                padding: 15px;
                margin-bottom: 20px;
                border-radius: 4px;
            }}
            
            .reply-box {{
                background-color: #fafbfc;
                border: 1px solid #e2e8f0;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }}
            
            .message {{
                line-height: 1.8;
                color: #555;
                margin-bottom: 20px;
                font-size: 14px;
                white-space: pre-wrap;
                word-break: break-word;
            }}
            
            .footer {{
                background-color: #f8fafc;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #888;
                border-top: 1px solid #e2e8f0;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>💌 We've Replied to Your Message</h1>
                <p>Response from {STORE_NAME}</p>
            </div>
            
            <div class="content">
                <p class="greeting">Hello {customer_name},</p>
                
                <p style="margin-bottom: 20px; color: #555; font-size: 14px;">
                    Our team has reviewed your inquiry and has provided a response:
                </p>
                
                <div class="subject-box">
                    <strong>📌 Subject:</strong> {subject}
                </div>
                
                <div class="reply-box">
                    <div style="font-weight: 600; margin-bottom: 10px;">💬 Response:</div>
                    <div class="message">{reply_message}</div>
                </div>
                
                <p style="margin-top: 30px; color: #555;">
                    Thank you for your continued support.<br>
                    <strong>{STORE_NAME} Support Team</strong>
                </p>
            </div>
            
            <div class="footer">
                <p>&copy; {current_year} {STORE_NAME}. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """


# ── Email Sending Functions ──────────────────────────────────────────────────

def send_admin_notification(
    customer_name: str,
    customer_email: str,
    subject: str,
    message: str,
    submitted_at: datetime,
) -> bool:
    """Send HTML email notification to admin about new contact message."""
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = SMTP_EMAIL
        msg["To"] = SUPPORT_EMAIL
        msg["Subject"] = f"[{STORE_NAME}] New Contact: {subject}"

        html_content = get_admin_email_html(
            customer_name,
            customer_email,
            subject,
            message,
            submitted_at,
        )

        msg.attach(MIMEText(html_content, "html"))

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.sendmail(SMTP_EMAIL, SUPPORT_EMAIL, msg.as_string())
        server.quit()

        return True

    except Exception as e:
        print(f"Error sending admin notification: {e}")
        return False


def send_customer_auto_reply(customer_name: str, customer_email: str) -> bool:
    """Send automatic thank-you email to customer."""
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = SMTP_EMAIL
        msg["To"] = customer_email
        msg["Subject"] = f"Thank you for contacting {STORE_NAME}"

        html_content = get_customer_reply_html(customer_name)
        msg.attach(MIMEText(html_content, "html"))

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.sendmail(SMTP_EMAIL, customer_email, msg.as_string())
        server.quit()

        return True

    except Exception as e:
        print(f"Error sending customer auto-reply: {e}")
        return False


def send_admin_reply_to_customer(
    customer_name: str,
    customer_email: str,
    subject: str,
    reply_message: str,
) -> bool:
    """Send admin reply email to customer."""
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = SMTP_EMAIL
        msg["To"] = customer_email
        msg["Subject"] = f"Re: {subject}"

        html_content = get_admin_reply_html(
            customer_name,
            subject,
            reply_message,
        )
        msg.attach(MIMEText(html_content, "html"))

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.sendmail(SMTP_EMAIL, customer_email, msg.as_string())
        server.quit()

        return True

    except Exception as e:
        print(f"Error sending admin reply: {e}")
        return False


# ── Legacy function for backward compatibility ────────────────────────────────

def send_contact_email(name: str, email: str, subject: str, message: str) -> bool:
    """Legacy function - calls the new separate email functions."""
    from datetime import datetime, timezone

    submitted_at = datetime.now(timezone.utc)

    admin_ok = send_admin_notification(name, email, subject, message, submitted_at)
    customer_ok = send_customer_auto_reply(name, email)

    return admin_ok and customer_ok
