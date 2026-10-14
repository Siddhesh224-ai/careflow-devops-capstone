import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, ConflictError, NotFoundError
from app.models.appointment import AppointmentStatus
from app.repositories.appointment_repository import AppointmentRepository
from app.repositories.availability_repository import AvailabilityRepository
from app.repositories.doctor_repository import DoctorRepository
from app.schemas.availability import TimeOffCreate, WorkingHoursUpdate
from app.schemas.doctor_portal import DoctorDashboard


class DoctorPortalService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.appointments = AppointmentRepository(session)
        self.availability = AvailabilityRepository(session)
        self.doctors = DoctorRepository(session)

    def dashboard(self, doctor_id: uuid.UUID) -> DoctorDashboard:
        doctor = self.doctors.get(doctor_id)
        if not doctor:
            raise NotFoundError("Doctor profile not found.")
        return DoctorDashboard(
            doctor=doctor,
            appointments=self.appointments.list_for_doctor(doctor_id),
            working_hours=self.availability.list_working_hours(doctor_id),
            time_off=self.availability.list_time_off(doctor_id),
        )

    def replace_working_hours(self, doctor_id: uuid.UUID, payload: WorkingHoursUpdate):
        if not self.doctors.get(doctor_id):
            raise NotFoundError("Doctor profile not found.")
        hours = self.availability.replace_working_hours(doctor_id, payload.entries)
        self.session.commit()
        return hours

    def create_time_off(self, doctor_id: uuid.UUID, payload: TimeOffCreate):
        if payload.end_at <= datetime.now(timezone.utc):
            raise BusinessRuleError("Time off must end in the future.")
        self.appointments.lock_doctor_schedule(doctor_id)
        if self.availability.find_time_off_overlap(doctor_id, payload.start_at, payload.end_at):
            raise ConflictError("This time-off period overlaps an existing time-off period.")
        if self.appointments.find_active_overlap(doctor_id, payload.start_at, payload.end_at):
            raise ConflictError("Cancel or reschedule the overlapping appointment before adding time off.")
        item = self.availability.create_time_off(doctor_id, payload)
        self.session.commit()
        return item

    def delete_time_off(self, doctor_id: uuid.UUID, time_off_id: uuid.UUID) -> None:
        item = self.availability.get_time_off(time_off_id)
        if not item or item.doctor_id != doctor_id:
            raise NotFoundError("Time-off period not found.")
        self.session.delete(item)
        self.session.commit()

    def complete_appointment(self, doctor_id: uuid.UUID, appointment_id: uuid.UUID):
        appointment = self.appointments.get(appointment_id, for_update=True)
        if not appointment or appointment.doctor_id != doctor_id:
            raise NotFoundError("Appointment not found.")
        if appointment.status not in {AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED}:
            raise ConflictError("Only active appointments can be marked complete.")
        if appointment.scheduled_at > datetime.now(timezone.utc):
            raise BusinessRuleError("A future appointment cannot be marked complete.")
        appointment.status = AppointmentStatus.COMPLETED
        self.session.commit()
        return self.appointments.get(appointment_id)
