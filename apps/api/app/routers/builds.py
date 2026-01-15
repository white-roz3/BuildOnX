"""
Build status routes for real-time build tracking.
"""

from typing import Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Build, Project
from app.config import settings

router = APIRouter(prefix="/builds", tags=["builds"])


class BuildStatusResponse(BaseModel):
    """Real-time build status."""
    id: str
    slug: str
    status: str  # queued, generating, saving, complete, failed
    prompt: str
    name: Optional[str] = None
    progress: int  # 0-100
    current_step: Optional[str] = None
    files_generated: list[str] = []
    project_url: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/{build_id}/status", response_model=BuildStatusResponse)
async def get_build_status(
    build_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get real-time status of a build."""
    
    # Try to find by build ID first
    result = await db.execute(
        select(Build).where(Build.id == build_id)
    )
    build = result.scalar_one_or_none()
    
    if not build:
        # Maybe it's a slug?
        result = await db.execute(
            select(Project).where(Project.slug == build_id)
        )
        project = result.scalar_one_or_none()
        
        if project:
            # Return project info as if it's a completed build
            files = list(project.files.keys()) if project.files else []
            return BuildStatusResponse(
                id=str(project.id),
                slug=project.slug,
                status="complete" if project.deployment_status == "deployed" else project.deployment_status,
                prompt=project.original_prompt,
                name=project.name,
                progress=100 if project.deployment_status == "deployed" else 50,
                current_step="Complete" if project.deployment_status == "deployed" else "Building...",
                files_generated=files,
                project_url=f"https://{settings.base_domain}/p/{project.slug}",
                created_at=project.created_at,
            )
        
        raise HTTPException(status_code=404, detail="Build not found")
    
    # Calculate progress based on status
    progress_map = {
        "queued": 10,
        "generating": 40,
        "saving": 80,
        "complete": 100,
        "failed": 0,
    }
    
    # Get associated project if exists
    project = None
    if build.project_id:
        result = await db.execute(
            select(Project).where(Project.id == build.project_id)
        )
        project = result.scalar_one_or_none()
    
    files = []
    if build.generated_files:
        files = list(build.generated_files.keys())
    elif project and project.files:
        files = list(project.files.keys())
    
    project_url = None
    slug = project.slug if project else build_id
    if build.status == "complete" and project:
        project_url = f"https://{settings.base_domain}/p/{project.slug}"
    
    return BuildStatusResponse(
        id=str(build.id),
        slug=slug,
        status=build.status,
        prompt=build.prompt,
        name=project.name if project else None,
        progress=progress_map.get(build.status, 0),
        current_step=build.status.replace("_", " ").title(),
        files_generated=files,
        project_url=project_url,
        error=build.error_message,
        created_at=build.created_at,
    )


class CreateBuildRequest(BaseModel):
    """Request to create a new build (from worker)."""
    tweet_id: str
    author_id: str
    author_username: str
    prompt: str
    slug: str


class CreateBuildResponse(BaseModel):
    """Response with build ID for tracking."""
    id: str
    slug: str
    build_url: str
    project_url: str


@router.post("/create", response_model=CreateBuildResponse)
async def create_build(
    request: CreateBuildRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new build record (called by worker immediately).
    Returns URLs that can be shared before build completes.
    """
    import uuid
    
    # Check/create user
    user_result = await db.execute(
        text("SELECT id FROM users WHERE x_user_id = :x_user_id"),
        {"x_user_id": request.author_id}
    )
    user_row = user_result.fetchone()
    
    if user_row:
        user_id = user_row[0]
    else:
        user_id = uuid.uuid4()
        await db.execute(
            text("""
                INSERT INTO users (id, x_user_id, x_username, tier, credits, created_at)
                VALUES (:id, :x_user_id, :x_username, 'free', 10, NOW())
            """),
            {"id": user_id, "x_user_id": request.author_id, "x_username": request.author_username}
        )
    
    # Create project placeholder
    project_id = uuid.uuid4()
    await db.execute(
        text("""
            INSERT INTO projects (
                id, user_id, slug, name, original_prompt, 
                files, deployment_status, is_public, views, forks,
                source_tweet_id, created_at
            ) VALUES (
                :id, :user_id, :slug, :name, :prompt,
                '{}', 'building', true, 0, 0,
                :tweet_id, NOW()
            )
        """),
        {
            "id": project_id,
            "user_id": user_id,
            "slug": request.slug,
            "name": "Building...",
            "prompt": request.prompt,
            "tweet_id": request.tweet_id,
        }
    )
    
    # Create build record
    build_id = uuid.uuid4()
    await db.execute(
        text("""
            INSERT INTO builds (
                id, project_id, prompt, status, created_at
            ) VALUES (
                :id, :project_id, :prompt, 'queued', NOW()
            )
        """),
        {
            "id": build_id,
            "project_id": project_id,
            "prompt": request.prompt,
        }
    )
    
    await db.commit()
    
    return CreateBuildResponse(
        id=str(build_id),
        slug=request.slug,
        build_url=f"https://{settings.base_domain}/build/{request.slug}",
        project_url=f"https://{settings.base_domain}/p/{request.slug}",
    )


class UpdateBuildRequest(BaseModel):
    """Update build status."""
    status: str
    files: Optional[dict] = None
    name: Optional[str] = None
    description: Optional[str] = None
    error: Optional[str] = None


@router.patch("/{slug}/update")
async def update_build(
    slug: str,
    request: UpdateBuildRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update build status (called by worker during build)."""
    import json
    
    # Update project
    if request.files:
        await db.execute(
            text("""
                UPDATE projects 
                SET files = :files, 
                    name = COALESCE(:name, name),
                    description = COALESCE(:description, description),
                    deployment_status = :status
                WHERE slug = :slug
            """),
            {
                "slug": slug,
                "files": json.dumps(request.files),
                "name": request.name,
                "description": request.description,
                "status": "deployed" if request.status == "complete" else request.status,
            }
        )
    else:
        await db.execute(
            text("UPDATE projects SET deployment_status = :status WHERE slug = :slug"),
            {"slug": slug, "status": request.status}
        )
    
    # Update build record
    await db.execute(
        text("""
            UPDATE builds 
            SET status = :status,
                generated_files = COALESCE(:files, generated_files),
                error_message = :error,
                completed_at = CASE WHEN :status IN ('complete', 'failed') THEN NOW() ELSE NULL END
            WHERE project_id = (SELECT id FROM projects WHERE slug = :slug)
        """),
        {
            "slug": slug,
            "status": request.status,
            "files": json.dumps(request.files) if request.files else None,
            "error": request.error,
        }
    )
    
    await db.commit()
    
    return {"status": "updated"}
