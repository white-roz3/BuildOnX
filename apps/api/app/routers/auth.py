"""
Authentication routes using Twitter OAuth.
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
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
    except jwt.JWTError:
        return None


# ─────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────

@router.get("/twitter")
async def twitter_auth_start():
    """
    Start Twitter OAuth flow.
    Redirects user to Twitter for authorization.
    """
    # In production, implement OAuth 2.0 PKCE flow
    # For now, return instructions
    return {
        "message": "Twitter OAuth not implemented in demo",
        "instructions": [
            "1. Register app at developer.twitter.com",
            "2. Enable OAuth 2.0 with PKCE",
            "3. Set callback URL to /auth/twitter/callback",
            "4. Implement authorization URL generation",
        ],
    }


@router.get("/twitter/callback")
async def twitter_auth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Twitter OAuth callback.
    Exchange code for tokens and create/update user.
    """
    # In production:
    # 1. Verify state matches stored state
    # 2. Exchange code for access token
    # 3. Fetch user profile from Twitter
    # 4. Create or update user in database
    # 5. Generate JWT and redirect to app
    
    return {
        "message": "OAuth callback handler placeholder",
        "code": code[:10] + "...",
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    authorization: str = None,
    db: AsyncSession = Depends(get_db),
):
    """Get the current authenticated user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization[7:]  # Remove "Bearer " prefix
    user_id = verify_token(token)
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse.model_validate(user)


@router.post("/logout")
async def logout(response: Response):
    """Log out the current user."""
    # Clear any cookies if using cookie-based auth
    response.delete_cookie("access_token")
    return {"status": "logged out"}


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


@router.get("/me/projects", response_model=list[UserProjectResponse])
async def get_user_projects(
    authorization: str = None,
    db: AsyncSession = Depends(get_db),
):
    """Get all projects for the authenticated user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization[7:]
    user_id = verify_token(token)
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await db.execute(
        select(Project)
        .where(Project.user_id == user_id)
        .order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()
    
    return [UserProjectResponse.model_validate(p) for p in projects]


@router.get("/me/dashboard", response_model=UserDashboardResponse)
async def get_user_dashboard(
    authorization: str = None,
    db: AsyncSession = Depends(get_db),
):
    """Get full dashboard data for the authenticated user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization[7:]
    user_id = verify_token(token)
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get user
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get projects
    result = await db.execute(
        select(Project)
        .where(Project.user_id == user_id)
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
            "builds_today": 0,  # TODO: Calculate from builds table
        }
    )


# ─────────────────────────────────────────────────────────────
# Demo/Development Routes
# ─────────────────────────────────────────────────────────────

@router.post("/dev/create-user", response_model=TokenResponse)
async def dev_create_user(
    x_user_id: str = Query(...),
    x_username: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Development endpoint to create a test user.
    NOT FOR PRODUCTION USE.
    """
    if not settings.debug:
        raise HTTPException(status_code=403, detail="Only available in debug mode")
    
    # Check if user exists
    result = await db.execute(
        select(User).where(User.x_user_id == x_user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        user = User(
            x_user_id=x_user_id,
            x_username=x_username,
            tier="free",
            credits=10,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    # Create token
    token = create_access_token(str(user.id))
    
    return TokenResponse(
        access_token=token,
        expires_in=60 * 60 * 24 * 7,  # 7 days
        user=UserResponse.model_validate(user),
    )

