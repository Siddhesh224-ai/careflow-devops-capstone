from datetime import date

from pydantic import BaseModel

from app.models.appointment import AppointmentStatus
from app.schemas.appointment import AppointmentRead
from app.schemas.patient import PatientSummary


class StatusCount(BaseModel):
    status: AppointmentStatus
    count: int


class DashboardSummary(BaseModel):
    local_date: date
    total_patients: int
    total_doctors: int
    appointments_today: int
    upcoming_appointments: int
    status_distribution: list[StatusCount]
    todays_appointments: list[AppointmentRead]
    recent_patients: list[PatientSummary]
