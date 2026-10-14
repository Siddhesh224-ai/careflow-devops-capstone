from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import UserRole
from app.repositories.user_repository import UserRepository


def bootstrap_admin(session: Session) -> None:
    settings = get_settings()
    repository = UserRepository(session)
    existing = repository.get_by_username(settings.admin_username)
    if existing:
        if existing.role != UserRole.ADMIN:
            raise RuntimeError("Configured admin username belongs to a non-admin account")
        existing.password_hash = hash_password(settings.admin_password)
        existing.is_active = True
    else:
        repository.create(
            username=settings.admin_username,
            password_hash=hash_password(settings.admin_password),
            role=UserRole.ADMIN,
        )
    session.commit()


def main() -> None:
    with SessionLocal() as session:
        bootstrap_admin(session)
    print("CareFlow administrator account is ready.")


if __name__ == "__main__":
    main()
