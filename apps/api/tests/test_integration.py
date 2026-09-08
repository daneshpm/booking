"""
Endpoint tests against a real PostgreSQL database.

Skipped automatically when DATABASE_URL is not set, so the fast unit suite still
runs on a machine with no database. CI provides one.

The schema is owned by Prisma, so these tests expect migrations to have been
applied already; they never create tables themselves.
"""

import os
import uuid

import pytest
from fastapi.testclient import TestClient

DATABASE_URL = os.getenv("DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not DATABASE_URL,
    reason="DATABASE_URL is not set; integration tests need a migrated database.",
)

if DATABASE_URL:
    from main import app

    client = TestClient(app)


def unique_email(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}@example.test"


STRONG_PASSWORD = "Str0ngPassphrase"


@pytest.fixture
def registered_user():
    """Register a fresh account and return its credentials and auth payload."""
    email = unique_email("api")
    response = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": STRONG_PASSWORD,
            "name": "Integration User",
            "workspaceName": f"Workspace {uuid.uuid4().hex[:6]}",
        },
    )
    assert response.status_code == 201, response.text
    return {"email": email, "password": STRONG_PASSWORD, "body": response.json()}


# ----------------------------------------------------
# Registration
# ----------------------------------------------------


def test_register_creates_user_workspace_and_session(registered_user):
    body = registered_user["body"]
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == registered_user["email"]
    assert body["workspace"]["slug"]
    assert body["user"]["role"] == "OWNER"


def test_register_rejects_a_weak_password():
    response = client.post(
        "/api/auth/register",
        json={"email": unique_email("weak"), "password": "short", "name": "Weak"},
    )
    assert response.status_code == 400
    assert "at least" in response.json()["detail"]


def test_register_rejects_a_duplicate_email(registered_user):
    response = client.post(
        "/api/auth/register",
        json={
            "email": registered_user["email"],
            "password": STRONG_PASSWORD,
            "name": "Duplicate",
        },
    )
    assert response.status_code == 400


def test_register_allocates_a_distinct_slug_for_the_same_workspace_name():
    name = f"Shared Name {uuid.uuid4().hex[:6]}"
    slugs = []
    for _ in range(2):
        response = client.post(
            "/api/auth/register",
            json={
                "email": unique_email("slug"),
                "password": STRONG_PASSWORD,
                "name": "Slug Test",
                "workspaceName": name,
            },
        )
        assert response.status_code == 201, response.text
        slugs.append(response.json()["workspace"]["slug"])

    assert slugs[0] != slugs[1]


# ----------------------------------------------------
# Login
# ----------------------------------------------------


def test_login_succeeds_with_correct_password(registered_user):
    response = client.post(
        "/api/auth/login",
        json={"email": registered_user["email"], "password": STRONG_PASSWORD},
    )
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_login_rejects_a_wrong_password(registered_user):
    response = client.post(
        "/api/auth/login",
        json={"email": registered_user["email"], "password": "Wr0ngPassphrase"},
    )
    assert response.status_code == 401


def test_login_rejects_an_unknown_account_with_the_same_message(registered_user):
    """
    A different message for "no such user" would let anyone enumerate which
    email addresses have accounts.
    """
    wrong_password = client.post(
        "/api/auth/login",
        json={"email": registered_user["email"], "password": "Wr0ngPassphrase"},
    )
    unknown_user = client.post(
        "/api/auth/login",
        json={"email": unique_email("ghost"), "password": "Wr0ngPassphrase"},
    )

    assert wrong_password.status_code == unknown_user.status_code == 401
    assert wrong_password.json()["detail"] == unknown_user.json()["detail"]


def test_login_rejects_the_old_seeded_development_password(registered_user):
    """The removed backdoor accepted these against any seeded account."""
    for candidate in ("password123", "rooman123", "admin123", "danesh"):
        response = client.post(
            "/api/auth/login",
            json={"email": registered_user["email"], "password": candidate},
        )
        assert response.status_code == 401


# ----------------------------------------------------
# Session handling
# ----------------------------------------------------


def test_me_returns_the_caller_profile(registered_user):
    token = registered_user["body"]["access_token"]
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200

    body = response.json()
    assert body["user"]["email"] == registered_user["email"]
    assert len(body["workspaces"]) == 1


def test_me_rejects_a_forged_token():
    response = client.get(
        "/api/auth/me", headers={"Authorization": "Bearer forged-token-value"}
    )
    assert response.status_code == 401


def test_me_accepts_the_session_cookie(registered_user):
    token = registered_user["body"]["access_token"]
    response = client.get("/api/auth/me", cookies={"rb_session": token})
    assert response.status_code == 200


def test_a_session_never_exposes_another_tenant_workspace(registered_user):
    other = client.post(
        "/api/auth/register",
        json={
            "email": unique_email("other"),
            "password": STRONG_PASSWORD,
            "name": "Other Tenant",
            "workspaceName": f"Other {uuid.uuid4().hex[:6]}",
        },
    )
    assert other.status_code == 201
    other_workspace_id = other.json()["workspace"]["id"]

    token = registered_user["body"]["access_token"]
    body = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).json()

    assert other_workspace_id not in [w["id"] for w in body["workspaces"]]


def test_logout_revokes_the_session(registered_user):
    token = registered_user["body"]["access_token"]

    assert (
        client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code
        == 200
    )

    assert (
        client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"}).status_code
        == 204
    )

    # Revocation takes effect immediately, which a stateless JWT could not do.
    assert (
        client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code
        == 401
    )


def test_logout_is_safe_without_a_session():
    assert client.post("/api/auth/logout").status_code == 204
