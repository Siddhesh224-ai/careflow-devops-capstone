"""Add users, doctor working hours, and doctor time off.

Revision ID: 20261012_0002
Revises: 20261011_0001
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20261012_0002"
down_revision: str | None = "20261011_0001"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

user_role = postgresql.ENUM("ADMIN", "DOCTOR", name="user_role", create_type=False)


def upgrade() -> None:
    user_role.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("username", sa.String(80), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("doctor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctors.id"], name="fk_users_doctor_id_doctors", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("doctor_id", name="uq_users_doctor_id"),
        sa.UniqueConstraint("username", name="uq_users_username"),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)
    op.create_index("ix_users_role", "users", ["role"])

    op.create_table(
        "doctor_working_hours",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("doctor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.CheckConstraint("day_of_week BETWEEN 0 AND 6", name="ck_doctor_working_hours_valid_weekday"),
        sa.CheckConstraint("start_time < end_time", name="ck_doctor_working_hours_valid_time_range"),
        sa.ForeignKeyConstraint(
            ["doctor_id"], ["doctors.id"], name="fk_doctor_working_hours_doctor_id_doctors", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_doctor_working_hours"),
        sa.UniqueConstraint(
            "doctor_id", "day_of_week", "start_time", "end_time", name="uq_doctor_working_window"
        ),
    )
    op.create_index("ix_doctor_working_hours_doctor_id", "doctor_working_hours", ["doctor_id"])

    op.create_table(
        "doctor_time_off",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("doctor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.String(250), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("end_at > start_at", name="ck_doctor_time_off_valid_time_off_range"),
        sa.ForeignKeyConstraint(
            ["doctor_id"], ["doctors.id"], name="fk_doctor_time_off_doctor_id_doctors", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_doctor_time_off"),
    )
    op.create_index("ix_doctor_time_off_doctor_id", "doctor_time_off", ["doctor_id"])
    op.create_index("ix_doctor_time_off_start_at", "doctor_time_off", ["start_at"])
    op.create_index("ix_doctor_time_off_end_at", "doctor_time_off", ["end_at"])


def downgrade() -> None:
    op.drop_table("doctor_time_off")
    op.drop_table("doctor_working_hours")
    op.drop_table("users")
    user_role.drop(op.get_bind(), checkfirst=True)
