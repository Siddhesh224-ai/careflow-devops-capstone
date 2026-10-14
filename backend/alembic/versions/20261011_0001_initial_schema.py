"""Create CareFlow core schema.

Revision ID: 20261011_0001
Revises: None
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20261011_0001"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

appointment_status = postgresql.ENUM(
    "SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", name="appointment_status", create_type=False
)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")
    appointment_status.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "patients",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=False),
        sa.Column("gender", sa.String(30), nullable=True),
        sa.Column("phone_number", sa.String(30), nullable=False),
        sa.Column("email", sa.String(254), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_patients"),
    )
    op.create_index("ix_patients_full_name", "patients", ["full_name"])
    op.create_table(
        "doctors",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("specialization", sa.String(100), nullable=False),
        sa.Column("phone_number", sa.String(30), nullable=True),
        sa.Column("email", sa.String(254), nullable=True),
        sa.Column("is_available", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_doctors"),
    )
    op.create_index("ix_doctors_full_name", "doctors", ["full_name"])
    op.create_index("ix_doctors_specialization", "doctors", ["specialization"])
    op.create_index("ix_doctors_is_available", "doctors", ["is_available"])
    op.create_table(
        "appointments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("doctor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("scheduled_end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(500), nullable=False),
        sa.Column("status", appointment_status, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("duration_minutes BETWEEN 15 AND 240", name="ck_appointments_duration_bounds"),
        sa.CheckConstraint("scheduled_end_at > scheduled_at", name="ck_appointments_end_after_start"),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctors.id"], name="fk_appointments_doctor_id_doctors", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], name="fk_appointments_patient_id_patients", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name="pk_appointments"),
    )
    op.create_index("ix_appointments_scheduled_at", "appointments", ["scheduled_at"])
    op.create_index("ix_appointments_status", "appointments", ["status"])
    op.create_index("ix_appointments_doctor_id", "appointments", ["doctor_id"])
    op.create_index("ix_appointments_patient_id", "appointments", ["patient_id"])
    op.create_index("ix_appointments_doctor_scheduled", "appointments", ["doctor_id", "scheduled_at"])
    op.create_index("ix_appointments_patient_scheduled", "appointments", ["patient_id", "scheduled_at"])
    op.execute(
        "CREATE FUNCTION careflow_set_appointment_end() RETURNS trigger "
        "LANGUAGE plpgsql AS $$ "
        "BEGIN "
        "NEW.scheduled_end_at := NEW.scheduled_at + make_interval(mins => NEW.duration_minutes); "
        "RETURN NEW; "
        "END; "
        "$$"
    )
    op.execute(
        "CREATE TRIGGER trg_appointments_set_end "
        "BEFORE INSERT OR UPDATE OF scheduled_at, duration_minutes ON appointments "
        "FOR EACH ROW EXECUTE FUNCTION careflow_set_appointment_end()"
    )
    op.execute(
        "ALTER TABLE appointments ADD CONSTRAINT ex_appointments_doctor_no_overlap "
        "EXCLUDE USING gist (doctor_id WITH =, "
        "tstzrange(scheduled_at, scheduled_end_at, '[)') WITH &&) "
        "WHERE (status IN ('SCHEDULED', 'CONFIRMED'))"
    )


def downgrade() -> None:
    op.drop_table("appointments")
    op.execute("DROP FUNCTION careflow_set_appointment_end()")
    op.drop_table("doctors")
    op.drop_table("patients")
    appointment_status.drop(op.get_bind(), checkfirst=True)
