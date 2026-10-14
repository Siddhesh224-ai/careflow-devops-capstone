from datetime import datetime, timedelta, timezone

import jwt
from jwt import InvalidTokenError
from pwdlib import PasswordHash

from app.core.config import get_settings

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_access_token(user_id: str, role: str) -> tuple[str, datetime]:
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiration_hours)
    token = jwt.encode(
        {"sub": user_id, "role": role, "exp": expires_at, "iat": datetime.now(timezone.utc)},
        settings.jwt_secret,
        algorithm="HS256",
    )
    return token, expires_at


def decode_access_token(token: str) -> dict[str, object]:
    try:
        return jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
    except InvalidTokenError as exc:
        raise ValueError("Invalid or expired access token") from exc
