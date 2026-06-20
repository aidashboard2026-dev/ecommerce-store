from datetime import datetime, timedelta
from typing import Optional, Union, Any

import bcrypt
from jose import jwt, JWTError

from app.core.config import settings

_BCRYPT_MAX_BYTES = 72  # bcrypt silently ignores bytes beyond this; truncate explicitly


def _prep(password: str) -> bytes:
    pw_bytes = password.encode("utf-8")
    if len(pw_bytes) > _BCRYPT_MAX_BYTES:
        pw_bytes = pw_bytes[:_BCRYPT_MAX_BYTES]
    return pw_bytes


def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
    token_type: str = "admin",
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject), "type": token_type}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str, expected_type: str = "admin") -> Optional[str]:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        # Backwards-compatible: tokens issued before type was added default to "admin"
        token_type = payload.get("type", "admin")
        if token_type != expected_type:
            return None
        return payload.get("sub")
    except JWTError:
        return None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    try:
        return bcrypt.checkpw(_prep(plain_password), hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        # Malformed/corrupt/non-bcrypt hash in the DB — treat as failed auth,
        # not a 500. (This is also the case passlib used to throw on.)
        return False


def get_password_hash(password: str) -> str:
    hashed = bcrypt.hashpw(_prep(password), bcrypt.gensalt(rounds=12))
    return hashed.decode("utf-8")