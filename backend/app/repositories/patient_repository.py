import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.patient import Patient


class PatientRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, patient_id: uuid.UUID) -> Patient | None:
        return self.session.get(Patient, patient_id)

    def list(self, page: int, page_size: int, search: str | None) -> tuple[list[Patient], int]:
        filters = []
        if search:
            term = f"%{search.strip()}%"
            filters.append(or_(Patient.full_name.ilike(term), Patient.phone_number.ilike(term)))
        total = self.session.scalar(select(func.count(Patient.id)).where(*filters)) or 0
        items = list(
            self.session.scalars(
                select(Patient)
                .where(*filters)
                .order_by(Patient.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        )
        return items, total

    def create(self, **values: object) -> Patient:
        patient = Patient(**values)
        self.session.add(patient)
        self.session.flush()
        return patient

    def has_appointments(self, patient_id: uuid.UUID) -> bool:
        from app.models.appointment import Appointment

        return bool(self.session.scalar(select(Appointment.id).where(Appointment.patient_id == patient_id).limit(1)))

