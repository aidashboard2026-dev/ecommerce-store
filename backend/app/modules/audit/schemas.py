"""
app/modules/audit/schemas.py

Pydantic schemas for the audit log admin API.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class AuditLogResponse(BaseModel):
    id: int
    admin_id: Optional[int] = None
    admin_email: Optional[str] = None
    admin_name: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[int] = None
    resource_label: Optional[str] = None
    changes: Optional[Any] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
