"""
Build history and status API routes.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Build, Project

router = APIRouter(prefix="/builds", tags=["builds"])


# ─────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────

class BuildResponse(BaseModel):
    """Build response model."""
    id: UUID
    project_id: UUID
    prompt: str
    prompt_type: str
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    ai_model: Optional[str]
    tokens_used: Optional[int]
    error_message: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class BuildDetailResponse(BuildResponse):
    """Detailed build response with generated files."""
    generated_files: dict
    build_logs: Optional[list[str]]


class BuildListResponse(BaseModel):
    """Paginated list of builds."""
    items: list[BuildResponse]
    total: int
    page: int
    per_page: int


# ─────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────

@router.get("/project/{slug}", response_model=BuildListResponse)
async def list_project_builds(
    slug: str,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List all builds for a project."""
    # First get the project
    project_result = await db.execute(
        select(Project).where(Project.slug == slug)
    )
    project = project_result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    offset = (page - 1) * per_page
    
    # Get builds
    query = (
        select(Build)
        .where(Build.project_id == project.id)
        .order_by(desc(Build.created_at))
        .offset(offset)
        .limit(per_page)
    )
    
    result = await db.execute(query)
    builds = result.scalars().all()
    
    # Get total count
    count_query = select(Build).where(Build.project_id == project.id)
    count_result = await db.execute(count_query)
    total = len(count_result.scalars().all())
    
    return BuildListResponse(
        items=[BuildResponse.model_validate(b) for b in builds],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/{build_id}", response_model=BuildDetailResponse)
async def get_build(
    build_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific build by ID."""
    result = await db.execute(
        select(Build).where(Build.id == build_id)
    )
    build = result.scalar_one_or_none()
    
    if not build:
        raise HTTPException(status_code=404, detail="Build not found")
    
    return BuildDetailResponse.model_validate(build)


@router.get("/{build_id}/status")
async def get_build_status(
    build_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get just the status of a build (for polling)."""
    result = await db.execute(
        select(Build.status, Build.error_message).where(Build.id == build_id)
    )
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Build not found")
    
    return {
        "build_id": str(build_id),
        "status": row.status,
        "error": row.error_message,
    }


@router.get("/{build_id}/logs")
async def get_build_logs(
    build_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get build logs."""
    result = await db.execute(
        select(Build).where(Build.id == build_id)
    )
    build = result.scalar_one_or_none()
    
    if not build:
        raise HTTPException(status_code=404, detail="Build not found")
    
    return {
        "build_id": str(build_id),
        "logs": build.build_logs or [],
        "status": build.status,
    }


@router.get("/{build_id}/diff")
async def get_build_diff(
    build_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get diff between this build and previous build."""
    result = await db.execute(
        select(Build).where(Build.id == build_id)
    )
    build = result.scalar_one_or_none()
    
    if not build:
        raise HTTPException(status_code=404, detail="Build not found")
    
    # Get previous build
    prev_result = await db.execute(
        select(Build)
        .where(Build.project_id == build.project_id)
        .where(Build.created_at < build.created_at)
        .order_by(desc(Build.created_at))
        .limit(1)
    )
    prev_build = prev_result.scalar_one_or_none()
    
    current_files = build.generated_files or {}
    previous_files = prev_build.generated_files if prev_build else {}
    
    # Calculate diff
    added_files = set(current_files.keys()) - set(previous_files.keys())
    removed_files = set(previous_files.keys()) - set(current_files.keys())
    modified_files = {
        f for f in current_files.keys() & previous_files.keys()
        if current_files[f] != previous_files[f]
    }
    
    return {
        "build_id": str(build_id),
        "previous_build_id": str(prev_build.id) if prev_build else None,
        "added_files": list(added_files),
        "removed_files": list(removed_files),
        "modified_files": list(modified_files),
        "unchanged_files": list(
            set(current_files.keys()) & set(previous_files.keys()) - modified_files
        ),
    }

