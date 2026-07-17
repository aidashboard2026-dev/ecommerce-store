import base64
import json
import logging
from pathlib import Path
from typing import Any, Dict

import firebase_admin
from firebase_admin import auth, credentials
from app.core.config import settings

logger = logging.getLogger("app")

# Resolve base directory
BASE_DIR = Path(__file__).resolve().parents[2]  # backend/ root directory

_firebase_initialized = False


def get_firebase_credentials() -> credentials.Certificate:
    """
    Resolves and returns the Firebase credentials object.
    Supports:
    1. Direct JSON content via FIREBASE_SERVICE_ACCOUNT_JSON (raw JSON string or Base64 encoded).
    2. File path via FIREBASE_CREDENTIALS_PATH (handles absolute, relative, and Windows-to-Linux path translation).
    3. Auto-discovery fallback in the secrets directory.
    """
    # 1. Check if raw JSON or base64 JSON env var is set
    account_json = settings.FIREBASE_SERVICE_ACCOUNT_JSON
    if account_json and account_json.strip():
        try:
            # Try parsing as raw JSON
            cred_dict = json.loads(account_json)
            logger.info("Initializing Firebase using credentials from FIREBASE_SERVICE_ACCOUNT_JSON (raw JSON string)")
            return credentials.Certificate(cred_dict)
        except json.JSONDecodeError:
            # Try decoding as base64
            try:
                decoded = base64.b64decode(account_json.strip()).decode("utf-8")
                cred_dict = json.loads(decoded)
                logger.info("Initializing Firebase using credentials from FIREBASE_SERVICE_ACCOUNT_JSON (base64 encoded)")
                return credentials.Certificate(cred_dict)
            except Exception as e:
                logger.error("FIREBASE_SERVICE_ACCOUNT_JSON is set but failed to parse as JSON or base64: %s", e)

    # 2. Check credentials path
    cred_path_str = settings.FIREBASE_CREDENTIALS_PATH
    paths_to_try = []

    if cred_path_str and cred_path_str.strip():
        # Clean up path (e.g. remove surrounding quotes if any)
        cred_path_str = cred_path_str.strip('\'"')
        
        # Try direct path
        p = Path(cred_path_str)
        paths_to_try.append(p)
        
        # Try path relative to BASE_DIR
        paths_to_try.append(BASE_DIR / cred_path_str)
        
        # If it looks like a Windows path (has drive letter or backslashes) but we are on Linux/Docker,
        # extract the filename and try standard secrets paths.
        if "\\" in cred_path_str or (len(cred_path_str) > 1 and cred_path_str[1] == ":"):
            filename = cred_path_str.replace("\\", "/").split("/")[-1]
            paths_to_try.append(BASE_DIR / "secrets" / filename)
            paths_to_try.append(Path("/app/secrets") / filename)
            paths_to_try.append(Path("secrets") / filename)

    # 3. Auto-discovery fallback: search secrets folder
    secrets_dir = BASE_DIR / "secrets"
    if secrets_dir.exists() and secrets_dir.is_dir():
        for f in secrets_dir.glob("*.json"):
            if "firebase" in f.name:
                paths_to_try.append(f)
                
    container_secrets_dir = Path("/app/secrets")
    if container_secrets_dir.exists() and container_secrets_dir.is_dir():
        for f in container_secrets_dir.glob("*.json"):
            if "firebase" in f.name:
                paths_to_try.append(f)

    # Dedup paths keeping order
    seen = set()
    unique_paths = []
    for p in paths_to_try:
        try:
            resolved = p.resolve()
            if resolved not in seen:
                seen.add(resolved)
                unique_paths.append(resolved)
        except Exception:
            if p not in seen:
                seen.add(p)
                unique_paths.append(p)

    # Check which path actually exists
    for p in unique_paths:
        if p.exists() and p.is_file():
            logger.info("Initializing Firebase using credentials file: %s", p)
            return credentials.Certificate(str(p))

    # If we got here, credentials could not be resolved.
    # Log detailed diagnostics as required by Phase 6.
    expected_path_msg = (
        str(BASE_DIR / "secrets" / "mydesigner-ecommercestore-firebase-adminsdk-fbsvc-71110b5b7d.json")
        if not settings.FIREBASE_CREDENTIALS_PATH
        else settings.FIREBASE_CREDENTIALS_PATH
    )
    
    error_msg = (
        "\n"
        "================================================================================\n"
        "❌ FIREBASE INITIALIZATION ERROR: Firebase credentials could not be located!\n"
        "================================================================================\n"
        f"- Configured FIREBASE_CREDENTIALS_PATH: {settings.FIREBASE_CREDENTIALS_PATH or 'Not Set'}\n"
        f"- Configured FIREBASE_PROJECT_ID: {settings.FIREBASE_PROJECT_ID or 'Not Set'}\n"
        f"- Expected path scanned: {expected_path_msg}\n"
        "- Scanned paths checked:\n"
    )
    for p in unique_paths:
        error_msg += f"  * {p} (Exists: {p.exists()})\n"
        
    error_msg += (
        "\nREMEDIATION STEPS:\n"
        "1. Local Development:\n"
        "   - Make sure your Firebase service account JSON is placed at:\n"
        "     backend/secrets/my-designers-production-firebase-adminsdk-fbsvc-cd9f08b420.json\n"
        "   - Check your backend/.env file and ensure FIREBASE_CREDENTIALS_PATH is set correctly.\n"
        "2. Docker/Compose Development:\n"
        "   - Ensure the 'backend/secrets' directory is correctly mounted to '/app/secrets' in docker-compose.yml.\n"
        "   - Set FIREBASE_CREDENTIALS_PATH=/app/secrets/my-designers-production-firebase-adminsdk-fbsvc-cd9f08b420.json in your .env.\n"
        "3. Production (Railway/VPS/Cloud):\n"
        "   - Either mount the secrets directory using a secure volume, or set the environment variable\n"
        "     'FIREBASE_SERVICE_ACCOUNT_JSON' with the raw JSON content of your service account (or base64-encoded).\n"
        "================================================================================\n"
    )
    logger.critical(error_msg)
    raise RuntimeError("Firebase initialization failed due to missing or invalid credentials. See logs above for details.")


def initialize_firebase() -> None:
    """
    Initializes the Firebase Admin SDK.
    Ensures initialization happens only once and prevents duplicate initialization.
    Does not run at import-time.
    """
    global _firebase_initialized
    if _firebase_initialized:
        return
        
    if firebase_admin._apps:
        logger.info("Firebase already initialized externally/previously.")
        _firebase_initialized = True
        return

    try:
        cred = get_firebase_credentials()
        # Initialize Firebase Admin SDK
        if settings.FIREBASE_PROJECT_ID:
            firebase_admin.initialize_app(cred, {
                'projectId': settings.FIREBASE_PROJECT_ID
            })
        else:
            firebase_admin.initialize_app(cred)
            
        _firebase_initialized = True
        logger.info("Firebase Admin SDK successfully initialized.")
    except Exception as e:
        logger.critical("Failed to initialize Firebase Admin SDK: %s", e)
        raise


def verify_firebase_token(id_token: str) -> Dict[str, Any]:
    """
    Verify Firebase ID Token.
    Returns decoded Firebase user.
    """
    if not firebase_admin._apps:
        initialize_firebase()
    return auth.verify_id_token(id_token)