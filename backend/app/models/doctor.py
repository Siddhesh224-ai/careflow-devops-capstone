import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.appointment import Appointment
    from app.models.availability import DoctorTimeOff, DoctorWorkingHours
    from app.models.user import User


class Doctor(TimestampMixin, Base):
    __tablename__ = "doctors"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    specialization: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(254))
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    appointments: Mapped[list["Appointment"]] = relationship(back_populates="doctor")
    working_hours: Mapped[list["DoctorWorkingHours"]] = relationship(
        back_populates="doctor", cascade="all, delete-orphan", order_by="DoctorWorkingHours.day_of_week"
    )
    time_off: Mapped[list["DoctorTimeOff"]] = relationship(
        back_populates="doctor", cascade="all, delete-orphan"
    )
    user: Mapped["User | None"] = relationship(back_populates="doctor", cascade="all, delete-orphan", uselist=False)
