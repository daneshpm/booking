from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    DEV_MOCK_HASH,
)
from main import app

client = TestClient(app)

# ----------------------------------------------------
# 1. UNIT TESTS: BCRYPT & JWT
# ----------------------------------------------------

def test_password_hashing_and_verification():
    raw_pass = "RoomanSecure2026!"
    hashed = hash_password(raw_pass)
    assert hashed != raw_pass
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("WrongPassword123", hashed) is False

def test_dev_seed_password_verification():
    # Seeds accept designated dev passwords and reject incorrect ones
    assert verify_password("password123", DEV_MOCK_HASH) is True
    assert verify_password("wrong_password", DEV_MOCK_HASH) is False

def test_jwt_token_flow():
    payload = {"sub": "usr_rooman_test_123", "email": "test@rooman.com"}
    token = create_access_token(payload)
    decoded = decode_access_token(token)
    assert decoded["sub"] == "usr_rooman_test_123"
    assert decoded["email"] == "test@rooman.com"

# ----------------------------------------------------
# 2. INTEGRATION TESTS: FASTAPI ENDPOINTS
# ----------------------------------------------------

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "rooman-bookings-api"

def test_services_catalog_endpoint():
    response = client.get("/api/services?workspaceSlug=rooman-technologies")
    assert response.status_code == 200
    services = response.json()
    assert isinstance(services, list)
    assert len(services) > 0
    first = services[0]
    assert "name" in first
    assert "slug" in first
    assert "durationMinutes" in first

def test_availability_calculation():
    target_date = "2026-09-15"
    response = client.get(
        f"/api/availability?workspaceSlug=rooman-technologies&serviceSlug=career-guidance&date={target_date}&timezone=Asia/Kolkata"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["date"] == target_date
    assert data["timezone"] == "Asia/Kolkata"
    assert len(data["slots"]) > 0
    assert "startTime" in data["slots"][0]
    assert "displayTime" in data["slots"][0]

def test_login_seeded_faculty():
    response = client.post(
        "/api/auth/login",
        json={"email": "danesh@rooman.com", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "danesh@rooman.com"

def test_login_invalid_password():
    response = client.post(
        "/api/auth/login",
        json={"email": "danesh@rooman.com", "password": "this-is-wrong-password"}
    )
    assert response.status_code == 401

def test_authenticated_me_route():
    # 1. Login to get token
    login_res = client.post(
        "/api/auth/login",
        json={"email": "danesh@rooman.com", "password": "password123"}
    )
    token = login_res.json()["access_token"]

    # 2. Access /api/auth/me with Bearer token
    me_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["user"]["email"] == "danesh@rooman.com"

def test_booking_creation_and_double_booking_prevention():
    # Distinct future time slot for testing collision check
    start_dt = datetime(2026, 10, 20, 10, 0, 0, tzinfo=timezone.utc)
    end_dt = datetime(2026, 10, 20, 10, 30, 0, tzinfo=timezone.utc)

    booking_payload = {
        "workspaceSlug": "rooman-technologies",
        "serviceSlug": "career-guidance",
        "startTime": start_dt.isoformat(),
        "endTime": end_dt.isoformat(),
        "customerName": "Ravi Shankar",
        "customerEmail": "ravi.shankar@student.rooman.net",
        "customerPhone": "+91 98765 43210",
        "customerTimezone": "Asia/Kolkata",
        "notes": "Testing collision check",
    }

    # 1. First booking attempt should succeed
    res1 = client.post("/api/bookings", json=booking_payload)
    assert res1.status_code in (201, 409)  # May already be booked if rerun

    if res1.status_code == 201:
        data1 = res1.json()
        assert data1["status"] == "CONFIRMED"
        assert "meet.google.com" in data1["meetingLink"]

        # 2. Immediate second booking at identical/overlapping time MUST return 409 Conflict!
        res2 = client.post("/api/bookings", json=booking_payload)
        assert res2.status_code == 409
        assert "Double-booking conflict" in res2.json()["detail"]

def test_register_new_user_and_workspace():
    unique_email = f"lead.{int(datetime.now().timestamp())}@rooman.tech"
    reg_payload = {
        "email": unique_email,
        "password": "SecurePassword2026!",
        "name": "Rooman Instructor",
        "workspaceName": "Rooman Cyber Academy",
    }
    response = client.post("/api/auth/register", json=reg_payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == unique_email
    assert data["workspace"]["name"] == "Rooman Cyber Academy"

