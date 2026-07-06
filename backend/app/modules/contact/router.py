from fastapi import APIRouter

from app.modules.contact.email_service import send_contact_email
from app.modules.contact.contact import ContactRequest

router = APIRouter()


@router.post("/contact")
def contact(data: ContactRequest):

    send_contact_email(
        data.name,
        data.email,
        data.subject,
        data.message,
    )

    return {
        "success": True,
        "message": "Email sent successfully.",
    }