import uuid
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.common import ORMModel


class PatientBase(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    date_of_birth: date
    gender: str | None = Field(default=None, max_length=30)
    phone_number: str = Field(min_length=7, max_length=30, pattern=r"^[0-9+() .-]+$")
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=500)

    @field_validator("date_of_birth")
    @classmethod
    def birth_date_not_future(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("Date of birth cannot be in the future")
        return value

    @field_validator("full_name", "gender", "address", mode="before")
    @classmethod
    def strip_strings(cls, value: str | None) -> str | None:
        return value.strip() if isinstance(value, str) else value


class PatientCreate(PatientBase):
    pass


class PatientUpdate(PatientBase):
    pass


class PatientRead(PatientBase, ORMModel):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class PatientSummary(ORMModel):
    id: uuid.UUID
    full_name: str
    phone_number: str
    created_at: datetime

