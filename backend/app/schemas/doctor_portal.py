from pydantic import BaseModel

from app.schemas.appointment import AppointmentRead
from app.schemas.availability import TimeOffRead, WorkingHoursRead
from app.schemas.doctor import DoctorRead


class DoctorDashboard(BaseModel):
    doctor: DoctorRead
    appointments: list[AppointmentRead]
    working_hours: list[WorkingHoursRead]
    time_off: list[TimeOffRead]
