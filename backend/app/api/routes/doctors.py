import uuid
from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.api.dependencies import AdminUser, DbSession
from app.schemas.common import PaginatedResponse
from app.schemas.doctor import DoctorCreate, DoctorRead, DoctorUpdate
from app.services.doctor_service import DoctorService

router = APIRouter(prefix="/doctors", tags=["doctors"])


@router.get("", response_model=PaginatedResponse[DoctorRead])
def list_doctors(session: DbSession, _admin: AdminUser, page: Annotated[int, Query(ge=1)] = 1, page_size: Annotated[int, Query(ge=1, le=100)] = 20, search: str | None = None):
    return DoctorService(session).list(page, page_size, search)


@router.get("/{doctor_id}", response_model=DoctorRead)
def get_doctor(doctor_id: uuid.UUID, session: DbSession, _admin: AdminUser):
    return DoctorService(session).get(doctor_id)


@router.post("", response_model=DoctorRead, status_code=status.HTTP_201_CREATED)
def create_doctor(payload: DoctorCreate, session: DbSession, _admin: AdminUser):
    return DoctorService(session).create(payload)


@router.put("/{doctor_id}", response_model=DoctorRead)
def update_doctor(doctor_id: uuid.UUID, payload: DoctorUpdate, session: DbSession, _admin: AdminUser):
    return DoctorService(session).update(doctor_id, payload)


@router.delete("/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor(doctor_id: uuid.UUID, session: DbSession, _admin: AdminUser) -> Response:
    DoctorService(session).delete(doctor_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
