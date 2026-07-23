"""
app/modules/audit/models.py

Audit log — immutable record of every admin action.

DESIGN
------
- Write-once. No UPDATE or DELETE operations ever touch this table.
- Denormalised admin_email so history survives admin account deletion.
- `changes` is a JSON blob: {"before": {...}, "after": {...}} for updates,
  or {"payload": {...}} for creates/deletes. Kept flexible intentionally
  so each module can store what is meaningful for its domain.
- `ip_address` supports both IPv4 and IPv6 (VARCHAR 45).
- `status` distinguishes successful actions from attempted-but-failed ones,
  enabling security audits to surface repeated failures.
- `resource_type` + `resource_id` form a soft foreign key so queries like
  "show me all changes to product 42" work without joining every table.

PENDING ALEMBIC MIGRATION
--------------------------
Run after all Phase 1 files are in place:

    alembic revision --autogenerate -m "add_audit_logs_table"
    alembic upgrade head

The migration will create:
    Table: audit_logs
    Indexes:
        ix_audit_logs_admin_id
        ix_audit_logs_action
        ix_audit_logs_resource_type
        ix_audit_logs_resource_id
        ix_audit_logs_created_at
        ix_audit_logs_status
"""

import enum

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    Enum as SAEnum,
)
from sqlalchemy.sql import func

from app.core.database import Base


class AuditStatus(str, enum.Enum):
    success = "success"
    failure = "failure"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    __table_args__ = (
        # Composite index for the most common audit query:
        # "show all actions on product X" or "all actions by admin Y"
        Index("ix_audit_resource", "resource_type", "resource_id"),
        Index("ix_audit_admin_created", "admin_id", "created_at"),
    )

    # ── Primary Key ───────────────────────────────────────────
    id = Column(Integer, primary_key=True, index=True)

    # ── Who performed the action ─────────────────────────────
    # admin_id is a soft FK (no DB-level constraint) so that audit records
    # survive admin account deletion. We denormalise admin_email for the
    # same reason.
    admin_id = Column(Integer, nullable=True, index=True)
    admin_email = Column(String(255), nullable=True)
    admin_name = Column(String(100), nullable=True)

    # ── What was done ────────────────────────────────────────
    # action: verb in snake_case, e.g. "product.created", "order.status_updated"
    action = Column(String(100), nullable=False, index=True)

    # resource_type: domain noun, e.g. "product", "order", "banner"
    resource_type = Column(String(100), nullable=False, index=True)

    # resource_id: primary key of the affected record (nullable for bulk actions)
    resource_id = Column(Integer, nullable=True, index=True)

    # resource_label: human-readable name at time of action (e.g. product title)
    # Avoids JOIN to resolve "what was deleted" queries.
    resource_label = Column(String(255), nullable=True)

    # ── Change payload ───────────────────────────────────────
    # For CREATE: {"payload": {...fields...}}
    # For UPDATE: {"before": {...changed_fields...}, "after": {...changed_fields...}}
    # For DELETE: {"snapshot": {...record...}}
    # For BULK:   {"action": "publish", "ids": [1,2,3], "count": 3}
    changes = Column(JSON, nullable=True)

    # ── Request context ──────────────────────────────────────
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)

    # ── Outcome ──────────────────────────────────────────────
    status = Column(
        SAEnum(AuditStatus, name="audit_status_enum"),
        nullable=False,
        default=AuditStatus.success,
        index=True,
    )
    # Populated only when status = "failure"
    error_message = Column(Text, nullable=True)

    # ── Timestamp (immutable) ────────────────────────────────
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
