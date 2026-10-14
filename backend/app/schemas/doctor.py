import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.availability import WorkingHoursEntry, WorkingHoursRead
from app.schemas.common import ORMModel


class DoctorBase(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    specialization: str = Field(min_length=2, max_length=100)
    phone_number: str | None = Field(default=None, min_length=7, max_length=30, pattern=r"^[0-9+() .-]+$")
    email: EmailStr | None = None
    is_available: bool = True

    @field_validator("full_name", "specialization", mode="before")
    @classmethod
    def strip_required(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class DoctorCreate(DoctorBase):
    username: str = Field(min_length=3, max_length=80, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: str = Field(min_length=8, max_length=128)
    working_hours: list[WorkingHoursEntry] = Field(min_length=1, max_length=21)


class DoctorUpdate(DoctorBase):
    pass


class DoctorRead(DoctorBase, ORMModel):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    working_hours: list[WorkingHoursRead] = Field(default_factory=list)


class DoctorSummary(ORMModel):
    id: uuid.UUID
    full_name: str
    specialization: str
    is_available: bool
