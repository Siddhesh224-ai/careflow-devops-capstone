from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo


def create_references(client, patient, doctor):
    patient_id = client.post("/api/v1/patients", json=patient).json()["id"]
    doctor_id = client.post("/api/v1/doctors", json=doctor).json()["id"]
    return patient_id, doctor_id


def future_clinic_time(days: int, hour: int) -> datetime:
    clinic_tz = ZoneInfo("Asia/Kolkata")
    future_date = datetime.now(clinic_tz).date() + timedelta(days=days)
    return datetime.combine(future_date, time(hour, 0), tzinfo=clinic_tz).astimezone(timezone.utc)


def test_appointment_rules_and_filters(client, sample_patient, sample_doctor):
    patient_id, doctor_id = create_references(client, sample_patient, sample_doctor)
    start = future_clinic_time(2, 10)
    payload = {
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "scheduled_at": start.isoformat(),
        "duration_minutes": 60,
        "reason": "Synthetic consultation",
        "status": "SCHEDULED",
    }
    created = client.post("/api/v1/appointments", json=payload)
    assert created.status_code == 201
    appointment_id = created.json()["id"]

    overlap = {**payload, "scheduled_at": (start + timedelta(minutes=30)).isoformat()}
    assert client.post("/api/v1/appointments", json=overlap).status_code == 409
    adjacent = {**payload, "scheduled_at": (start + timedelta(minutes=60)).isoformat()}
    assert client.post("/api/v1/appointments", json=adjacent).status_code == 201

    listing = client.get("/api/v1/appointments", params={"status": "SCHEDULED"})
    assert listing.status_code == 200
    assert listing.json()["total"] == 2

    confirmed = {**payload, "status": "CONFIRMED"}
    assert client.put(f"/api/v1/appointments/{appointment_id}", json=confirmed).status_code == 200
    assert client.delete(f"/api/v1/appointments/{appointment_id}").status_code == 204
    assert client.put(f"/api/v1/appointments/{appointment_id}", json=confirmed).status_code == 409


def test_rejects_missing_references(client):
    payload = {
        "patient_id": "00000000-0000-0000-0000-000000000001",
        "doctor_id": "00000000-0000-0000-0000-000000000002",
        "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "duration_minutes": 30,
        "reason": "Synthetic consultation",
    }
    assert client.post("/api/v1/appointments", json=payload).status_code == 404


def test_new_patient_and_appointment_are_atomic(client, sample_patient, sample_doctor):
    patient_id, doctor_id = create_references(client, sample_patient, sample_doctor)
    start = future_clinic_time(3, 10)
    existing = client.post(
        "/api/v1/appointments",
        json={
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "scheduled_at": start.isoformat(),
            "duration_minutes": 60,
            "reason": "Existing appointment",
            "status": "SCHEDULED",
        },
    )
    assert existing.status_code == 201

    new_patient = {
        "full_name": "Rolled Back Patient",
        "date_of_birth": "1992-03-04",
        "phone_number": "+91 90000 09999",
        "email": "rollback@example.com",
    }
    conflict = client.post(
        "/api/v1/appointments/with-new-patient",
        json={
            "patient": new_patient,
            "appointment": {
                "doctor_id": doctor_id,
                "scheduled_at": (start + timedelta(minutes=30)).isoformat(),
                "duration_minutes": 30,
                "reason": "Conflicting appointment",
                "status": "SCHEDULED",
            },
        },
    )
    assert conflict.status_code == 409
    rolled_back = client.get("/api/v1/patients", params={"search": "Rolled Back Patient"})
    assert rolled_back.json()["total"] == 0

    success = client.post(
        "/api/v1/appointments/with-new-patient",
        json={
            "patient": {**new_patient, "full_name": "Committed Patient", "email": "committed@example.com"},
            "appointment": {
                "doctor_id": doctor_id,
                "scheduled_at": (start + timedelta(hours=1)).isoformat(),
                "duration_minutes": 30,
                "reason": "Valid adjacent appointment",
                "status": "SCHEDULED",
            },
        },
    )
    assert success.status_code == 201
    assert success.json()["patient"]["full_name"] == "Committed Patient"
    committed = client.get("/api/v1/patients", params={"search": "Committed Patient"})
    assert committed.json()["total"] == 1
