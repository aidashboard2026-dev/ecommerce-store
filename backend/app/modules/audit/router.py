"""
app/modules/audit/router.py

Admin-only audit log query API.

Endpoints:
    GET /api/v1/audit/                  — paginated list with filters
    GET /api/v1/audit/{log_id}          — single entry
    GET /api/v1/audit/resource/{type}/{id}  — all changes to a specific resource
"""

import math
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.admins.models import Admin
from app.modules.auth.dependencies import get_current_admin, get_current_superadmin
from app.modules.audit.models import AuditLog, AuditStatus
from app.modules.audit.schemas import AuditLogListResponse, AuditLogResponse
from app.shared.exceptions import NotFoundError

router = APIRouter()


@router.get("/", response_model=AuditLogListResponse)
def list_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    action: Optional[str] = Query(None, description="Filter by action, e.g. 'product.created'"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type, e.g. 'product'"),
    resource_id: Optional[int] = Query(None, description="Filter by resource primary key"),
    admin_id: Optional[int] = Query(None, description="Filter by admin who performed the action"),
    status: Optional[AuditStatus] = Query(None, description="Filter by outcome: success | failure"),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_superadmin),   # Superadmin only
):
    """
    Paginated audit log query — superadmin only.
    Supports filtering by action, resource type, resource ID, admin, and status.
    Results are ordered newest first.
    """
    q = db.query(AuditLog)

    if action:
        q = q.filter(AuditLog.action.ilike(f"%{action}%"))
    if resource_type:
        q = q.filter(AuditLog.resource_type == resource_type)
    if resource_id is not None:
        q = q.filter(AuditLog.resource_id == resource_id)
    if admin_id is not None:
        q = q.filter(AuditLog.admin_id == admin_id)
    if status is not None:
        q = q.filter(AuditLog.status == status)

    total = q.count()
    items = (
        q.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return AuditLogListResponse(
        items=[AuditLogResponse.model_validate(e) for e in items],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=math.ceil(total / per_page) if total else 1,
    )


@router.get("/resource/{resource_type}/{resource_id}", response_model=AuditLogListResponse)
def get_resource_audit_trail(
    resource_type: str,
    resource_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """
    Return the full audit trail for a specific resource.
    Useful for the admin detail page — "show all changes to product 42".
    """
    q = db.query(AuditLog).filter(
        AuditLog.resource_type == resource_type,
        AuditLog.resource_id == resource_id,
    )
    total = q.count()
    items = (
        q.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return AuditLogListResponse(
        items=[AuditLogResponse.model_validate(e) for e in items],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=math.ceil(total / per_page) if total else 1,
    )


@router.get("/{log_id}", response_model=AuditLogResponse)
def get_audit_log_entry(
    log_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_superadmin),
):
    """Fetch a single audit log entry by ID — superadmin only."""
    entry = db.get(AuditLog, log_id)
    if not entry:
        raise NotFoundError(f"Audit log entry {log_id} not found.")
    return AuditLogResponse.model_validate(entry)
