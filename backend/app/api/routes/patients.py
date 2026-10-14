import uuid
from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.api.dependencies import AdminUser, DbSession
from app.schemas.appointment import AppointmentRead
from app.schemas.common import PaginatedResponse
from app.schemas.patient import PatientCreate, PatientRead, PatientUpdate
from app.services.patient_service import PatientService

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("", response_model=PaginatedResponse[PatientRead])
def list_patients(
    session: DbSession,
    _admin: AdminUser,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query(max_length=120)] = None,
):
    return PatientService(session).list(page, page_size, search)


@router.get("/{patient_id}", response_model=PatientRead)
def get_patient(patient_id: uuid.UUID, session: DbSession, _admin: AdminUser):
    return PatientService(session).get(patient_id)


@router.post("", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
def create_patient(payload: PatientCreate, session: DbSession, _admin: AdminUser):
    return PatientService(session).create(payload)


@router.put("/{patient_id}", response_model=PatientRead)
def update_patient(patient_id: uuid.UUID, payload: PatientUpdate, session: DbSession, _admin: AdminUser):
    return PatientService(session).update(patient_id, payload)


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(patient_id: uuid.UUID, session: DbSession, _admin: AdminUser) -> Response:
    PatientService(session).delete(patient_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{patient_id}/appointments", response_model=list[AppointmentRead])
def patient_appointments(patient_id: uuid.UUID, session: DbSession, _admin: AdminUser):
    return PatientService(session).appointments(patient_id)
