"""
Admin routes for analytics and system management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from app.config import settings
from app.services.analytics import analytics
from app.services.cleanup import cleanup

router = APIRouter(prefix="/admin", tags=["admin"])


# ─────────────────────────────────────────────────────────────
# Simple API Key Auth for Admin Endpoints
# ─────────────────────────────────────────────────────────────

def verify_admin_key(x_admin_key: str = None):
    """Verify admin API key from header."""
    expected = getattr(settings, "admin_api_key", None)
    
    # In debug mode, allow without key
    if settings.debug and not expected:
        return True
    
    if not x_admin_key or x_admin_key != expected:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    return True


# ─────────────────────────────────────────────────────────────
# Analytics Endpoints
# ─────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_dashboard_stats(_: bool = Depends(verify_admin_key)):
    """Get overview stats for admin dashboard."""
    return await analytics.get_dashboard_stats()


@router.get("/popular")
async def get_popular_projects(
    limit: int = Query(default=10, ge=1, le=50),
    _: bool = Depends(verify_admin_key),
):
    """Get most popular projects."""
    return await analytics.get_popular_projects(limit=limit)


@router.get("/builds/recent")
async def get_recent_builds(
    limit: int = Query(default=20, ge=1, le=100),
    _: bool = Depends(verify_admin_key),
):
    """Get recent build activity."""
    return await analytics.get_recent_builds(limit=limit)


@router.get("/builds/by-day")
async def get_builds_by_day(
    days: int = Query(default=30, ge=1, le=90),
    _: bool = Depends(verify_admin_key),
):
    """Get daily build stats for charting."""
    return await analytics.get_build_stats_by_day(days=days)


@router.get("/templates")
async def get_template_usage(_: bool = Depends(verify_admin_key)):
    """Get template usage breakdown."""
    return await analytics.get_template_usage()


# ─────────────────────────────────────────────────────────────
# Cleanup Endpoints
# ─────────────────────────────────────────────────────────────

@router.post("/cleanup/expired")
async def cleanup_expired_projects(_: bool = Depends(verify_admin_key)):
    """Manually trigger cleanup of expired projects."""
    result = await cleanup.cleanup_expired_projects()
    return {"status": "completed", **result}


@router.post("/cleanup/failed")
async def cleanup_failed_deployments(_: bool = Depends(verify_admin_key)):
    """Clean up stuck/failed deployments."""
    result = await cleanup.cleanup_failed_deployments()
    return {"status": "completed", **result}


@router.post("/cleanup/all")
async def run_full_cleanup(_: bool = Depends(verify_admin_key)):
    """Run all cleanup tasks."""
    result = await cleanup.run_all_cleanup()
    return {"status": "completed", **result}


@router.get("/resources")
async def get_resource_stats(_: bool = Depends(verify_admin_key)):
    """Get resource usage stats."""
    return await cleanup.get_resource_stats()


# ─────────────────────────────────────────────────────────────
# System Endpoints
# ─────────────────────────────────────────────────────────────

@router.get("/health/detailed")
async def detailed_health_check(_: bool = Depends(verify_admin_key)):
    """Detailed health check with component status."""
    from app.database import engine
    import redis.asyncio as redis
    
    health = {"status": "healthy", "components": {}}
    
    # Check database
    try:
        async with engine.connect() as conn:
            await conn.execute("SELECT 1")
        health["components"]["database"] = "healthy"
    except Exception as e:
        health["components"]["database"] = f"unhealthy: {str(e)}"
        health["status"] = "degraded"
    
    # Check Redis
    try:
        r = await redis.from_url(settings.redis_url)
        await r.ping()
        await r.close()
        health["components"]["redis"] = "healthy"
    except Exception as e:
        health["components"]["redis"] = f"unhealthy: {str(e)}"
        health["status"] = "degraded"
    
    return health

