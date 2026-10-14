from functools import lru_cache
from pathlib import Path
from zoneinfo import ZoneInfo

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "CareFlow API"
    app_env: str = "development"
    log_level: str = "INFO"
    database_url: str
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])
    clinic_timezone: str = "Asia/Kolkata"
    min_appointment_duration: int = 15
    max_appointment_duration: int = 240
    jwt_secret: str = Field(min_length=32)
    jwt_expiration_hours: int = 48
    admin_username: str = "admin"
    admin_password: str = Field(min_length=8)

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        if not value.startswith(("postgresql+psycopg://", "postgresql://")):
            raise ValueError("DATABASE_URL must be a PostgreSQL URL")
        return value

    @field_validator("clinic_timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        ZoneInfo(value)
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
