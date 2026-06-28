"""
app/modules/audit/service.py

Audit logging service.

USAGE — call from any service or router after a successful admin action:

    from app.modules.audit.service import audit

    # Simple action log
    audit.log(
        db=db,
        admin=current_admin,
        action="product.created",
        resource_type="product",
        resource_id=product.id,
        resource_label=product.title,
        changes={"payload": product_in.model_dump()},
        request=request,  # optional — extracts IP + User-Agent
    )

    # Log a failure (call inside except block)
    audit.log_failure(
        db=db,
        admin=current_admin,
        action="product.delete",
        resource_type="product",
        resource_id=product_id,
        error_message=str(exc),
        request=request,
    )

IMPORTANT: audit.log() never raises. If writing the audit record fails,
the error is logged to the application logger and swallowed. The business
operation must not fail because the audit write failed.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from app.modules.audit.models import AuditLog, AuditStatus

logger = logging.getLogger(__name__)


class AuditService:
    """
    Stateless audit service — instantiated once as a module-level singleton.
    All methods accept db as a parameter to keep the service compatible with
    FastAPI's per-request Session lifecycle.
    """

    # ─────────────────────────────────────────────────────────
    # Core log method
    # ─────────────────────────────────────────────────────────

    def log(
        self,
        *,
        db: Session,
        action: str,
        resource_type: str,
        admin_id: Optional[int] = None,
        admin_email: Optional[str] = None,
        admin_name: Optional[str] = None,
        admin=None,               # Accept Admin ORM object directly for convenience
        resource_id: Optional[int] = None,
        resource_label: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None,
        status: AuditStatus = AuditStatus.success,
        error_message: Optional[str] = None,
    ) -> None:
        """
        Write an audit record. Never raises — failures are logged and swallowed.

        Args:
            db:             SQLAlchemy session.
            action:         Dot-namespaced verb: "product.created", "order.cancelled".
            resource_type:  Domain noun: "product", "order", "banner".
            admin:          Admin ORM object (convenience; takes precedence over
                            admin_id / admin_email / admin_name if provided).
            admin_id:       Fallback when admin ORM object is not available.
            admin_email:    Fallback admin email string.
            admin_name:     Fallback admin name string.
            resource_id:    PK of the affected record.
            resource_label: Human-readable name at time of action.
            changes:        Payload dict — structure varies by action type.
            request:        FastAPI Request — used to extract IP and User-Agent.
            status:         AuditStatus.success (default) or AuditStatus.failure.
            error_message:  Error detail string (only for failure status).
        """
        try:
            # Resolve admin fields
            _admin_id = admin.id if admin else admin_id
            _admin_email = admin.email if admin else admin_email
            _admin_name = admin.name if admin else admin_name

            # Extract request context
            ip = self._extract_ip(request)
            ua = self._extract_user_agent(request)

            entry = AuditLog(
                admin_id=_admin_id,
                admin_email=_admin_email,
                admin_name=_admin_name,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                resource_label=resource_label,
                changes=changes,
                ip_address=ip,
                user_agent=ua,
                status=status,
                error_message=error_message,
            )
            db.add(entry)
            db.flush()      # Flush into the current transaction; caller commits.
                            # If the business operation rolls back, the audit
                            # record rolls back with it — which is correct behaviour
                            # for failed business operations (they log via log_failure).

        except Exception as exc:
            # Audit must never break the business operation.
            logger.error(
                "AuditService.log failed — action=%s resource_type=%s resource_id=%s: %s",
                action,
                resource_type,
                resource_id,
                exc,
                exc_info=True,
            )

    def log_failure(
        self,
        *,
        db: Session,
        action: str,
        resource_type: str,
        error_message: str,
        admin=None,
        admin_id: Optional[int] = None,
        admin_email: Optional[str] = None,
        admin_name: Optional[str] = None,
        resource_id: Optional[int] = None,
        resource_label: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None,
    ) -> None:
        """
        Write a failure audit record. Convenience wrapper around log().

        Call inside an except block after catching a domain or HTTP exception
        to record attempted-but-failed admin actions for security auditing.

        Example:
            try:
                ...business logic...
            except Exception as exc:
                audit.log_failure(
                    db=db, admin=current_admin,
                    action="product.delete",
                    resource_type="product",
                    resource_id=product_id,
                    error_message=str(exc),
                    request=request,
                )
                raise  # re-raise the original exception
        """
        self.log(
            db=db,
            action=action,
            resource_type=resource_type,
            admin=admin,
            admin_id=admin_id,
            admin_email=admin_email,
            admin_name=admin_name,
            resource_id=resource_id,
            resource_label=resource_label,
            changes=changes,
            request=request,
            status=AuditStatus.failure,
            error_message=error_message,
        )

    # ─────────────────────────────────────────────────────────
    # Convenience wrappers — reduces boilerplate at call sites
    # ─────────────────────────────────────────────────────────

    def created(self, *, db: Session, admin, resource_type: str,
                resource_id: int, resource_label: str,
                payload: Optional[Dict[str, Any]] = None,
                request: Optional[Request] = None) -> None:
        """Log a resource creation."""
        self.log(
            db=db, admin=admin,
            action=f"{resource_type}.created",
            resource_type=resource_type,
            resource_id=resource_id,
            resource_label=resource_label,
            changes={"payload": payload} if payload else None,
            request=request,
        )

    def updated(self, *, db: Session, admin, resource_type: str,
                resource_id: int, resource_label: str,
                before: Optional[Dict[str, Any]] = None,
                after: Optional[Dict[str, Any]] = None,
                request: Optional[Request] = None) -> None:
        """Log a resource update with before/after snapshots."""
        self.log(
            db=db, admin=admin,
            action=f"{resource_type}.updated",
            resource_type=resource_type,
            resource_id=resource_id,
            resource_label=resource_label,
            changes={"before": before, "after": after},
            request=request,
        )

    def deleted(self, *, db: Session, admin, resource_type: str,
                resource_id: int, resource_label: str,
                snapshot: Optional[Dict[str, Any]] = None,
                request: Optional[Request] = None) -> None:
        """Log a resource deletion with a record snapshot."""
        self.log(
            db=db, admin=admin,
            action=f"{resource_type}.deleted",
            resource_type=resource_type,
            resource_id=resource_id,
            resource_label=resource_label,
            changes={"snapshot": snapshot} if snapshot else None,
            request=request,
        )

    def bulk(self, *, db: Session, admin, resource_type: str,
             action_name: str, ids: list,
             extra: Optional[Dict[str, Any]] = None,
             request: Optional[Request] = None) -> None:
        """Log a bulk action."""
        self.log(
            db=db, admin=admin,
            action=f"{resource_type}.bulk_{action_name}",
            resource_type=resource_type,
            changes={"action": action_name, "ids": ids, "count": len(ids), **(extra or {})},
            request=request,
        )

    # ─────────────────────────────────────────────────────────
    # Private helpers
    # ─────────────────────────────────────────────────────────

    @staticmethod
    def _extract_ip(request: Optional[Request]) -> Optional[str]:
        if not request:
            return None
        # X-Forwarded-For takes precedence in reverse-proxy deployments.
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        if request.client:
            return request.client.host
        return None

    @staticmethod
    def _extract_user_agent(request: Optional[Request]) -> Optional[str]:
        if not request:
            return None
        ua = request.headers.get("User-Agent", "")
        # Truncate to column width
        return ua[:500] if ua else None


# Module-level singleton — import and use directly:
#   from app.modules.audit.service import audit
audit = AuditService()
