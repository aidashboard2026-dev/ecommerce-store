from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.admin import Token, LoginRequest, AdminResponse
from app.services.auth_service import login_admin
from app.auth.dependencies import get_current_admin
from app.models.admin import Admin

router = APIRouter()


@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    result = login_admin(db, login_data.email, login_data.password)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            # detail="Incorrect email or password",
             detail=(
                "Invalid admin email or password. Use INITIAL_ADMIN_EMAIL "
                "and INITIAL_ADMIN_PASSWORD from your .env file."
            ),
        )
    return result


@router.get("/me", response_model=AdminResponse)
def get_me(current_admin: Admin = Depends(get_current_admin)):
    return current_admin


@router.post("/logout")
def logout(current_admin: Admin = Depends(get_current_admin)):
    # JWT is stateless; client clears token
    return {"message": "Logged out successfully"}
