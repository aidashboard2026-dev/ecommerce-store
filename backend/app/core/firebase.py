from pathlib import Path

import firebase_admin
from firebase_admin import auth, credentials

# backend/
BASE_DIR = Path(__file__).resolve().parents[2]

SERVICE_ACCOUNT_FILE = BASE_DIR / "secrets" / "firebase-service-account.json"

if not firebase_admin._apps:
    cred = credentials.Certificate(str(SERVICE_ACCOUNT_FILE))
    firebase_admin.initialize_app(cred)


def verify_firebase_token(id_token: str):
    """
    Verify Firebase ID Token.
    Returns decoded Firebase user.
    """
    return auth.verify_id_token(id_token)