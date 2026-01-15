"""
Authentication routes using Twitter OAuth 2.0 PKCE.
"""

import hashlib
import base64
import secrets
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, Header, Cookie
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
from jose import jwt

from app.database import get_db
from app.models import User, Project
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


# ─────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    """User response model."""
    id: UUID
    x_user_id: str
    x_username: str
    x_display_name: Optional[str]
    x_profile_image: Optional[str]
    tier: str
    credits: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class UserProjectResponse(BaseModel):
    """Project summary for user dashboard."""
    id: UUID
    slug: str
    name: Optional[str]
    original_prompt: str
    deployment_url: Optional[str]
    deployment_status: str
    is_public: bool
    views: int
    forks: int
    created_at: datetime
    expires_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class UserDashboardResponse(BaseModel):
    """Full user dashboard data."""
    user: UserResponse
    projects: list[UserProjectResponse]
    stats: dict


# ─────────────────────────────────────────────────────────────
# In-memory state storage (use Redis in production)
# ─────────────────────────────────────────────────────────────

oauth_states: dict[str, dict] = {}


# ─────────────────────────────────────────────────────────────
# JWT Utilities
# ─────────────────────────────────────────────────────────────

def create_access_token(user_id: str, expires_delta: timedelta = None) -> str:
    """Create a JWT access token."""
    if expires_delta is None:
        expires_delta = timedelta(days=7)
    
    expire = datetime.utcnow() + expires_delta
    
    payload = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def verify_token(token: str) -> Optional[str]:
    """Verify a JWT token and return the user ID."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        return payload.get("sub")
    except Exception:
        return None


async def get_current_user_from_token(
    authorization: str = Header(None),
    access_token: str = Cookie(None),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Get user from Authorization header or cookie."""
    token = None
    
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    elif access_token:
        token = access_token
    
    if not token:
        return None
    
    user_id = verify_token(token)
    if not user_id:
        return None
    
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


# ─────────────────────────────────────────────────────────────
# PKCE Utilities
# ─────────────────────────────────────────────────────────────

def generate_code_verifier() -> str:
    """Generate a code verifier for PKCE."""
    return secrets.token_urlsafe(32)


def generate_code_challenge(verifier: str) -> str:
    """Generate a code challenge from verifier (S256)."""
    digest = hashlib.sha256(verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()


# ─────────────────────────────────────────────────────────────
# Twitter OAuth 2.0 PKCE Routes
# ─────────────────────────────────────────────────────────────

@router.get("/twitter")
async def twitter_auth_start(redirect_uri: str = Query(None)):
    """
    Start Twitter OAuth 2.0 PKCE flow.
    Redirects user to Twitter for authorization.
    """
    # Generate PKCE parameters
    code_verifier = generate_code_verifier()
    code_challenge = generate_code_challenge(code_verifier)
    state = secrets.token_urlsafe(16)
    
    # Store state and verifier (use Redis in production)
    oauth_states[state] = {
        "code_verifier": code_verifier,
        "redirect_uri": redirect_uri or f"{settings.frontend_url}/auth/callback",
        "created_at": datetime.utcnow(),
    }
    
    # Twitter OAuth 2.0 authorization URL
    # Using OAuth 2.0 with PKCE (no client_secret needed on client side)
    callback_url = f"{settings.api_url}/api/auth/twitter/callback"
    
    params = {
        "response_type": "code",
        "client_id": settings.twitter_api_key,
        "redirect_uri": callback_url,
        "scope": "tweet.read users.read offline.access",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    
    query = "&".join(f"{k}={v}" for k, v in params.items())
    auth_url = f"https://twitter.com/i/oauth2/authorize?{query}"
    
    return RedirectResponse(url=auth_url)


@router.get("/twitter/callback")
async def twitter_auth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Twitter OAuth 2.0 callback.
    Exchange code for tokens and create/update user.
    """
    # Verify state
    if state not in oauth_states:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    
    state_data = oauth_states.pop(state)
    code_verifier = state_data["code_verifier"]
    frontend_redirect = state_data["redirect_uri"]
    
    callback_url = f"{settings.api_url}/api/auth/twitter/callback"

    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://api.twitter.com/2/oauth2/token",
            data={
                "code": code,
                "grant_type": "authorization_code",
                "client_id": settings.twitter_api_key,
                "redirect_uri": callback_url,
                "code_verifier": code_verifier,
            },
            auth=(settings.twitter_api_key, settings.twitter_api_secret),
        )
        
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code for token")
        
        tokens = token_response.json()
        twitter_access_token = tokens["access_token"]
        
        # Fetch user profile
        user_response = await client.get(
            "https://api.twitter.com/2/users/me",
            headers={"Authorization": f"Bearer {twitter_access_token}"},
            params={"user.fields": "profile_image_url,name"},
        )
        
        if user_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch user profile")
        
        twitter_user = user_response.json()["data"]
    
    # Create or update user in database
    x_user_id = twitter_user["id"]
    x_username = twitter_user["username"]
    x_display_name = twitter_user.get("name")
    x_profile_image = twitter_user.get("profile_image_url")
    
    result = await db.execute(
        select(User).where(User.x_user_id == x_user_id)
    )
    user = result.scalar_one_or_none()
    
    if user:
        # Update existing user
        user.x_username = x_username
        user.x_display_name = x_display_name
        user.x_profile_image = x_profile_image
    else:
        # Create new user
        user = User(
            x_user_id=x_user_id,
            x_username=x_username,
            x_display_name=x_display_name,
            x_profile_image=x_profile_image,
            tier="free",
            credits=10,
        )
        db.add(user)
    
    await db.commit()
    await db.refresh(user)
    
    # Generate JWT
    jwt_token = create_access_token(str(user.id))
    
    # Redirect to frontend with token
    redirect_url = f"{frontend_redirect}?token={jwt_token}"
    response = RedirectResponse(url=redirect_url)
    
    # Also set as HTTP-only cookie
    response.set_cookie(
        key="access_token",
        value=jwt_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 7,  # 7 days
    )
    
    return response


# ─────────────────────────────────────────────────────────────
# User Routes
# ─────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_current_user(
    authorization: str = Header(None),
    access_token: str = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    """Get the current authenticated user."""
    user = await get_current_user_from_token(authorization, access_token, db)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return UserResponse.model_validate(user)


@router.get("/me/projects", response_model=list[UserProjectResponse])
async def get_user_projects(
    authorization: str = Header(None),
    access_token: str = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    """Get all projects for the authenticated user."""
    user = await get_current_user_from_token(authorization, access_token, db)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.execute(
        select(Project)
        .where(Project.user_id == user.id)
        .order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()
    
    return [UserProjectResponse.model_validate(p) for p in projects]


@router.get("/me/dashboard", response_model=UserDashboardResponse)
async def get_user_dashboard(
    authorization: str = Header(None),
    access_token: str = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    """Get full dashboard data for the authenticated user."""
    user = await get_current_user_from_token(authorization, access_token, db)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get projects
    result = await db.execute(
        select(Project)
        .where(Project.user_id == user.id)
        .order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()
    
    # Calculate stats
    total_views = sum(p.views for p in projects)
    total_forks = sum(p.forks for p in projects)
    deployed_count = sum(1 for p in projects if p.deployment_status == "deployed")
    
    return UserDashboardResponse(
        user=UserResponse.model_validate(user),
        projects=[UserProjectResponse.model_validate(p) for p in projects],
        stats={
            "total_projects": len(projects),
            "total_views": total_views,
            "total_forks": total_forks,
            "deployed_count": deployed_count,
            "credits_remaining": user.credits,
        }
    )


@router.post("/logout")
async def logout(response: Response):
    """Log out the current user."""
    response.delete_cookie("access_token")
    return {"status": "logged out"}


# ─────────────────────────────────────────────────────────────
# Project Ownership Check
# ─────────────────────────────────────────────────────────────

@router.get("/project/{slug}/can-edit")
async def check_project_edit_permission(
    slug: str,
    authorization: str = Header(None),
    access_token: str = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    """Check if current user can edit a project."""
    user = await get_current_user_from_token(authorization, access_token, db)
    
    # Get project
    result = await db.execute(
        select(Project).where(Project.slug == slug)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    can_edit = user is not None and project.user_id == user.id
    
    return {
        "can_edit": can_edit,
        "is_owner": can_edit,
        "project_slug": slug,
    }
