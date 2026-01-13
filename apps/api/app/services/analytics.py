"""
Analytics service for tracking platform metrics.
"""

from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models import Project, Build, User


class AnalyticsService:
    """Track and query platform analytics."""
    
    async def get_dashboard_stats(self) -> dict:
        """
        Get overview stats for admin dashboard.
        
        Returns:
            {
                "total_users": int,
                "total_projects": int,
                "total_builds": int,
                "builds_today": int,
                "builds_this_week": int,
                "success_rate": float,
                "tokens_today": int,
                "estimated_cost_today": float,
                "active_deployments": int
            }
        """
        async with async_session() as db:
            now = datetime.utcnow()
            today = now.replace(hour=0, minute=0, second=0, microsecond=0)
            week_ago = now - timedelta(days=7)
            
            # Total counts
            total_users = await db.scalar(select(func.count(User.id))) or 0
            total_projects = await db.scalar(select(func.count(Project.id))) or 0
            total_builds = await db.scalar(select(func.count(Build.id))) or 0
            
            # Today's activity
            builds_today = await db.scalar(
                select(func.count(Build.id)).where(Build.created_at >= today)
            ) or 0
            
            # This week's activity
            builds_this_week = await db.scalar(
                select(func.count(Build.id)).where(Build.created_at >= week_ago)
            ) or 0
            
            # Success rate
            successful = await db.scalar(
                select(func.count(Build.id)).where(Build.status == "complete")
            ) or 0
            failed = await db.scalar(
                select(func.count(Build.id)).where(Build.status == "failed")
            ) or 0
            
            total_finished = successful + failed
            success_rate = (successful / total_finished * 100) if total_finished > 0 else 0
            
            # Token usage (for cost tracking)
            tokens_today = await db.scalar(
                select(func.sum(Build.tokens_used)).where(Build.created_at >= today)
            ) or 0
            
            # Active deployments
            active_deployments = await db.scalar(
                select(func.count(Project.id)).where(Project.deployment_status == "live")
            ) or 0
            
            # Estimate cost (Sonnet: ~$3/1M input, $15/1M output, rough avg $0.000008/token)
            estimated_cost = tokens_today * 0.000008
            
            return {
                "total_users": total_users,
                "total_projects": total_projects,
                "total_builds": total_builds,
                "builds_today": builds_today,
                "builds_this_week": builds_this_week,
                "success_rate": round(success_rate, 1),
                "tokens_today": tokens_today,
                "estimated_cost_today": round(estimated_cost, 2),
                "active_deployments": active_deployments,
            }
    
    async def get_popular_projects(self, limit: int = 10) -> list:
        """Get most viewed public projects."""
        async with async_session() as db:
            result = await db.execute(
                select(Project.slug, Project.name, Project.description, Project.views, Project.forks)
                .where(Project.is_public == True)
                .where(Project.deployment_status == "live")
                .order_by(Project.views.desc())
                .limit(limit)
            )
            
            return [
                {
                    "slug": row.slug,
                    "name": row.name,
                    "description": row.description[:100] if row.description else None,
                    "views": row.views,
                    "forks": row.forks,
                }
                for row in result
            ]
    
    async def get_recent_builds(self, limit: int = 20) -> list:
        """Get recent build activity."""
        async with async_session() as db:
            result = await db.execute(
                select(
                    Build.id,
                    Build.status,
                    Build.prompt,
                    Build.tokens_used,
                    Build.created_at,
                    Project.slug,
                    Project.name,
                )
                .join(Project, Build.project_id == Project.id)
                .order_by(Build.created_at.desc())
                .limit(limit)
            )
            
            return [
                {
                    "build_id": str(row.id),
                    "status": row.status,
                    "prompt": row.prompt[:80] + "..." if len(row.prompt) > 80 else row.prompt,
                    "tokens": row.tokens_used,
                    "created_at": row.created_at.isoformat(),
                    "project_slug": row.slug,
                    "project_name": row.name,
                }
                for row in result
            ]
    
    async def get_build_stats_by_day(self, days: int = 30) -> list:
        """Get daily build counts for charting."""
        async with async_session() as db:
            start_date = datetime.utcnow() - timedelta(days=days)
            
            result = await db.execute(
                select(
                    func.date(Build.created_at).label("date"),
                    func.count(Build.id).label("total"),
                    func.sum(
                        func.cast(Build.status == "complete", type_=int)
                    ).label("successful"),
                )
                .where(Build.created_at >= start_date)
                .group_by(func.date(Build.created_at))
                .order_by(func.date(Build.created_at))
            )
            
            return [
                {
                    "date": row.date.isoformat() if row.date else None,
                    "total": row.total,
                    "successful": row.successful or 0,
                }
                for row in result
            ]
    
    async def get_template_usage(self) -> list:
        """Get breakdown of template usage."""
        async with async_session() as db:
            result = await db.execute(
                select(
                    Project.template,
                    func.count(Project.id).label("count")
                )
                .group_by(Project.template)
                .order_by(func.count(Project.id).desc())
            )
            
            return [
                {"template": row.template, "count": row.count}
                for row in result
            ]
    
    async def get_user_stats(self, user_id: str) -> dict:
        """Get stats for a specific user."""
        async with async_session() as db:
            from uuid import UUID
            uid = UUID(user_id)
            
            projects_count = await db.scalar(
                select(func.count(Project.id)).where(Project.user_id == uid)
            ) or 0
            
            builds_count = await db.scalar(
                select(func.count(Build.id))
                .join(Project, Build.project_id == Project.id)
                .where(Project.user_id == uid)
            ) or 0
            
            total_views = await db.scalar(
                select(func.sum(Project.views)).where(Project.user_id == uid)
            ) or 0
            
            return {
                "projects": projects_count,
                "builds": builds_count,
                "total_views": total_views,
            }


# Singleton
analytics = AnalyticsService()

