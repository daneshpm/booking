import re
import uuid
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models import User, Workspace, WorkspaceMember
from app.auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text.strip('-') or "workspace"

# Pydantic Schemas
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password (min 6 characters)")
    name: str = Field(..., min_length=1)
    workspaceName: Optional[str] = "Rooman Technologies"
    workspaceSlug: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    avatarUrl: Optional[str] = None
    role: Optional[str] = "OWNER"

class WorkspaceProfile(BaseModel):
    id: str
    name: str
    slug: str
    timezone: str = "Asia/Kolkata"
    currency: str = "INR"

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile
    workspace: Optional[WorkspaceProfile] = None

class MeResponse(BaseModel):
    user: UserProfile
    workspaces: List[WorkspaceProfile] = []

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user, initialize their default workspace, and issue a JWT token."""
    email_clean = req.email.strip().lower()

    # Check if user already exists
    existing = await db.execute(select(User).where(User.email == email_clean))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    # Hash password
    hashed_pwd = hash_password(req.password)

    # Create User
    new_user = User(
        id=str(uuid.uuid4()),
        email=email_clean,
        name=req.name.strip(),
        passwordHash=hashed_pwd,
    )
    db.add(new_user)
    await db.flush()

    # Create Workspace
    ws_name = req.workspaceName.strip() if req.workspaceName else "Rooman Technologies"
    raw_slug = req.workspaceSlug if req.workspaceSlug else slugify(ws_name)
    
    # Ensure slug uniqueness
    slug_check = await db.execute(select(Workspace).where(Workspace.slug == raw_slug))
    if slug_check.scalar_one_or_none():
        ws_slug = f"{raw_slug}-{uuid.uuid4().hex[:4]}"
    else:
        ws_slug = raw_slug

    new_ws = Workspace(
        id=str(uuid.uuid4()),
        name=ws_name,
        slug=ws_slug,
        timezone="Asia/Kolkata",
        currency="INR",
    )
    db.add(new_ws)
    await db.flush()

    # Create Workspace Membership (Role = OWNER)
    membership = WorkspaceMember(
        id=str(uuid.uuid4()),
        workspace_id=new_ws.id,
        user_id=new_user.id,
        role="OWNER",
    )
    db.add(membership)
    await db.commit()
    await db.refresh(new_user)
    await db.refresh(new_ws)

    # Issue JWT token
    token = create_access_token({"sub": new_user.id, "email": new_user.email})

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserProfile(
            id=new_user.id,
            email=new_user.email,
            name=new_user.name,
            avatarUrl=new_user.avatarUrl,
            role="OWNER",
        ),
        workspace=WorkspaceProfile(
            id=new_ws.id,
            name=new_ws.name,
            slug=new_ws.slug,
            timezone=new_ws.timezone,
            currency=new_ws.currency,
        ),
    )

@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate with email and password, returning a JWT token and user profile."""
    email_clean = req.email.strip().lower()

    result = await db.execute(
        select(User)
        .options(selectinload(User.memberships).selectinload(WorkspaceMember.workspace))
        .where(User.email == email_clean)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.passwordHash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Find primary workspace
    primary_ws = None
    role = "STAFF"
    if user.memberships:
        primary_member = user.memberships[0]
        role = primary_member.role
        if primary_member.workspace:
            primary_ws = WorkspaceProfile(
                id=primary_member.workspace.id,
                name=primary_member.workspace.name,
                slug=primary_member.workspace.slug,
                timezone=primary_member.workspace.timezone,
                currency=primary_member.workspace.currency,
            )

    token = create_access_token({"sub": user.id, "email": user.email})

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserProfile(
            id=user.id,
            email=user.email,
            name=user.name,
            avatarUrl=user.avatarUrl,
            role=role,
        ),
        workspace=primary_ws,
    )

@router.get("/me", response_model=MeResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve authenticated user profile and connected workspaces."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.memberships).selectinload(WorkspaceMember.workspace))
        .where(User.id == current_user.id)
    )
    user = result.scalar_one()

    workspaces = []
    primary_role = "STAFF"
    for m in user.memberships:
        if m.role == "OWNER":
            primary_role = "OWNER"
        if m.workspace:
            workspaces.append(
                WorkspaceProfile(
                    id=m.workspace.id,
                    name=m.workspace.name,
                    slug=m.workspace.slug,
                    timezone=m.workspace.timezone,
                    currency=m.workspace.currency,
                )
            )

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
