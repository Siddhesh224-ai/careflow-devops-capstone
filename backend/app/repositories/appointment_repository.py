from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import and_, func, select, text
from sqlalchemy.orm import Session, joinedload

from app.models.appointment import Appointment, AppointmentStatus
from app.core.config import get_settings


class AppointmentRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, appointment_id: uuid.UUID, *, for_update: bool = False) -> Appointment | None:
        statement = select(Appointment).where(Appointment.id == appointment_id)
        if for_update:
            statement = statement.with_for_update()
        else:
            statement = statement.options(joinedload(Appointment.patient), joinedload(Appointment.doctor))
        return self.session.scalar(statement)

    def list(
        self,
        page: int,
        page_size: int,
        status: AppointmentStatus | None,
        from_date: date | None,
        to_date: date | None,
    ) -> tuple[list[Appointment], int]:
        filters = []
        if status:
            filters.append(Appointment.status == status)
        if from_date:
            filters.append(Appointment.scheduled_at >= datetime.combine(from_date, datetime.min.time(), tzinfo=ZoneInfo(get_settings().clinic_timezone)))
        if to_date:
            filters.append(Appointment.scheduled_at < datetime.combine(to_date + timedelta(days=1), datetime.min.time(), tzinfo=ZoneInfo(get_settings().clinic_timezone)))
        total = self.session.scalar(select(func.count(Appointment.id)).where(*filters)) or 0
        statement = (
            select(Appointment)
            .options(joinedload(Appointment.patient), joinedload(Appointment.doctor))
            .where(*filters)
            .order_by(Appointment.scheduled_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(self.session.scalars(statement).unique()), total

    def create(self, **values: object) -> Appointment:
        appointment = Appointment(**values)
        self.session.add(appointment)
        self.session.flush()
        return appointment

    def lock_doctor_schedule(self, doctor_id: uuid.UUID) -> None:
        # A transaction-scoped advisory lock serializes scheduling per doctor.
        self.session.execute(text("SELECT pg_advisory_xact_lock(hashtext(:doctor_id))"), {"doctor_id": str(doctor_id)})

    def find_overlap(
        self,
        doctor_id: uuid.UUID,
        start: datetime,
        duration: int,
        exclude_id: uuid.UUID | None = None,
    ) -> Appointment | None:
        end = start + timedelta(minutes=duration)
        filters = [
            Appointment.doctor_id == doctor_id,
            Appointment.status.in_([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]),
            Appointment.scheduled_at < end,
            Appointment.scheduled_end_at > start,
        ]
        if exclude_id:
            filters.append(Appointment.id != exclude_id)
        return self.session.scalar(select(Appointment).where(and_(*filters)).limit(1))

    def list_for_doctor(self, doctor_id: uuid.UUID) -> list[Appointment]:
        return list(
            self.session.scalars(
                select(Appointment)
                .options(joinedload(Appointment.patient), joinedload(Appointment.doctor))
                .where(Appointment.doctor_id == doctor_id)
                .order_by(Appointment.scheduled_at.desc())
                .limit(500)
            ).unique()
        )

    def list_for_patient(self, patient_id: uuid.UUID) -> list[Appointment]:
        return list(
            self.session.scalars(
                select(Appointment)
                .options(joinedload(Appointment.patient), joinedload(Appointment.doctor))
                .where(Appointment.patient_id == patient_id)
                .order_by(Appointment.scheduled_at.desc())
                .limit(500)
            ).unique()
        )

    def find_active_overlap(self, doctor_id: uuid.UUID, start_at: datetime, end_at: datetime) -> Appointment | None:
        return self.session.scalar(
            select(Appointment)
            .where(
                Appointment.doctor_id == doctor_id,
                Appointment.status.in_([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]),
                Appointment.scheduled_at < end_at,
                Appointment.scheduled_end_at > start_at,
            )
            .limit(1)
        )
