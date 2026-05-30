from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.schemas.admin import AdminResponse, AdminCreate, AdminUpdate
from app.services.admin_service import (
    get_admins, get_admin, create_admin, update_admin,
    delete_admin, get_admin_by_email, get_admins_count
)
from app.auth.dependencies import get_current_admin, get_current_superadmin
from app.models.admin import Admin

router = APIRouter()


@router.get("/", response_model=List[AdminResponse])
def list_admins(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return get_admins(db, skip=skip, limit=limit)


@router.get("/count")
def count_admins(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return {"count": get_admins_count(db)}


@router.get("/{admin_id}", response_model=AdminResponse)
def get_admin_by_id(
    admin_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    admin = get_admin(db, admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    return admin


@router.post("/", response_model=AdminResponse, status_code=status.HTTP_201_CREATED)
def create_new_admin(
    admin_in: AdminCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_superadmin),
):
    existing = get_admin_by_email(db, admin_in.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    return create_admin(db, admin_in)


@router.put("/{admin_id}", response_model=AdminResponse)
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


@router.delete("/{admin_id}")
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
