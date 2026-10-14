def test_patient_crud_search_and_pagination(client, sample_patient):
    created = client.post("/api/v1/patients", json=sample_patient)
    assert created.status_code == 201
    patient_id = created.json()["id"]

    fetched = client.get(f"/api/v1/patients/{patient_id}")
    assert fetched.status_code == 200
    assert fetched.json()["full_name"] == "Test Patient"

    listing = client.get("/api/v1/patients", params={"search": "Test", "page": 1, "page_size": 10})
    assert listing.status_code == 200
    assert listing.json()["total"] == 1
    assert listing.json()["total_pages"] == 1

    history = client.get(f"/api/v1/patients/{patient_id}/appointments")
    assert history.status_code == 200
    assert history.json() == []

    changed = {**sample_patient, "full_name": "Updated Patient"}
    updated = client.put(f"/api/v1/patients/{patient_id}", json=changed)
    assert updated.status_code == 200
    assert updated.json()["full_name"] == "Updated Patient"

    deleted = client.delete(f"/api/v1/patients/{patient_id}")
    assert deleted.status_code == 204
    assert client.get(f"/api/v1/patients/{patient_id}").status_code == 404


def test_patient_validation_and_missing(client, sample_patient):
    invalid = {**sample_patient, "date_of_birth": "2999-01-01"}
    assert client.post("/api/v1/patients", json=invalid).status_code == 422
    assert client.get("/api/v1/patients/00000000-0000-0000-0000-000000000000").status_code == 404
