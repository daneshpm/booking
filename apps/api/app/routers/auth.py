import re
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.db.session import get_db
from app.db.models import User, Workspace, WorkspaceMember, Staff
from app.auth.security import (
    hash_password,
    verify_password,
    fake_verify_password,
    validate_password_policy,
    create_session,
    destroy_session,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Deliberately identical for a wrong password and an unknown account, so the
# response cannot be used to work out which email addresses are registered.
INVALID_CREDENTIALS = "Invalid email or password."


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-") or "workspace"


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., description="At least 10 characters with mixed case and a digit")
    name: str = Field(..., min_length=1, max_length=200)
    workspaceName: Optional[str] = None
    workspaceSlug: Optional[str] = None
    workspaceTimezone: str = "Asia/Kolkata"
    workspaceCurrency: str = "INR"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    avatarUrl: Optional[str] = None
    role: Optional[str] = None


class WorkspaceProfile(BaseModel):
    id: str
    name: str
    slug: str
    timezone: str
    currency: str
    role: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: str
    user: UserProfile
    workspace: Optional[WorkspaceProfile] = None


class MeResponse(BaseModel):
    user: UserProfile
    workspaces: List[WorkspaceProfile] = []


def _set_session_cookie(response: Response, token: str, expires_at) -> None:
    """
    Attach the session cookie.

    httpOnly keeps the token away from page scripts, and secure is required
    once the app is served over HTTPS.
    """
    response.set_cookie(
        key=settings.SESSION_COOKIE,
        value=token,
        httponly=True,
        secure=settings.IS_PRODUCTION,
        samesite="lax",
        path="/",
        expires=expires_at,
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    req: RegisterRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Create an account with its own workspace and sign the new user in."""
    email_clean = req.email.strip().lower()

    policy_errors = validate_password_policy(req.password)
    if policy_errors:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=policy_errors[0])

    existing = await db.execute(select(User).where(User.email == email_clean))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    name = req.name.strip()
    ws_name = (req.workspaceName or name).strip()
    raw_slug = slugify(req.workspaceSlug or ws_name)

    # The column carries a unique constraint, so a concurrent registration that
    # wins the race fails on insert rather than creating a duplicate slug.
    slug_taken = await db.execute(select(Workspace).where(Workspace.slug == raw_slug))
    ws_slug = raw_slug
    if slug_taken.scalar_one_or_none():
        suffix = 1
        while True:
            candidate = f"{raw_slug}-{suffix}"
            check = await db.execute(select(Workspace).where(Workspace.slug == candidate))
            if not check.scalar_one_or_none():
                ws_slug = candidate
                break
            suffix += 1
            if suffix > 50:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Could not allocate a workspace address. Try a different name.",
                )

    new_user = User(email=email_clean, name=name, passwordHash=hash_password(req.password))
    db.add(new_user)
    await db.flush()

    new_ws = Workspace(
        name=ws_name,
        slug=ws_slug,
        timezone=req.workspaceTimezone,
        currency=req.workspaceCurrency.upper(),
    )
    db.add(new_ws)
    await db.flush()

    db.add(WorkspaceMember(workspace_id=new_ws.id, user_id=new_user.id, role="OWNER"))

    # The owner doubles as a bookable staff member so the workspace is usable
    # as soon as services are added.
    db.add(
        Staff(
            workspace_id=new_ws.id,
            user_id=new_user.id,
            name=name,
            email=email_clean,
            timezone=req.workspaceTimezone,
            is_active=True,
        )
    )

    token, expires_at = await create_session(
        db,
        new_user.id,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )

    await db.commit()
    _set_session_cookie(response, token, expires_at)

    return AuthResponse(
        access_token=token,
        expires_at=expires_at.isoformat(),
        user=UserProfile(
            id=new_user.id, email=new_user.email, name=new_user.name, role="OWNER"
        ),
        workspace=WorkspaceProfile(
            id=new_ws.id,
            name=new_ws.name,
            slug=new_ws.slug,
            timezone=new_ws.timezone,
            currency=new_ws.currency,
            role="OWNER",
        ),
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    req: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate with email and password and issue a session."""
    email_clean = req.email.strip().lower()

    result = await db.execute(
        select(User)
        .options(selectinload(User.memberships).selectinload(WorkspaceMember.workspace))
        .where(User.email == email_clean)
    )
    user = result.scalar_one_or_none()

    if not user:
        # Spend comparable time hashing so the timing does not differ from a
        # real account with a wrong password.
        fake_verify_password()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_CREDENTIALS,
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(req.password, user.passwordHash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_CREDENTIALS,
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated.",
        )

    primary_ws = None
    role = None
    if user.memberships:
        primary = user.memberships[0]
        role = primary.role
        if primary.workspace:
            primary_ws = WorkspaceProfile(
                id=primary.workspace.id,
                name=primary.workspace.name,
                slug=primary.workspace.slug,
                timezone=primary.workspace.timezone,
                currency=primary.workspace.currency,
                role=primary.role,
            )

    token, expires_at = await create_session(
        db,
        user.id,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )

    from datetime import datetime, timezone as _tz

    user.last_login_at = datetime.now(_tz.utc)
    await db.commit()

    _set_session_cookie(response, token, expires_at)

    return AuthResponse(
        access_token=token,
        expires_at=expires_at.isoformat(),
        user=UserProfile(
            id=user.id,
            email=user.email,
            name=user.name,
            avatarUrl=user.avatarUrl,
            role=role,
        ),
        workspace=primary_ws,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """Revoke the caller's session. Succeeds even when no session was present."""
    token = request.cookies.get(settings.SESSION_COOKIE)
    header = request.headers.get("authorization", "")
    if not token and header.lower().startswith("bearer "):
        token = header[7:].strip()

    if token:
        await destroy_session(db, token)
        await db.commit()

    response.delete_cookie(settings.SESSION_COOKIE, path="/")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=MeResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Profile and workspace memberships for the authenticated caller."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.memberships).selectinload(WorkspaceMember.workspace))
        .where(User.id == current_user.id)
    )
    user = result.scalar_one()

    workspaces = [
        WorkspaceProfile(
            id=m.workspace.id,
            name=m.workspace.name,
            slug=m.workspace.slug,
            timezone=m.workspace.timezone,
            currency=m.workspace.currency,
            role=m.role,
        )
        for m in user.memberships
        if m.workspace
    ]

    primary_role = next((m.role for m in user.memberships if m.role == "OWNER"), None)
    if primary_role is None and user.memberships:
        primary_role = user.memberships[0].role

    return MeResponse(
        user=UserProfile(
            id=user.id,
            email=user.email,
            name=user.name,
            avatarUrl=user.avatarUrl,
            role=primary_role,
        ),
        workspaces=workspaces,
    )
