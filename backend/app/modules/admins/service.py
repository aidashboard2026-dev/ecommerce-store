from sqlalchemy.orm import Session
from typing import List, Optional
from app.modules.admins.models import Admin
from app.modules.admins.schemas import AdminCreate, AdminUpdate
from app.core.security import get_password_hash


def get_admin(db: Session, admin_id: int) -> Optional[Admin]:
    return db.query(Admin).filter(Admin.id == admin_id).first()


def get_admin_by_email(db: Session, email: str) -> Optional[Admin]:
    return db.query(Admin).filter(Admin.email == email).first()


def get_admins(db: Session, skip: int = 0, limit: int = 100) -> List[Admin]:
    return db.query(Admin).offset(skip).limit(limit).all()


def get_admins_count(db: Session) -> int:
    return db.query(Admin).count()


def create_admin(db: Session, admin_in: AdminCreate) -> Admin:
    admin = Admin(
        name=admin_in.name,
        email=admin_in.email,
        password_hash=get_password_hash(admin_in.password),
        role=admin_in.role or "admin",
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def update_admin(db: Session, admin: Admin, admin_in: AdminUpdate) -> Admin:
    update_data = admin_in.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))
    for field, value in update_data.items():
        setattr(admin, field, value)
    db.commit()
    db.refresh(admin)
    return admin


def delete_admin(db: Session, admin_id: int) -> bool:
    admin = get_admin(db, admin_id)
    if not admin:
        return False
    db.delete(admin)
    db.commit()
    return True
