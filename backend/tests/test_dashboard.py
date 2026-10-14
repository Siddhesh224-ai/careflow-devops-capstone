def test_empty_dashboard(client):
    response = client.get("/api/v1/dashboard/summary")
    assert response.status_code == 200
    body = response.json()
    assert body["total_patients"] == 0
    assert body["total_doctors"] == 0
    assert body["todays_appointments"] == []
