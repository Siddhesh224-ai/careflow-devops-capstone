import math
import uuid

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.security import hash_password
from app.core.exceptions import ConflictError, NotFoundError
from app.models.user import UserRole
from app.repositories.availability_repository import AvailabilityRepository
from app.repositories.doctor_repository import DoctorRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginatedResponse
from app.schemas.doctor import DoctorCreate, DoctorRead, DoctorUpdate


class DoctorService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = DoctorRepository(session)
        self.availability = AvailabilityRepository(session)
        self.users = UserRepository(session)

    def list(self, page: int, page_size: int, search: str | None) -> PaginatedResponse[DoctorRead]:
        items, total = self.repository.list(page, page_size, search)
        return PaginatedResponse(items=items, page=page, page_size=page_size, total=total, total_pages=math.ceil(total / page_size))

    def get(self, doctor_id: uuid.UUID):
        doctor = self.repository.get(doctor_id)
        if not doctor:
            raise NotFoundError("Doctor not found.")
        return doctor

    def create(self, payload: DoctorCreate):
        values = payload.model_dump(exclude={"username", "password", "working_hours"})
        try:
            doctor = self.repository.create(**values)
            self.availability.replace_working_hours(doctor.id, payload.working_hours)
            self.users.create(
                username=payload.username,
                password_hash=hash_password(payload.password),
                role=UserRole.DOCTOR,
                doctor_id=doctor.id,
            )
            self.session.commit()
            return self.get(doctor.id)
        except IntegrityError as exc:
            self.session.rollback()
            raise ConflictError("That doctor username is already in use.") from exc

    def update(self, doctor_id: uuid.UUID, payload: DoctorUpdate):
        doctor = self.get(doctor_id)
        for key, value in payload.model_dump().items():
            setattr(doctor, key, value)
        self.session.commit()
        return doctor

    def delete(self, doctor_id: uuid.UUID) -> None:
        doctor = self.get(doctor_id)
        if self.repository.has_appointments(doctor_id):
            raise ConflictError("Doctor cannot be deleted while appointment history exists.")
        self.session.delete(doctor)
        self.session.commit()
