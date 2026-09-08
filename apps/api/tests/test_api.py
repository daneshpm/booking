"""
Database-free tests for the FastAPI service.

Endpoint tests that need real rows live in tests/test_integration.py and run in
CI against a PostgreSQL service container.
"""

from fastapi.testclient import TestClient

from app.auth.security import (
    hash_password,
    verify_password,
    fake_verify_password,
    validate_password_policy,
    generate_session_token,
    hash_session_token,
    MAX_PASSWORD_BYTES,
    MIN_PASSWORD_LENGTH,
)
from main import app

client = TestClient(app)

GOOD_PASSWORD = "Str0ngPassphrase"


# ----------------------------------------------------
# Password policy
# ----------------------------------------------------


def test_policy_accepts_a_compliant_password():
    assert validate_password_policy(GOOD_PASSWORD) == []


def test_policy_requires_a_minimum_length():
    errors = validate_password_policy("Sh0rt")
    assert any(str(MIN_PASSWORD_LENGTH) in e for e in errors)


def test_policy_requires_mixed_case_and_a_digit():
    assert "Password must contain an uppercase letter." in validate_password_policy("alllower1")
    assert "Password must contain a lowercase letter." in validate_password_policy("ALLUPPER1")
    assert "Password must contain a number." in validate_password_policy("NoDigitsHere")


def test_policy_rejects_passwords_longer_than_bcrypt_reads():
    # Past 72 bytes bcrypt ignores the remainder, so two different long
    # passwords would open the same account.
    errors = validate_password_policy("A1" + "a" * MAX_PASSWORD_BYTES)
    assert any("bytes" in e for e in errors)


def test_policy_counts_bytes_not_characters():
    errors = validate_password_policy("Aa1" + "\U0001F600" * 20)
    assert any("bytes" in e for e in errors)


def test_policy_rejects_common_passwords():
    assert any("too common" in e for e in validate_password_policy("Password@123"))


# ----------------------------------------------------
# Hashing
# ----------------------------------------------------


def test_hashing_round_trip():
    hashed = hash_password(GOOD_PASSWORD)
    assert hashed != GOOD_PASSWORD
    assert hashed.startswith("$2")
    assert verify_password(GOOD_PASSWORD, hashed) is True
    assert verify_password("WrongPassphrase1", hashed) is False


def test_hash_is_salted():
    assert hash_password(GOOD_PASSWORD) != hash_password(GOOD_PASSWORD)


def test_hash_rejects_weak_password():
    try:
        hash_password("weak")
    except ValueError:
        return
    raise AssertionError("hash_password should reject a password that fails the policy")


def test_verify_is_false_for_missing_or_malformed_hash():
    assert verify_password(GOOD_PASSWORD, None) is False
    assert verify_password(GOOD_PASSWORD, "") is False
    assert verify_password(GOOD_PASSWORD, "not-a-bcrypt-hash") is False
    assert verify_password("", hash_password(GOOD_PASSWORD)) is False


def test_no_shared_development_password_is_accepted():
    """
    The previous implementation let a fixed list of passwords authenticate any
    account carrying the seeded hash. That is a backdoor, so it must stay gone.
    """
    seeded_hash = "$2a$12$eX4mpleHashedPasswordForDevelopmentOnly1234567890"
    for candidate in ("password123", "rooman123", "admin123", "danesh", "password"):
        assert verify_password(candidate, seeded_hash) is False


def test_decoy_verification_reports_failure():
    assert fake_verify_password() is False


# ----------------------------------------------------
# Session tokens
# ----------------------------------------------------


def test_session_token_is_url_safe_and_unique():
    tokens = {generate_session_token() for _ in range(500)}
    assert len(tokens) == 500
    assert all(c.isalnum() or c in "-_" for token in tokens for c in token)


def test_session_token_hash_is_stable_hex_digest():
    token = generate_session_token()
    digest = hash_session_token(token)
    assert len(digest) == 64
    assert int(digest, 16) >= 0
    assert hash_session_token(token) == digest
    assert token not in digest


# ----------------------------------------------------
# Endpoints reachable without a database
# ----------------------------------------------------


def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "rooman-bookings-api"


def test_protected_route_rejects_anonymous_caller():
    assert client.get("/api/auth/me").status_code == 401


def test_login_rejects_a_malformed_email_before_touching_the_database():
    response = client.post("/api/auth/login", json={"email": "nope", "password": "x"})
    assert response.status_code == 422
