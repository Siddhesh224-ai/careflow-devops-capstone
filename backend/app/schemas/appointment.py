import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.appointment import AppointmentStatus
from app.schemas.common import ORMModel
from app.schemas.doctor import DoctorSummary
from app.schemas.patient import PatientCreate, PatientSummary


class AppointmentDetails(BaseModel):
    doctor_id: uuid.UUID
    scheduled_at: datetime
    duration_minutes: int = Field(ge=15, le=240)
    reason: str = Field(min_length=2, max_length=500)
    status: AppointmentStatus = AppointmentStatus.SCHEDULED

    @field_validator("scheduled_at")
    @classmethod
    def timestamp_must_be_aware(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("scheduled_at must include a timezone offset")
        return value

    @field_validator("reason", mode="before")
    @classmethod
    def strip_reason(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class AppointmentBase(AppointmentDetails):
    patient_id: uuid.UUID


class AppointmentCreate(AppointmentBase):
    status: AppointmentStatus = AppointmentStatus.SCHEDULED


class AppointmentWithNewPatientCreate(BaseModel):
    patient: PatientCreate
    appointment: AppointmentDetails


class AppointmentUpdate(AppointmentBase):
    pass


class AppointmentRead(AppointmentBase, ORMModel):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    patient: PatientSummary
    doctor: DoctorSummary
