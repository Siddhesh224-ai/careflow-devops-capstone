from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import text


def create_references(client, patient, doctor):
    patient_id = client.post("/api/v1/patients", json=patient).json()["id"]
    doctor_response = client.post("/api/v1/doctors", json=doctor)
    return patient_id, doctor_response.json()["id"]


def login_as_doctor(client, username: str, password: str) -> None:
    response = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    client.headers.update({"Authorization": f"Bearer {response.json()['access_token']}"})


def future_clinic_time(days: int, hour: int) -> datetime:
    clinic_tz = ZoneInfo("Asia/Kolkata")
    target_date = datetime.now(clinic_tz).date() + timedelta(days=days)
    return datetime.combine(target_date, time(hour, 0), tzinfo=clinic_tz).astimezone(timezone.utc)


def test_doctor_can_manage_time_off_and_it_blocks_booking(client, sample_patient, sample_doctor):
    patient_id, doctor_id = create_references(client, sample_patient, sample_doctor)
    login_as_doctor(client, sample_doctor["username"], sample_doctor["password"])

    start = future_clinic_time(3, 10)
    time_off = client.post(
        "/api/v1/doctor/time-off",
        json={
            "start_at": start.isoformat(),
            "end_at": (start + timedelta(hours=2)).isoformat(),
            "reason": "Personal time",
        },
    )
    assert time_off.status_code == 201

    dashboard = client.get("/api/v1/doctor/dashboard")
    assert dashboard.status_code == 200
    assert len(dashboard.json()["time_off"]) == 1

    # Restore the administrator token so the admin can attempt the booking.
    client.headers.pop("Authorization")
    admin_login = client.post(
        "/api/v1/auth/login", json={"username": "test-admin", "password": "test-admin-password"}
    )
    client.headers.update({"Authorization": f"Bearer {admin_login.json()['access_token']}"})
    appointment = client.post(
        "/api/v1/appointments",
        json={
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "scheduled_at": start.isoformat(),
            "duration_minutes": 30,
            "reason": "Should be blocked",
            "status": "SCHEDULED",
        },
    )
    assert appointment.status_code == 409
    assert "unavailable" in appointment.json()["detail"].lower()


def test_doctor_cannot_complete_a_future_appointment(client, sample_patient, sample_doctor):
    patient_id, doctor_id = create_references(client, sample_patient, sample_doctor)
    start = future_clinic_time(4, 11)
    created = client.post(
        "/api/v1/appointments",
        json={
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "scheduled_at": start.isoformat(),
            "duration_minutes": 30,
            "reason": "Future consultation",
            "status": "SCHEDULED",
        },
    )
    assert created.status_code == 201

    login_as_doctor(client, sample_doctor["username"], sample_doctor["password"])
    result = client.patch(f"/api/v1/doctor/appointments/{created.json()['id']}/complete")
    assert result.status_code == 422
    assert "future" in result.json()["detail"].lower()


def test_doctor_can_complete_an_elapsed_appointment(client, migrated_engine, sample_patient, sample_doctor):
    patient_id, doctor_id = create_references(client, sample_patient, sample_doctor)
    start = future_clinic_time(5, 11)
    created = client.post(
        "/api/v1/appointments",
        json={
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "scheduled_at": start.isoformat(),
            "duration_minutes": 30,
            "reason": "Consultation ready to complete",
            "status": "CONFIRMED",
        },
    )
    assert created.status_code == 201
    with migrated_engine.begin() as connection:
        connection.execute(
            text(
                "UPDATE appointments "
                "SET scheduled_at = now() - interval '1 hour', scheduled_end_at = now() - interval '30 minutes' "
                "WHERE id = :appointment_id"
            ),
            {"appointment_id": created.json()["id"]},
        )

    login_as_doctor(client, sample_doctor["username"], sample_doctor["password"])
    result = client.patch(f"/api/v1/doctor/appointments/{created.json()['id']}/complete")
    assert result.status_code == 200
    assert result.json()["status"] == "COMPLETED"
