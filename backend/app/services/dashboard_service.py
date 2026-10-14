from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.models import Appointment, AppointmentStatus, Doctor, Patient
from app.schemas.dashboard import DashboardSummary, StatusCount


class DashboardService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def summary(self) -> DashboardSummary:
        settings = get_settings()
        local_tz = ZoneInfo(settings.clinic_timezone)
        now = datetime.now(timezone.utc)
        local_date = now.astimezone(local_tz).date()
        day_start = datetime.combine(local_date, datetime.min.time(), tzinfo=local_tz).astimezone(timezone.utc)
        day_end = datetime.combine(local_date, datetime.max.time(), tzinfo=local_tz).astimezone(timezone.utc)
        active = [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]

        total_patients = self.session.scalar(select(func.count(Patient.id))) or 0
        total_doctors = self.session.scalar(select(func.count(Doctor.id))) or 0
        appointments_today = self.session.scalar(
            select(func.count(Appointment.id)).where(
                Appointment.scheduled_at.between(day_start, day_end), Appointment.status.in_(active)
            )
        ) or 0
        upcoming = self.session.scalar(
            select(func.count(Appointment.id)).where(Appointment.scheduled_at >= now, Appointment.status.in_(active))
        ) or 0
        grouped = dict(self.session.execute(select(Appointment.status, func.count(Appointment.id)).group_by(Appointment.status)).all())
        status_distribution = [StatusCount(status=status, count=grouped.get(status, 0)) for status in AppointmentStatus]
        todays = list(
            self.session.scalars(
                select(Appointment)
                .options(joinedload(Appointment.patient), joinedload(Appointment.doctor))
                .where(Appointment.scheduled_at.between(day_start, day_end))
                .order_by(Appointment.scheduled_at)
                .limit(10)
            ).unique()
        )
        recent = list(self.session.scalars(select(Patient).order_by(Patient.created_at.desc()).limit(5)))
        return DashboardSummary(
            local_date=local_date,
            total_patients=total_patients,
            total_doctors=total_doctors,
            appointments_today=appointments_today,
            upcoming_appointments=upcoming,
            status_distribution=status_distribution,
            todays_appointments=todays,
            recent_patients=recent,
        )
