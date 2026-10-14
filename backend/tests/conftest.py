import os
from collections.abc import Generator
from pathlib import Path
from urllib.parse import urlparse

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
if TEST_DATABASE_URL:
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL

from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.core.security import create_access_token, hash_password  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402


@pytest.fixture(scope="session")
def migrated_engine():
    if not TEST_DATABASE_URL:
        pytest.skip("TEST_DATABASE_URL is not configured")
    database_name = urlparse(TEST_DATABASE_URL.replace("+psycopg", "")).path.lower()
    if "test" not in database_name:
        pytest.fail("TEST_DATABASE_URL must point to a database whose name contains 'test'")
    backend_dir = Path(__file__).parents[1]
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "alembic"))
    config.set_main_option("sqlalchemy.url", TEST_DATABASE_URL.replace("%", "%%"))
    command.upgrade(config, "head")
    engine = create_engine(TEST_DATABASE_URL)
    yield engine
    engine.dispose()


@pytest.fixture()
def client(migrated_engine) -> Generator[TestClient, None, None]:
    factory = sessionmaker(bind=migrated_engine, expire_on_commit=False)

    def override_db():
        with factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_db
    with migrated_engine.begin() as connection:
        connection.execute(text("DELETE FROM appointments"))
        connection.execute(text("DELETE FROM doctor_time_off"))
        connection.execute(text("DELETE FROM doctor_working_hours"))
        connection.execute(text("DELETE FROM users"))
        connection.execute(text("DELETE FROM doctors"))
        connection.execute(text("DELETE FROM patients"))
    with factory() as session:
        admin = User(
            username="test-admin",
            password_hash=hash_password("test-admin-password"),
            role=UserRole.ADMIN,
            is_active=True,
        )
        session.add(admin)
        session.commit()
        token, _ = create_access_token(str(admin.id), admin.role.value)
    with TestClient(app) as test_client:
        test_client.headers.update({"Authorization": f"Bearer {token}"})
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def sample_patient() -> dict[str, object]:
    return {
        "full_name": "Test Patient",
        "date_of_birth": "1990-06-15",
        "gender": "Other",
        "phone_number": "+91 90000 00001",
        "email": "patient@example.com",
        "address": "Synthetic address",
    }


@pytest.fixture()
def sample_doctor() -> dict[str, object]:
    return {
        "full_name": "Dr. Test Doctor",
        "specialization": "General Medicine",
        "phone_number": "+91 90000 00002",
        "email": "doctor@example.com",
        "is_available": True,
        "username": "doctor-test",
        "password": "doctor-password",
        "working_hours": [
            {"day_of_week": day, "start_time": "00:00", "end_time": "23:59"}
            for day in range(7)
        ],
    }
