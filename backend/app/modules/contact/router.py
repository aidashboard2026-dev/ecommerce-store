from fastapi import APIRouter

from app.schemas.contact import ContactRequest
from app.services.email_service import send_contact_email

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