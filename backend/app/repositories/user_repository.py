import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User, UserRole


class UserRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, user_id: uuid.UUID) -> User | None:
        return self.session.get(User, user_id)

    def get_by_username(self, username: str) -> User | None:
        return self.session.scalar(select(User).where(User.username == username.lower()))

    def create(
        self,
        *,
        username: str,
        password_hash: str,
        role: UserRole,
        doctor_id: uuid.UUID | None = None,
    ) -> User:
        user = User(
            username=username.lower(),
            password_hash=password_hash,
            role=role,
            doctor_id=doctor_id,
            is_active=True,
        )
        self.session.add(user)
        self.session.flush()
        return user
