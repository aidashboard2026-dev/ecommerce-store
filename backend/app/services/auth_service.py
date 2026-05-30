from sqlalchemy.orm import Session
from app.models.admin import Admin
from app.core.security import verify_password, create_access_token
from datetime import timedelta
from app.core.config import settings


def authenticate_admin(db: Session, email: str, password: str):
    admin = db.query(Admin).filter(Admin.email == email).first()
    if not admin:
        return None
    if not verify_password(password, admin.password_hash):
        return None
    return admin


def login_admin(db: Session, email: str, password: str):
    admin = authenticate_admin(db, email, password)
    if not admin:
        return None

    access_token = create_access_token(
        subject=admin.id,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer", "admin": admin}
