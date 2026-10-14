import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.api.dependencies import AdminUser, DbSession
from app.models.appointment import AppointmentStatus
from app.schemas.appointment import AppointmentCreate, AppointmentRead, AppointmentUpdate, AppointmentWithNewPatientCreate
from app.schemas.common import PaginatedResponse
from app.services.appointment_service import AppointmentService

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.get("", response_model=PaginatedResponse[AppointmentRead])
def list_appointments(
    session: DbSession,
    _admin: AdminUser,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    appointment_status: Annotated[AppointmentStatus | None, Query(alias="status")] = None,
    from_date: date | None = None,
    to_date: date | None = None,
):
    return AppointmentService(session).list(page, page_size, appointment_status, from_date, to_date)


@router.get("/{appointment_id}", response_model=AppointmentRead)
def get_appointment(appointment_id: uuid.UUID, session: DbSession, _admin: AdminUser):
    return AppointmentService(session).get(appointment_id)


@router.post("", response_model=AppointmentRead, status_code=status.HTTP_201_CREATED)
def create_appointment(payload: AppointmentCreate, session: DbSession, _admin: AdminUser):
    return AppointmentService(session).create(payload)


@router.post("/with-new-patient", response_model=AppointmentRead, status_code=status.HTTP_201_CREATED)
def create_appointment_with_new_patient(
    payload: AppointmentWithNewPatientCreate,
    session: DbSession,
    _admin: AdminUser,
):
    return AppointmentService(session).create_with_new_patient(payload)


@router.put("/{appointment_id}", response_model=AppointmentRead)
def update_appointment(appointment_id: uuid.UUID, payload: AppointmentUpdate, session: DbSession, _admin: AdminUser):
    return AppointmentService(session).update(appointment_id, payload)


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_appointment(appointment_id: uuid.UUID, session: DbSession, _admin: AdminUser) -> Response:
    AppointmentService(session).delete(appointment_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
