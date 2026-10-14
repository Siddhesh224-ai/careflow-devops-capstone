import uuid
from fastapi import APIRouter, Response, status

from app.api.dependencies import DbSession, DoctorUser
from app.schemas.appointment import AppointmentRead
from app.schemas.availability import TimeOffCreate, TimeOffRead, WorkingHoursRead, WorkingHoursUpdate
from app.schemas.doctor_portal import DoctorDashboard
from app.services.doctor_portal_service import DoctorPortalService

router = APIRouter(prefix="/doctor", tags=["doctor portal"])


@router.get("/dashboard", response_model=DoctorDashboard)
def dashboard(session: DbSession, user: DoctorUser):
    return DoctorPortalService(session).dashboard(user.doctor_id)


@router.put("/working-hours", response_model=list[WorkingHoursRead])
def replace_working_hours(payload: WorkingHoursUpdate, session: DbSession, user: DoctorUser):
    return DoctorPortalService(session).replace_working_hours(user.doctor_id, payload)


@router.post("/time-off", response_model=TimeOffRead, status_code=status.HTTP_201_CREATED)
def create_time_off(payload: TimeOffCreate, session: DbSession, user: DoctorUser):
    return DoctorPortalService(session).create_time_off(user.doctor_id, payload)


@router.delete("/time-off/{time_off_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_time_off(time_off_id: uuid.UUID, session: DbSession, user: DoctorUser) -> Response:
    DoctorPortalService(session).delete_time_off(user.doctor_id, time_off_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/appointments/{appointment_id}/complete", response_model=AppointmentRead)
def complete_appointment(appointment_id: uuid.UUID, session: DbSession, user: DoctorUser):
    return DoctorPortalService(session).complete_appointment(user.doctor_id, appointment_id)
