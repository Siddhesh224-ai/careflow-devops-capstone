import math
import uuid
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import BusinessRuleError, ConflictError, NotFoundError
from app.models.appointment import AppointmentStatus
from app.repositories.appointment_repository import AppointmentRepository
from app.repositories.availability_repository import AvailabilityRepository
from app.repositories.doctor_repository import DoctorRepository
from app.repositories.patient_repository import PatientRepository
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentDetails,
    AppointmentRead,
    AppointmentUpdate,
    AppointmentWithNewPatientCreate,
)
from app.schemas.common import PaginatedResponse

TERMINAL_STATUSES = {AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED}
ALLOWED_TRANSITIONS = {
    AppointmentStatus.SCHEDULED: {AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED},
    AppointmentStatus.CONFIRMED: {AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED},
    AppointmentStatus.COMPLETED: {AppointmentStatus.COMPLETED},
    AppointmentStatus.CANCELLED: {AppointmentStatus.CANCELLED},
}


class AppointmentService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = AppointmentRepository(session)
        self.patients = PatientRepository(session)
        self.doctors = DoctorRepository(session)
        self.availability = AvailabilityRepository(session)
        self.settings = get_settings()

    def list(
        self, page: int, page_size: int, status: AppointmentStatus | None, from_date: date | None, to_date: date | None
    ) -> PaginatedResponse[AppointmentRead]:
        if from_date and to_date and from_date > to_date:
            raise BusinessRuleError("from_date must be on or before to_date.")
        items, total = self.repository.list(page, page_size, status, from_date, to_date)
        return PaginatedResponse(items=items, page=page, page_size=page_size, total=total, total_pages=math.ceil(total / page_size))

    def get(self, appointment_id: uuid.UUID, *, for_update: bool = False):
        appointment = self.repository.get(appointment_id, for_update=for_update)
        if not appointment:
            raise NotFoundError("Appointment not found.")
        return appointment

    def _validate_references(self, payload: AppointmentCreate | AppointmentUpdate) -> None:
        if not self.patients.get(payload.patient_id):
            raise NotFoundError("Selected patient does not exist.")
        doctor = self.doctors.get(payload.doctor_id)
        if not doctor:
            raise NotFoundError("Selected doctor does not exist.")
        if not doctor.is_available and payload.status != AppointmentStatus.CANCELLED:
            raise ConflictError("Selected doctor is currently unavailable.")
        if not self.settings.min_appointment_duration <= payload.duration_minutes <= self.settings.max_appointment_duration:
            raise BusinessRuleError(
                f"Duration must be between {self.settings.min_appointment_duration} and {self.settings.max_appointment_duration} minutes."
            )

    def _check_overlap(
        self,
        payload: AppointmentCreate | AppointmentUpdate | AppointmentDetails,
        exclude_id: uuid.UUID | None = None,
    ) -> None:
        if payload.status in TERMINAL_STATUSES:
            return
        self.repository.lock_doctor_schedule(payload.doctor_id)
        end = payload.scheduled_at + timedelta(minutes=payload.duration_minutes)
        local_tz = ZoneInfo(self.settings.clinic_timezone)
        local_start = payload.scheduled_at.astimezone(local_tz)
        local_end = end.astimezone(local_tz)
        if local_start.date() != local_end.date():
            raise ConflictError("Appointments must fit within one clinic working day.")
        working_hours = self.availability.list_working_hours(payload.doctor_id)
        within_working_hours = any(
            entry.day_of_week == local_start.weekday()
            and entry.start_time <= local_start.time().replace(tzinfo=None)
            and entry.end_time >= local_end.time().replace(tzinfo=None)
            for entry in working_hours
        )
        if not within_working_hours:
            raise ConflictError("The appointment is outside the doctor's working hours.")
        if self.availability.find_time_off_overlap(payload.doctor_id, payload.scheduled_at, end):
            raise ConflictError("The doctor is unavailable during the requested time.")
        if self.repository.find_overlap(payload.doctor_id, payload.scheduled_at, payload.duration_minutes, exclude_id):
            raise ConflictError("The doctor already has an active appointment during this time.")

    def create(self, payload: AppointmentCreate):
        if payload.scheduled_at <= datetime.now(timezone.utc):
            raise BusinessRuleError("Appointments must be scheduled in the future.")
        self._validate_references(payload)
        self._check_overlap(payload)
        try:
            appointment = self.repository.create(**payload.model_dump())
            self.session.commit()
            return self.get(appointment.id)
        except IntegrityError as exc:
            self.session.rollback()
            raise ConflictError("The appointment conflicts with an existing booking.") from exc

    def create_with_new_patient(self, payload: AppointmentWithNewPatientCreate):
        if payload.appointment.scheduled_at <= datetime.now(timezone.utc):
            raise BusinessRuleError("Appointments must be scheduled in the future.")
        try:
            patient = self.patients.create(**payload.patient.model_dump())
            appointment_payload = AppointmentCreate(
                patient_id=patient.id,
                **payload.appointment.model_dump(),
            )
            self._validate_references(appointment_payload)
            self._check_overlap(appointment_payload)
            appointment = self.repository.create(**appointment_payload.model_dump())
            self.session.commit()
            return self.get(appointment.id)
        except IntegrityError as exc:
            self.session.rollback()
            raise ConflictError("The appointment conflicts with an existing booking.") from exc
        except Exception:
            # Patient registration and appointment creation form one transaction.
            self.session.rollback()
            raise

    def update(self, appointment_id: uuid.UUID, payload: AppointmentUpdate):
        appointment = self.get(appointment_id, for_update=True)
        if appointment.status in TERMINAL_STATUSES:
            raise ConflictError(f"{appointment.status.value.title()} appointments cannot be modified.")
        if payload.status not in ALLOWED_TRANSITIONS[appointment.status]:
            raise ConflictError(f"Cannot change status from {appointment.status.value} to {payload.status.value}.")
        if payload.status == AppointmentStatus.COMPLETED and payload.scheduled_at > datetime.now(timezone.utc):
            raise BusinessRuleError("A future appointment cannot be marked completed.")
        self._validate_references(payload)
        self._check_overlap(payload, appointment_id)
        for key, value in payload.model_dump().items():
            setattr(appointment, key, value)
        try:
            self.session.commit()
            return self.get(appointment_id)
        except IntegrityError as exc:
            self.session.rollback()
            raise ConflictError("The appointment conflicts with an existing booking.") from exc

    def delete(self, appointment_id: uuid.UUID) -> None:
        appointment = self.get(appointment_id, for_update=True)
        if appointment.status == AppointmentStatus.COMPLETED:
            raise ConflictError("Completed appointments are retained as history.")
        if appointment.status != AppointmentStatus.CANCELLED:
            appointment.status = AppointmentStatus.CANCELLED
            self.session.commit()
