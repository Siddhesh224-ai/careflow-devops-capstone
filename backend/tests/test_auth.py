def test_protected_routes_require_admin(client):
    original = client.headers.pop("Authorization")
    try:
        assert client.get("/api/v1/patients").status_code == 401
    finally:
        client.headers["Authorization"] = original


def test_admin_login_expires_in_two_days(client):
    before_login = datetime.now(timezone.utc)
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "test-admin", "password": "test-admin-password"},
    )
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "ADMIN"
    expires_at = datetime.fromisoformat(response.json()["expires_at"])
    assert before_login + timedelta(hours=47, minutes=59) < expires_at
    assert expires_at < before_login + timedelta(hours=48, minutes=1)
from datetime import datetime, timedelta, timezone

