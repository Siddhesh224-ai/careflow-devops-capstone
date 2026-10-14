def test_doctor_crud(client, sample_doctor):
    created = client.post("/api/v1/doctors", json=sample_doctor)
    assert created.status_code == 201
    doctor_id = created.json()["id"]
    login = client.post("/api/v1/auth/login", json={"username": sample_doctor["username"], "password": sample_doctor["password"]})
    assert login.status_code == 200
    doctor_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    dashboard = client.get("/api/v1/doctor/dashboard", headers=doctor_headers)
    assert dashboard.status_code == 200
    assert dashboard.json()["doctor"]["id"] == doctor_id
    assert client.get(f"/api/v1/doctors/{doctor_id}").status_code == 200
    changed = {key: value for key, value in sample_doctor.items() if key not in {"username", "password", "working_hours"}}
    changed["specialization"] = "Cardiology"
    assert client.put(f"/api/v1/doctors/{doctor_id}", json=changed).json()["specialization"] == "Cardiology"
    assert client.delete(f"/api/v1/doctors/{doctor_id}").status_code == 204
