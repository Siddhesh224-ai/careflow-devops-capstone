import math
import uuid

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.repositories.patient_repository import PatientRepository
from app.repositories.appointment_repository import AppointmentRepository
from app.schemas.common import PaginatedResponse
from app.schemas.patient import PatientCreate, PatientRead, PatientUpdate


class PatientService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = PatientRepository(session)
        self.appointment_repository = AppointmentRepository(session)

    def list(self, page: int, page_size: int, search: str | None) -> PaginatedResponse[PatientRead]:
        items, total = self.repository.list(page, page_size, search)
        return PaginatedResponse(items=items, page=page, page_size=page_size, total=total, total_pages=math.ceil(total / page_size))

    def get(self, patient_id: uuid.UUID):
        patient = self.repository.get(patient_id)
        if not patient:
            raise NotFoundError("Patient not found.")
        return patient

    def create(self, payload: PatientCreate):
        patient = self.repository.create(**payload.model_dump())
        self.session.commit()
        return patient

    def update(self, patient_id: uuid.UUID, payload: PatientUpdate):
        patient = self.get(patient_id)
        for key, value in payload.model_dump().items():
            setattr(patient, key, value)
        self.session.commit()
        return patient

    def delete(self, patient_id: uuid.UUID) -> None:
        patient = self.get(patient_id)
        if self.repository.has_appointments(patient_id):
            raise ConflictError("Patient cannot be deleted while appointment history exists.")
        self.session.delete(patient)
        self.session.commit()

    def appointments(self, patient_id: uuid.UUID):
        self.get(patient_id)
        return self.appointment_repository.list_for_patient(patient_id)
