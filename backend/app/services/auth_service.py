from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.repositories.user_repository import UserRepository
from app.schemas.auth import AuthUser, TokenResponse


class AuthService:
    def __init__(self, session: Session) -> None:
        self.repository = UserRepository(session)

    def login(self, username: str, password: str) -> TokenResponse | None:
        user = self.repository.get_by_username(username.strip().lower())
        if not user or not user.is_active or not verify_password(password, user.password_hash):
            return None
        token, expires_at = create_access_token(str(user.id), user.role.value)
        return TokenResponse(
            access_token=token,
            expires_at=expires_at,
            user=AuthUser(id=user.id, username=user.username, role=user.role, doctor_id=user.doctor_id),
        )
