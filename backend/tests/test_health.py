from fastapi.testclient import TestClient

from app.main import app


def test_health_returns_ok() -> None:
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_metrics_returns_prometheus_output(client):
    health_response = client.get("/health")
    assert health_response.status_code == 200
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests_total" in response.text

