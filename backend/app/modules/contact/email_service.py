import os
import smtplib

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL")


def send_contact_email(name, email, subject, message):
    msg = MIMEMultipart()

    msg["From"] = SMTP_EMAIL
    msg["To"] = SUPPORT_EMAIL
    msg["Subject"] = f"Contact Form - {subject}"

    body = f"""
New Contact Form Submission

Name: {name}

Email: {email}

Subject: {subject}

Message:

{message}
"""

    msg.attach(MIMEText(body, "plain"))

    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)

    server.starttls()

    server.login(
        SMTP_EMAIL,
        SMTP_PASSWORD,
    )

    server.sendmail(
        SMTP_EMAIL,
        SUPPORT_EMAIL,
        msg.as_string(),
    )

    server.quit()