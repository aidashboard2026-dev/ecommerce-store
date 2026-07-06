"""
app/modules/contact/router.py

API endpoints for contact message management.
Handles customer submissions, admin operations, and message replies.
"""

import json
import threading
import time
import urllib.parse
import urllib.request
import io
import csv
import re
import html
from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException, Request
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.modules.admins.models import Admin
from app.modules.auth.dependencies import get_current_admin
from app.modules.contact import service as contact_service
from app.modules.contact.schemas import (
    ContactMessageCreate,
    ContactMessageResponse,
    ContactMessageListResponse,
    ContactMessageDetailResponse,
    ContactMessageReply,
    ContactMessageUpdate,
)
from app.shared.exceptions.base import RateLimitError

router = APIRouter()

_RATE_LOCK = threading.Lock()
_contact_attempts: dict[str, list[float]] = defaultdict(list)
_CONTACT_WINDOW_SECONDS = 3600
_CONTACT_MAX_ATTEMPTS = 8


def _cleanup_attempts(ip: str) -> None:
    now = time.monotonic()
    with _RATE_LOCK:
        _contact_attempts[ip] = [t for t in _contact_attempts[ip] if now - t < _CONTACT_WINDOW_SECONDS]


def _check_contact_rate_limit(ip: str) -> None:
    _cleanup_attempts(ip)
    if len(_contact_attempts[ip]) >= _CONTACT_MAX_ATTEMPTS:
        raise RateLimitError(
            "Too many contact form submissions from this IP. Please wait and try again later."
        )


def _record_contact_attempt(ip: str) -> None:
    with _RATE_LOCK:
        _contact_attempts[ip].append(time.monotonic())


def _verify_recaptcha(token: Optional[str]) -> None:
    if not settings.RECAPTCHA_SECRET_KEY:
        return

    if not token:
        raise HTTPException(status_code=400, detail="reCAPTCHA verification required.")

    body = urllib.parse.urlencode({
        "secret": settings.RECAPTCHA_SECRET_KEY,
        "response": token,
    }).encode()
    request = urllib.request.Request(
        "https://www.google.com/recaptcha/api/siteverify",
        data=body,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode())
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to verify reCAPTCHA at this time. Please try again later.",
        ) from exc

    if not payload.get("success"):
        raise HTTPException(status_code=400, detail="reCAPTCHA verification failed.")

    score = payload.get("score", 0)
    if score < settings.RECAPTCHA_MIN_SCORE:
        raise HTTPException(status_code=400, detail="reCAPTCHA verification score too low.")


def _strip_html(text: str) -> str:
    if not text:
        return ""
    clean = re.sub(r'<[^>]*>', '', text)
    return html.unescape(clean)


# ── Public Endpoints (Storefront) ────────────────────────────────────────────

@router.post("", response_model=dict)
def create_contact_message(
    request: Request,
    data: ContactMessageCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new contact message from the public contact form.

    Automatically:
    - Saves message to database
    - Sends email notification to admin
    - Sends thank-you email to customer

    Args:
        data: Contact message data
        db: Database session

    Returns:
        Success response
    """
    ip = request.client.host if request.client else "unknown"
    _check_contact_rate_limit(ip)

    if data.website:
        raise HTTPException(status_code=400, detail="Spam detected.")

    _verify_recaptcha(data.recaptcha_token)

    # Sanitize input to prevent XSS
    data.name = _strip_html(data.name)
    data.subject = _strip_html(data.subject)
    data.message = _strip_html(data.message)

    try:
        response = contact_service.ContactService.create_contact_message(db, data)
        _record_contact_attempt(ip)
        return {
            "success": True,
            "message": "Your message has been received successfully.",
            "data": response,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating contact message: {str(e)}")


# ── Admin Endpoints ──────────────────────────────────────────────────────────────

@router.get("/admin/list", response_model=ContactMessageListResponse)
def list_contact_messages(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    Get paginated list of contact messages with filtering and sorting.

    Query parameters:
    - skip: Number of records to skip (pagination)
    - limit: Records per page (default 20, max 100)
    - search: Search in name, email, or subject
    - status: Filter by status (New, Pending, Replied, Closed)
    - sort_by: Field to sort by (created_at, status, name, email)
    - sort_order: Sort order (asc or desc)

    Returns:
        Paginated list of contact messages
    """
    return contact_service.ContactService.list_contact_messages(
        db=db,
        skip=skip,
        limit=limit,
        search=search,
        status=status,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/admin/stats", response_model=dict)
def get_contact_stats(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Get contact inbox statistics for admin dashboards."""
    return contact_service.ContactService.get_stats(db)


@router.get("/admin/{message_id}", response_model=ContactMessageDetailResponse)
def get_contact_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    Get detailed information about a specific contact message.

    Args:
        message_id: ID of the contact message
        db: Database session
        current_admin: Authenticated admin user

    Returns:
        ContactMessageDetailResponse with full message details
    """
    message = contact_service.ContactService.get_contact_message(db, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Contact message not found")
    return message


@router.put("/admin/{message_id}/status", response_model=ContactMessageResponse)
def update_contact_status(
    message_id: int,
    status_update: ContactMessageUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    Update the status of a contact message.

    Status values:
    - New: New incoming message
    - Pending: Under review
    - Replied: Admin has replied
    - Closed: Ticket closed

    Args:
        message_id: ID of the contact message
        status_update: New status
        db: Database session
        current_admin: Authenticated admin user

    Returns:
        Updated ContactMessageResponse
    """
    message = contact_service.ContactService.update_contact_status(
        db,
        message_id,
        status_update.status,
    )
    if not message:
        raise HTTPException(status_code=404, detail="Contact message not found")
    return message


@router.post("/admin/{message_id}/reply", response_model=ContactMessageResponse)
def send_reply(
    message_id: int,
    reply_data: ContactMessageReply,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    Send a reply to a contact message.

    Automatically:
    - Saves reply to database
    - Updates status to "Replied"
    - Sets replied_at timestamp
    - Sends email reply to customer

    Args:
        message_id: ID of the contact message to reply to
        reply_data: Reply message content
        db: Database session
        current_admin: Authenticated admin user

    Returns:
        Updated ContactMessageResponse with reply
    """
    message = contact_service.ContactService.send_reply(
        db,
        message_id,
        reply_data.reply_message,
        admin_id=current_admin.id,
    )
    if not message:
        raise HTTPException(status_code=404, detail="Contact message not found")
    return message


@router.delete("/admin/{message_id}")
def delete_contact_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    Delete a contact message.

    Args:
        message_id: ID of the contact message to delete
        db: Database session
        current_admin: Authenticated admin user

    Returns:
        Success response
    """
    success = contact_service.ContactService.delete_contact_message(db, message_id)
    if not success:
        raise HTTPException(status_code=404, detail="Contact message not found")
    return {"success": True, "message": "Contact message deleted successfully"}


# ── Clean, Direct Endpoints (Without /admin prefix) ───────────────────────────

@router.get("/export")
@router.get("/admin/export")
def export_contact_messages(
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """
    Export contact messages as CSV or Excel (.xlsx) file.
    """
    messages = contact_service.ContactService.get_all_matching_messages(
        db=db,
        search=search,
        status=status,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    if format == "xlsx":
        wb = Workbook()
        ws = wb.active
        ws.title = "Contact Messages"
        
        # Headers
        headers = ["ID", "Name", "Email", "Subject", "Message", "Status", "Created At", "Replied At", "Admin Reply"]
        ws.append(headers)
        
        for msg in messages:
            ws.append([
                msg.id,
                msg.name,
                msg.email,
                msg.subject,
                msg.message,
                msg.status,
                msg.created_at.strftime("%Y-%m-%d %H:%M:%S") if msg.created_at else "",
                msg.replied_at.strftime("%Y-%m-%d %H:%M:%S") if msg.replied_at else "",
                msg.admin_reply or ""
            ])
            
        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=contact_messages.xlsx"}
        )
    else:
        # CSV format
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        
        # Headers
        writer.writerow(["ID", "Name", "Email", "Subject", "Message", "Status", "Created At", "Replied At", "Admin Reply"])
        
        for msg in messages:
            writer.writerow([
                msg.id,
                msg.name,
                msg.email,
                msg.subject,
                msg.message,
                msg.status,
                msg.created_at.strftime("%Y-%m-%d %H:%M:%S") if msg.created_at else "",
                msg.replied_at.strftime("%Y-%m-%d %H:%M:%S") if msg.replied_at else "",
                msg.admin_reply or ""
            ])
            
        output = io.BytesIO(buffer.getvalue().encode("utf-8"))
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=contact_messages.csv"}
        )


@router.get("", response_model=ContactMessageListResponse)
def list_contact_messages_new(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Get paginated list of contact messages (direct GET /api/v1/contact)."""
    return list_contact_messages(
        skip=skip,
        limit=limit,
        search=search,
        status=status,
        sort_by=sort_by,
        sort_order=sort_order,
        db=db,
        current_admin=current_admin,
    )


@router.get("/{message_id}", response_model=ContactMessageDetailResponse)
def get_contact_message_new(
    message_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Get detailed contact message (direct GET /api/v1/contact/{id})."""
    return get_contact_message(message_id=message_id, db=db, current_admin=current_admin)


@router.put("/{message_id}", response_model=ContactMessageResponse)
def update_contact_status_new(
    message_id: int,
    status_update: ContactMessageUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Update contact message status (direct PUT /api/v1/contact/{id})."""
    return update_contact_status(
        message_id=message_id,
        status_update=status_update,
        db=db,
        current_admin=current_admin,
    )


@router.post("/{message_id}/reply", response_model=ContactMessageResponse)
def send_reply_new(
    message_id: int,
    reply_data: ContactMessageReply,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Send reply to customer (direct POST /api/v1/contact/{id}/reply)."""
    return send_reply(
        message_id=message_id,
        reply_data=reply_data,
        db=db,
        current_admin=current_admin,
    )


@router.delete("/{message_id}")
def delete_contact_message_new(
    message_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    """Delete a contact message (direct DELETE /api/v1/contact/{id})."""
    return delete_contact_message(message_id=message_id, db=db, current_admin=current_admin)