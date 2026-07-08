from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.firebase_service import firebase_login

router = APIRouter(prefix="/firebase", tags=["Firebase Auth"])


class FirebaseLoginRequest(BaseModel):
    id_token: str


@router.post("/login")
def login_with_firebase(
    body: FirebaseLoginRequest,
    db: Session = Depends(get_db),
):
    """
    Login using Firebase ID Token.
    """
    return firebase_login(
        db=db,
        id_token=body.id_token,
    )