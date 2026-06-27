from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.modules.admins.schemas import AdminResponse, AdminCreate, AdminUpdate
from app.modules.admins.service import (
    get_admins, get_admin, create_admin, update_admin,
    delete_admin, get_admin_by_email, get_admins_count
)
from app.modules.auth.dependencies import get_current_admin, get_current_superadmin
from app.modules.admins.models import Admin

router = APIRouter()


# ── List all admins (admin-protected) ─────────────────────────────────────────

@router.get("/admin/all", response_model=List[AdminResponse])
def list_admins(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return get_admins(db, skip=skip, limit=limit)


@router.get("/admin/count")
def count_admins(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return {"count": get_admins_count(db)}


# ── Create admin (superadmin only — no public registration path) ──────────────

@router.post("/admin", response_model=AdminResponse, status_code=status.HTTP_201_CREATED)
def create_new_admin(
    admin_in: AdminCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_superadmin),
):
    """
    Create a new admin account.
    SECURITY: Requires superadmin JWT — no unauthenticated path exists.
    """
    existing = get_admin_by_email(db, admin_in.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    return create_admin(db, admin_in)


# ── Per-admin operations ───────────────────────────────────────────────────────

@router.get("/admin/{admin_id}", response_model=AdminResponse)
def get_admin_by_id(
    admin_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    admin = get_admin(db, admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    return admin


@router.put("/admin/{admin_id}", response_model=AdminResponse)
def update_admin_by_id(
    admin_id: int,
    admin_in: AdminUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    admin = get_admin(db, admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    # Only superadmin can update others
    if current_admin.id != admin_id and current_admin.role != "superadmin":
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return update_admin(db, admin, admin_in)


@router.delete("/admin/{admin_id}")
def delete_admin_by_id(
    admin_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_superadmin),
):
    if current_admin.id == admin_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    success = delete_admin(db, admin_id)
    if not success:
        raise HTTPException(status_code=404, detail="Admin not found")
    return {"message": "Admin deleted successfully"}
