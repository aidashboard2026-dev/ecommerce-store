from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import verify_token
from app.models.admin import Admin

bearer_scheme = HTTPBearer()

def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    token = credentials.credentials

    # print("========== TOKEN ==========")
    # print(token)

    admin_id = verify_token(token)

    # print("========== ADMIN ID ==========")
    # print(admin_id)

    if not admin_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    admin = db.query(Admin).filter(Admin.id == int(admin_id)).first()

    # print("========== ADMIN ==========")
    # print(admin)

    return admin

def get_current_superadmin(current_admin: Admin = Depends(get_current_admin)) -> Admin:
    if current_admin.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )
    return current_admin
