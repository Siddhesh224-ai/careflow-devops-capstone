"""Deterministic, idempotent development seed data.

All people and contact details in this module are synthetic.
"""

import uuid
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Appointment, AppointmentStatus, Doctor, DoctorWorkingHours, Patient, User, UserRole

NAMESPACE = uuid.UUID("9ccb8283-8e81-4496-b235-92746325dd0a")

DOCTOR_SPECS = [
    ("doctor-kapoor", "Dr. Neha Kapoor", "General Medicine", "doctor.kapoor"),
    ("doctor-rao", "Dr. Vikram Rao", "Cardiology", "doctor.rao"),
    ("doctor-mehta", "Dr. Arjun Mehta", "Dermatology", "doctor.mehta"),
    ("doctor-iyer", "Dr. Priya Iyer", "Pediatrics", "doctor.iyer"),
    ("doctor-shah", "Dr. Kavita Shah", "Gynecology", "doctor.shah"),
    ("doctor-patel", "Dr. Rohan Patel", "Orthopedics", "doctor.patel"),
    ("doctor-singh", "Dr. Simran Singh", "Neurology", "doctor.singh"),
    ("doctor-desai", "Dr. Aman Desai", "Ophthalmology", "doctor.desai"),
    ("doctor-reddy", "Dr. Nisha Reddy", "ENT", "doctor.reddy"),
    ("doctor-nair", "Dr. Kiran Nair", "Psychiatry", "doctor.nair"),
    ("doctor-joshi", "Dr. Meera Joshi", "Endocrinology", "doctor.joshi"),
    ("doctor-khan", "Dr. Farhan Khan", "Pulmonology", "doctor.khan"),
]

PATIENT_FIRST_NAMES = [
    "Aarav",
    "Aditi",
    "Arjun",
    "Diya",
    "Ishaan",
    "Kavya",
    "Meera",
    "Neel",
    "Riya",
    "Vihaan",
]
PATIENT_LAST_NAMES = ["Deshmukh", "Gupta", "Kulkarni", "Nair", "Patel"]
PATIENT_CITIES = [
    "Mumbai, Maharashtra",
    "Pune, Maharashtra",
    "Bengaluru, Karnataka",
    "Ahmedabad, Gujarat",
    "Hyderabad, Telangana",
]
PATIENT_GENDERS = ["Male", "Female", "Other"]
CLINIC_TIMEZONE = ZoneInfo("Asia/Kolkata")


def stable_id(name: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE, name)


def build_patients() -> list[Patient]:
    patients: list[Patient] = []
    for index in range(50):
        number = index + 1
        first_name = PATIENT_FIRST_NAMES[index % len(PATIENT_FIRST_NAMES)]
        last_name = PATIENT_LAST_NAMES[(index // len(PATIENT_FIRST_NAMES)) % len(PATIENT_LAST_NAMES)]
        patients.append(
            Patient(
                id=stable_id(f"patient-demo-{number:03d}"),
                full_name=f"{first_name} {last_name}",
                date_of_birth=date(1965 + (index * 7) % 40, index % 12 + 1, index % 27 + 1),
                gender=PATIENT_GENDERS[index % len(PATIENT_GENDERS)],
                phone_number=f"+91 90000 1{number:04d}",
                email=f"patient{number:03d}@example.com",
                address=PATIENT_CITIES[index % len(PATIENT_CITIES)],
            )
        )
    return patients


def build_doctors() -> list[Doctor]:
    return [
        Doctor(
            id=stable_id(slug),
            full_name=full_name,
            specialization=specialization,
            phone_number=f"+91 90000 2{index:04d}",
            email=f"{username}@example.com",
            is_available=True,
        )
        for index, (slug, full_name, specialization, username) in enumerate(DOCTOR_SPECS, start=1)
    ]


def upcoming_weekdays(count: int) -> list[date]:
    current = datetime.now(CLINIC_TIMEZONE).date() + timedelta(days=1)
    weekdays: list[date] = []
    while len(weekdays) < count:
        if current.weekday() < 5:
            weekdays.append(current)
        current += timedelta(days=1)
    return weekdays


def clinic_datetime(day: date, hour: int, minute: int = 0) -> datetime:
    return datetime.combine(day, time(hour, minute), tzinfo=CLINIC_TIMEZONE).astimezone(timezone.utc)


def seed(session: Session) -> None:
    patients = build_patients()
    doctors = build_doctors()
    for entity in [*patients, *doctors]:
        session.merge(entity)
    session.flush()
    working_hours = [
        DoctorWorkingHours(
            id=stable_id(f"hours-{doctor.id}-{day}"),
            doctor_id=doctor.id,
            day_of_week=day,
            start_time=datetime.strptime("09:00", "%H:%M").time(),
            end_time=datetime.strptime("17:00", "%H:%M").time(),
        )
        for doctor in doctors
        for day in range(5)
    ]
    usernames = [username for _, _, _, username in DOCTOR_SPECS]
    existing_users = {
        user.username: user for user in session.scalars(select(User).where(User.username.in_(usernames)))
    }
    doctor_users = []
    for doctor, (slug, _, _, username) in zip(doctors, DOCTOR_SPECS, strict=True):
        existing_user = existing_users.get(username)
        doctor_users.append(
            User(
                id=existing_user.id if existing_user else stable_id(f"user-{slug}"),
                username=username,
                password_hash=existing_user.password_hash if existing_user else hash_password("Doctor123!"),
                role=UserRole.DOCTOR,
                doctor_id=doctor.id,
                is_active=True,
            )
        )
    for entity in [*working_hours, *doctor_users]:
        session.merge(entity)
    session.flush()
    weekdays = upcoming_weekdays(5)
    appointments = [
        Appointment(id=stable_id("appointment-one"), patient_id=patients[0].id, doctor_id=doctors[0].id, scheduled_at=clinic_datetime(weekdays[0], 10, 0), duration_minutes=30, reason="Routine consultation", status=AppointmentStatus.CONFIRMED),
        Appointment(id=stable_id("appointment-two"), patient_id=patients[1].id, doctor_id=doctors[1].id, scheduled_at=clinic_datetime(weekdays[0], 11, 30), duration_minutes=45, reason="Follow-up consultation", status=AppointmentStatus.SCHEDULED),
        Appointment(id=stable_id("appointment-three"), patient_id=patients[7].id, doctor_id=doctors[2].id, scheduled_at=clinic_datetime(weekdays[1], 14, 0), duration_minutes=30, reason="Skin allergy assessment", status=AppointmentStatus.CONFIRMED),
        Appointment(id=stable_id("appointment-four"), patient_id=patients[18].id, doctor_id=doctors[3].id, scheduled_at=clinic_datetime(weekdays[2], 9, 30), duration_minutes=45, reason="Pediatric wellness consultation", status=AppointmentStatus.SCHEDULED),
        Appointment(id=stable_id("appointment-five"), patient_id=patients[31].id, doctor_id=doctors[6].id, scheduled_at=clinic_datetime(weekdays[3], 15, 15), duration_minutes=30, reason="Neurology follow-up", status=AppointmentStatus.CONFIRMED),
        Appointment(id=stable_id("appointment-six"), patient_id=patients[44].id, doctor_id=doctors[9].id, scheduled_at=clinic_datetime(weekdays[4], 12, 0), duration_minutes=60, reason="Mental health consultation", status=AppointmentStatus.SCHEDULED),
    ]
    for entity in appointments:
        session.merge(entity)
    session.commit()


def main() -> None:
    with SessionLocal() as session:
        seed(session)
    print(f"CareFlow development data seeded: {len(build_patients())} patients and {len(DOCTOR_SPECS)} doctors.")


if __name__ == "__main__":
    main()
