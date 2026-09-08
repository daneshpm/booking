"""
Authentication primitives for the FastAPI service.

Sessions are the same server-side sessions the Next.js application issues: an
opaque random token whose SHA-256 digest is stored in the `sessions` table. Both
services therefore honour each other's logins, and revoking a session takes
effect everywhere immediately. That is not true of a stateless JWT, which stays
valid until it expires no matter what the database says.
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List

import bcrypt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.db.session import get_db
from app.db.models import Session, User

# Mirrors packages/core/src/password/index.ts so both services enforce the same
# rules. bcrypt ignores everything past the 72nd byte, so a longer password
# would mean two different secrets unlock the same account.
MAX_PASSWORD_BYTES = 72
MIN_PASSWORD_LENGTH = 10
BCRYPT_COST = 12

COMMON_PASSWORDS = {
    "password123",
    "password1234",
    "passw0rd123",
    "qwerty12345",
    "welcome123",
    "admin12345",
    "letmein123",
    "iloveyou123",
    "password@123",
    "admin@12345",
    "changeme123",
}

# A valid hash nothing will match, used to spend comparable CPU on the
# unknown-account path so response timing does not reveal which emails exist.
_DECOY_HASH = b"$2b$12$C6UzMDM.H6dfI/f/IKcEe.7zJ7Zf1Bd7iM3zEXWtHkH2GH1nX0Vhy"

security_bearer = HTTPBearer(auto_error=False)


def validate_password_policy(password: str) -> List[str]:
    """Return every policy violation, or an empty list when the password is fine."""
    errors: List[str] = []

    if not password:
        return ["Password is required."]

    if len(password) < MIN_PASSWORD_LENGTH:
        errors.append(f"Password must be at least {MIN_PASSWORD_LENGTH} characters long.")

    if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        errors.append(f"Password must be at most {MAX_PASSWORD_BYTES} bytes long.")

    if not any(c.islower() for c in password):
        errors.append("Password must contain a lowercase letter.")
    if not any(c.isupper() for c in password):
        errors.append("Password must contain an uppercase letter.")
    if not any(c.isdigit() for c in password):
        errors.append("Password must contain a number.")

    if password.lower() in COMMON_PASSWORDS:
        errors.append("This password is too common. Please choose a different one.")

    return errors


def hash_password(password: str) -> str:
    """Hash a plaintext password. Raises ValueError if it violates the policy."""
    errors = validate_password_policy(password)
    if errors:
        raise ValueError(errors[0])
    salt = bcrypt.gensalt(rounds=BCRYPT_COST)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    """
    Verify a password against a stored bcrypt hash.

    There is deliberately no allowance for seeded or development passwords: a
    shared fallback credential that works against any account with a known hash
    is a backdoor, and it ships to production with everything else.
    """
    if not plain_password or not hashed_password:
        return False
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )
    except (ValueError, TypeError):
        return False


def fake_verify_password() -> bool:
    """Spend comparable CPU when no account matched, then report failure."""
    try:
        bcrypt.checkpw(b"~unmatchable~", _DECOY_HASH)
    except (ValueError, TypeError):
        pass
    return False


def generate_session_token() -> str:
    """32 bytes of CSPRNG output, URL-safe. Matches the Node implementation."""
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    """SHA-256 digest used as the database lookup key for a session token."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def create_session(
    db: AsyncSession,
    user_id: str,
    user_agent: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> tuple[str, datetime]:
    """Issue a session and return the plaintext token exactly once."""
    token = generate_session_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.SESSION_TTL_DAYS)

    db.add(
        Session(
            user_id=user_id,
            token_hash=hash_session_token(token),
            expires_at=expires_at,
            user_agent=(user_agent or "")[:500] or None,
            ip_address=ip_address,
        )
    )
    await db.flush()
    return token, expires_at


async def destroy_session(db: AsyncSession, token: str) -> None:
    """Revoke one session. Safe to call with an unknown token."""
    result = await db.execute(
        select(Session).where(Session.token_hash == hash_session_token(token))
    )
    session = result.scalar_one_or_none()
    if session:
        await db.delete(session)
        await db.flush()


def _extract_token(
    request: Request, auth: Optional[HTTPAuthorizationCredentials]
) -> Optional[str]:
    """Prefer an explicit bearer token, then fall back to the session cookie."""
    if auth and auth.credentials:
        return auth.credentials
    return request.cookies.get(settings.SESSION_COOKIE)


async def get_current_user(
    request: Request,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Resolve the caller from their session token.

    Accepts either an Authorization: Bearer header or the session cookie set by
    the web application, so both a browser and a service client work unchanged.
    """
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = _extract_token(request, auth)
    if not token:
        raise unauthorized

    result = await db.execute(
        select(Session)
        .options(selectinload(Session.user))
        .where(Session.token_hash == hash_session_token(token))
    )
    session = result.scalar_one_or_none()

    if not session:
        raise unauthorized

    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at <= datetime.now(timezone.utc):
        await db.delete(session)
        await db.commit()
        raise unauthorized

    if not session.user or not session.user.is_active:
        raise unauthorized

    return session.user
