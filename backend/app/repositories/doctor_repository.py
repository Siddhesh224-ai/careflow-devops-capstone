import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.doctor import Doctor


class DoctorRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, doctor_id: uuid.UUID) -> Doctor | None:
        return self.session.scalar(
            select(Doctor).options(selectinload(Doctor.working_hours)).where(Doctor.id == doctor_id)
        )

    def list(self, page: int, page_size: int, search: str | None) -> tuple[list[Doctor], int]:
        filters = []
        if search:
            term = f"%{search.strip()}%"
            filters.append(or_(Doctor.full_name.ilike(term), Doctor.specialization.ilike(term)))
        total = self.session.scalar(select(func.count(Doctor.id)).where(*filters)) or 0
        items = list(
            self.session.scalars(
                select(Doctor)
                .options(selectinload(Doctor.working_hours))
                .where(*filters)
                .order_by(Doctor.full_name)
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        )
        return items, total

    def create(self, **values: object) -> Doctor:
        doctor = Doctor(**values)
        self.session.add(doctor)
        self.session.flush()
        return doctor

    def has_appointments(self, doctor_id: uuid.UUID) -> bool:
        from app.models.appointment import Appointment

        return bool(self.session.scalar(select(Appointment.id).where(Appointment.doctor_id == doctor_id).limit(1)))
