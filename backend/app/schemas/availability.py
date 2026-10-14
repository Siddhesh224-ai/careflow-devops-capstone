import uuid
from datetime import datetime, time

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.common import ORMModel


class WorkingHoursEntry(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time

    @model_validator(mode="after")
    def validate_range(self):
        if self.start_time >= self.end_time:
            raise ValueError("Working-hours start time must be before end time")
        return self


class WorkingHoursRead(WorkingHoursEntry, ORMModel):
    id: uuid.UUID


class WorkingHoursUpdate(BaseModel):
    entries: list[WorkingHoursEntry] = Field(min_length=1, max_length=21)

    @field_validator("entries")
    @classmethod
    def reject_duplicate_windows(cls, entries: list[WorkingHoursEntry]) -> list[WorkingHoursEntry]:
        keys = {(entry.day_of_week, entry.start_time, entry.end_time) for entry in entries}
        if len(keys) != len(entries):
            raise ValueError("Duplicate working-hours windows are not allowed")
        return entries


class TimeOffCreate(BaseModel):
    start_at: datetime
    end_at: datetime
    reason: str | None = Field(default=None, max_length=250)

    @field_validator("start_at", "end_at")
    @classmethod
    def timestamps_must_be_aware(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Time-off timestamps must include a timezone offset")
        return value

    @model_validator(mode="after")
    def validate_range(self):
        if self.end_at <= self.start_at:
            raise ValueError("Time off must end after it starts")
        return self


class TimeOffRead(TimeOffCreate, ORMModel):
    id: uuid.UUID
    doctor_id: uuid.UUID
    created_at: datetime
