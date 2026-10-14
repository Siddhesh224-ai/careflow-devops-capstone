import uuid
from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.availability import DoctorTimeOff, DoctorWorkingHours
from app.schemas.availability import TimeOffCreate, WorkingHoursEntry


class AvailabilityRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_working_hours(self, doctor_id: uuid.UUID) -> list[DoctorWorkingHours]:
        return list(
            self.session.scalars(
                select(DoctorWorkingHours)
                .where(DoctorWorkingHours.doctor_id == doctor_id)
                .order_by(DoctorWorkingHours.day_of_week, DoctorWorkingHours.start_time)
            )
        )

    def replace_working_hours(
        self, doctor_id: uuid.UUID, entries: list[WorkingHoursEntry]
    ) -> list[DoctorWorkingHours]:
        self.session.execute(delete(DoctorWorkingHours).where(DoctorWorkingHours.doctor_id == doctor_id))
        hours = [DoctorWorkingHours(doctor_id=doctor_id, **entry.model_dump()) for entry in entries]
        self.session.add_all(hours)
        self.session.flush()
        return hours

    def list_time_off(self, doctor_id: uuid.UUID) -> list[DoctorTimeOff]:
        return list(
            self.session.scalars(
                select(DoctorTimeOff)
                .where(DoctorTimeOff.doctor_id == doctor_id)
                .order_by(DoctorTimeOff.start_at)
            )
        )

    def get_time_off(self, time_off_id: uuid.UUID) -> DoctorTimeOff | None:
        return self.session.get(DoctorTimeOff, time_off_id)

    def create_time_off(self, doctor_id: uuid.UUID, payload: TimeOffCreate) -> DoctorTimeOff:
        item = DoctorTimeOff(doctor_id=doctor_id, **payload.model_dump())
        self.session.add(item)
        self.session.flush()
        return item

    def find_time_off_overlap(
        self, doctor_id: uuid.UUID, start_at: datetime, end_at: datetime
    ) -> DoctorTimeOff | None:
        return self.session.scalar(
            select(DoctorTimeOff)
            .where(
                DoctorTimeOff.doctor_id == doctor_id,
                DoctorTimeOff.start_at < end_at,
                DoctorTimeOff.end_at > start_at,
            )
            .limit(1)
        )
