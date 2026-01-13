"""
Project management API routes.
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Project, Build, track_usage
from app.services.builder import BuilderService
from app.services.deployer import DeployerService
from app.services.alerts import alerts
from app.routers.ws import broadcast_build_update
from app.utils.slug import generate_slug
from app.config import settings

router = APIRouter(prefix="/projects", tags=["projects"])


# ─────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    """Request to create a new project."""
    prompt: str = Field(..., min_length=3, max_length=2000)
    template: Optional[str] = Field(default=None)


class ProjectUpdate(BaseModel):
    """Request to update a project."""
    name: Optional[str] = None
    description: Optional[str] = None
    files: Optional[dict] = None
    is_public: Optional[bool] = None


class ProjectRefine(BaseModel):
    """Request to refine a project with AI."""
    instruction: str = Field(..., min_length=3, max_length=1000)
    current_files: Optional[dict] = None


class ProjectResponse(BaseModel):
    """Project response model."""
    id: UUID
    slug: str
    name: Optional[str]
    description: Optional[str]
    original_prompt: str
    files: dict
    entry_point: str
    deployment_url: Optional[str]
    deployment_status: str
    is_public: bool
    views: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    """Paginated list of projects."""
    items: list[ProjectResponse]
    total: int
    page: int
    per_page: int


# ─────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────

@router.get("", response_model=ProjectListResponse)
async def list_projects(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    public_only: bool = Query(default=True),
    db: AsyncSession = Depends(get_db),
):
    """List all public projects."""
    offset = (page - 1) * per_page
    
    query = select(Project).where(Project.deployment_status == "live")
    if public_only:
        query = query.where(Project.is_public == True)
    
    query = query.order_by(desc(Project.created_at)).offset(offset).limit(per_page)
    
    result = await db.execute(query)
    projects = result.scalars().all()
    
    # Get total count
    count_query = select(Project).where(Project.deployment_status == "live")
    if public_only:
        count_query = count_query.where(Project.is_public == True)
    count_result = await db.execute(count_query)
    total = len(count_result.scalars().all())
    
    return ProjectListResponse(
        items=[ProjectResponse.model_validate(p) for p in projects],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/{slug}", response_model=ProjectResponse)
async def get_project(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a project by slug."""
    result = await db.execute(
        select(Project).where(Project.slug == slug)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Increment view count
    project.views += 1
    await db.commit()
    
    return ProjectResponse.model_validate(project)


@router.post("", response_model=ProjectResponse)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new project from a prompt."""
    builder = BuilderService()
    deployer = DeployerService()
    
    # Detect template from prompt if not specified
    template = data.template or builder.detect_template(data.prompt)
    
    # Generate slug
    slug = generate_slug(data.prompt)
    
    # Set expiration for free tier projects (7 days)
    expires_at = datetime.utcnow() + timedelta(days=settings.project_expiry_days)
    
    # Create project record
    project = Project(
        slug=slug,
        original_prompt=data.prompt,
        template=template,
        deployment_status="building",
        expires_at=expires_at,  # Free tier expires
    )
    db.add(project)
    await db.flush()
    
    # Create build record
    build = Build(
        project_id=project.id,
        prompt=data.prompt,
        prompt_type="initial",
        status="building",
        started_at=datetime.utcnow(),
    )
    db.add(build)
    await db.flush()
    
    try:
        # Broadcast: Building started
        await broadcast_build_update(
            str(build.id), "generating", "AI is writing your code...", 20
        )
        
        # Generate the code
        result = await builder.generate_project(
            prompt=data.prompt,
            template_hint=template,
        )
        
        # Broadcast: Code generated
        await broadcast_build_update(
            str(build.id), "generated", "Code generated, preparing deployment...", 50
        )
        
        # Update project with generated files
        project.files = result["files"]
        project.name = result.get("name", "Untitled Project")
        project.description = result.get("description")
        project.tech_stack = result.get("tech_stack", {})
        project.refined_prompt = result.get("refined_prompt")
        project.entry_point = result.get("entry_point", "index.html")
        
        # Broadcast: Deploying
        await broadcast_build_update(
            str(build.id), "deploying", "Deploying to cloud...", 70
        )
        
        # Deploy the project
        deployment = await deployer.deploy(
            project_id=str(project.id),
            slug=slug,
            files=result["files"],
            entry_point=result.get("entry_point", "index.html"),
        )
        
        project.deployment_url = deployment["url"]
        project.deployment_id = deployment["deployment_id"]
        project.deployment_status = "live"
        
        # Update build record
        build.status = "complete"
        build.completed_at = datetime.utcnow()
        build.generated_files = result["files"]
        build.tokens_used = result.get("tokens_used", 0)
        build.ai_model = result.get("ai_model")
        
        await db.commit()
        await db.refresh(project)
        
        # Broadcast: Complete
        await broadcast_build_update(
            str(build.id), "complete", "Your app is live!", 100,
            {"url": project.deployment_url, "slug": slug}
        )
        
        # Track usage
        await track_usage(
            action="build",
            project_id=str(project.id),
            build_id=str(build.id),
            tokens=result.get("tokens_used", 0),
        )
        
        return ProjectResponse.model_validate(project)
    
    except ValueError as e:
        # Moderation error
        build.status = "failed"
        build.error_message = str(e)
        build.completed_at = datetime.utcnow()
        project.deployment_status = "failed"
        await db.commit()
        
        await broadcast_build_update(str(build.id), "failed", str(e), 0)
        raise HTTPException(status_code=400, detail=str(e))
        
    except Exception as e:
        # Other build errors
        build.status = "failed"
        build.error_message = str(e)
        build.completed_at = datetime.utcnow()
        project.deployment_status = "failed"
        
        await db.commit()
        
        # Broadcast failure
        await broadcast_build_update(str(build.id), "failed", str(e)[:100], 0)
        
        # Alert on unexpected failures
        await alerts.build_failed(
            project_slug=slug,
            username="api_user",
            error=str(e),
            build_id=str(build.id),
        )
        
        raise HTTPException(status_code=500, detail=f"Build failed: {str(e)}")


@router.patch("/{slug}", response_model=ProjectResponse)
async def update_project(
    slug: str,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a project's metadata or files."""
    result = await db.execute(
        select(Project).where(Project.slug == slug)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update fields
    if data.name is not None:
        project.name = data.name
    if data.description is not None:
        project.description = data.description
    if data.is_public is not None:
        project.is_public = data.is_public
    if data.files is not None:
        project.files = data.files
        
        # Redeploy with new files
        deployer = DeployerService()
        try:
            deployment = await deployer.deploy(
                project_id=str(project.id),
                slug=slug,
                files=data.files,
                entry_point=project.entry_point,
            )
            project.deployment_url = deployment["url"]
            project.deployment_id = deployment["deployment_id"]
            project.deployment_status = "live"
        except Exception as e:
            project.deployment_status = "failed"
            await db.commit()
            raise HTTPException(status_code=500, detail=f"Deployment failed: {str(e)}")
    
    project.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(project)
    
    return ProjectResponse.model_validate(project)


@router.post("/{slug}/refine", response_model=ProjectResponse)
async def refine_project(
    slug: str,
    data: ProjectRefine,
    db: AsyncSession = Depends(get_db),
):
    """Refine a project with AI assistance."""
    result = await db.execute(
        select(Project).where(Project.slug == slug)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    builder = BuilderService()
    deployer = DeployerService()
    
    # Use provided files or project's current files
    current_files = data.current_files or project.files
    
    # Create build record
    build = Build(
        project_id=project.id,
        prompt=data.instruction,
        prompt_type="refine",
        status="building",
        started_at=datetime.utcnow(),
    )
    db.add(build)
    await db.flush()
    
    try:
        # Generate refined code
        result = await builder.generate_project(
            prompt=project.original_prompt,
            template_hint=project.template,
            existing_files=current_files,
            refinement_instructions=data.instruction,
        )
        
        # Update project
        project.files = result["files"]
        if result.get("name"):
            project.name = result["name"]
        if result.get("description"):
            project.description = result["description"]
        
        # Redeploy
        deployment = await deployer.deploy(
            project_id=str(project.id),
            slug=slug,
            files=result["files"],
            entry_point=result.get("entry_point", project.entry_point),
        )
        
        project.deployment_url = deployment["url"]
        project.deployment_id = deployment["deployment_id"]
        project.deployment_status = "live"
        
        # Update build
        build.status = "complete"
        build.completed_at = datetime.utcnow()
        build.generated_files = result["files"]
        build.tokens_used = result.get("tokens_used", 0)
        build.ai_model = result.get("ai_model")
        
        project.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(project)
        
        return ProjectResponse.model_validate(project)
        
    except Exception as e:
        build.status = "failed"
        build.error_message = str(e)
        build.completed_at = datetime.utcnow()
        
        await db.commit()
        
        raise HTTPException(status_code=500, detail=f"Refinement failed: {str(e)}")


@router.delete("/{slug}")
async def delete_project(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a project."""
    result = await db.execute(
        select(Project).where(Project.slug == slug)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Destroy deployment
    if project.deployment_id:
        deployer = DeployerService()
        try:
            await deployer.destroy(project.deployment_id, slug)
        except Exception:
            pass  # Ignore deployment deletion errors
    
    await db.delete(project)
    await db.commit()
    
    return {"status": "deleted", "slug": slug}


@router.post("/{slug}/fork", response_model=ProjectResponse)
async def fork_project(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Fork a project to create a copy."""
    result = await db.execute(
        select(Project).where(Project.slug == slug)
    )
    original = result.scalar_one_or_none()
    
    if not original:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Generate new slug
    new_slug = generate_slug(f"fork of {original.name or original.slug}")
    
    # Create forked project
    forked = Project(
        slug=new_slug,
        name=f"{original.name or 'Project'} (Fork)",
        description=original.description,
        original_prompt=original.original_prompt,
        refined_prompt=original.refined_prompt,
        template=original.template,
        tech_stack=original.tech_stack,
        files=original.files,
        entry_point=original.entry_point,
        deployment_status="pending",
    )
    db.add(forked)
    
    # Increment fork count
    original.forks += 1
    
    await db.flush()
    
    # Deploy the fork
    deployer = DeployerService()
    try:
        deployment = await deployer.deploy(
            project_id=str(forked.id),
            slug=new_slug,
            files=original.files,
            entry_point=original.entry_point,
        )
        
        forked.deployment_url = deployment["url"]
        forked.deployment_id = deployment["deployment_id"]
        forked.deployment_status = "live"
    except Exception as e:
        forked.deployment_status = "failed"
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Fork deployment failed: {str(e)}")
    
    await db.commit()
    await db.refresh(forked)
    
    return ProjectResponse.model_validate(forked)

