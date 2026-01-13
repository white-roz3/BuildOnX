"""
Cleanup service for expiring old projects and managing resources.
Run this as a cron job or background task.
"""

from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models import Project, Build, Tweet
from app.services.deployer import DeployerService
from app.services.alerts import alerts


class CleanupService:
    """Manage cleanup of expired resources."""
    
    def __init__(self):
        self.deployer = DeployerService()
    
    async def cleanup_expired_projects(self) -> dict:
        """
        Delete projects past their expiration date.
        Free tier projects expire after 7 days.
        
        Returns:
            {"deleted": int, "failed": int, "errors": list}
        """
        deleted = 0
        failed = 0
        errors = []
        
        async with async_session() as db:
            # Find expired projects
            result = await db.execute(
                select(Project).where(
                    and_(
                        Project.expires_at != None,
                        Project.expires_at < datetime.utcnow()
                    )
                )
            )
            
            expired_projects = result.scalars().all()
            
            for project in expired_projects:
                try:
                    # Destroy Fly.io deployment
                    if project.deployment_id:
                        try:
                            await self.deployer.destroy(
                                project.deployment_id,
                                project.slug
                            )
                        except Exception as e:
                            # Log but continue - deployment might already be gone
                            print(f"Could not destroy deployment for {project.slug}: {e}")
                    
                    # Delete project (cascades to builds)
                    await db.delete(project)
                    deleted += 1
                    print(f"Deleted expired project: {project.slug}")
                    
                except Exception as e:
                    failed += 1
                    errors.append(f"{project.slug}: {str(e)}")
                    print(f"Failed to delete {project.slug}: {e}")
            
            await db.commit()
        
        # Alert if there were failures
        if failed > 0:
            await alerts.send(
                title="Cleanup Errors",
                message=f"Failed to clean up {failed} projects",
                severity="warning",
                fields={"Errors": "\n".join(errors[:5])},
            )
        
        return {"deleted": deleted, "failed": failed, "errors": errors}
    
    async def cleanup_failed_deployments(self) -> dict:
        """
        Clean up projects that failed to deploy and are orphaned.
        
        Returns:
            {"cleaned": int}
        """
        cleaned = 0
        
        async with async_session() as db:
            # Find projects stuck in "building" or "deploying" for > 1 hour
            cutoff = datetime.utcnow() - timedelta(hours=1)
            
            result = await db.execute(
                select(Project).where(
                    and_(
                        Project.deployment_status.in_(["building", "deploying", "pending"]),
                        Project.created_at < cutoff
                    )
                )
            )
            
            stuck_projects = result.scalars().all()
            
            for project in stuck_projects:
                project.deployment_status = "failed"
                cleaned += 1
                print(f"Marked stuck project as failed: {project.slug}")
            
            await db.commit()
        
        return {"cleaned": cleaned}
    
    async def cleanup_old_builds(self, days: int = 30) -> dict:
        """
        Delete build records older than N days (keep project, delete history).
        This reduces database size.
        
        Returns:
            {"deleted": int}
        """
        async with async_session() as db:
            cutoff = datetime.utcnow() - timedelta(days=days)
            
            result = await db.execute(
                delete(Build).where(Build.created_at < cutoff)
            )
            
            await db.commit()
            
            return {"deleted": result.rowcount}
    
    async def cleanup_processed_tweets(self, days: int = 7) -> dict:
        """
        Delete processed tweet records older than N days.
        
        Returns:
            {"deleted": int}
        """
        async with async_session() as db:
            cutoff = datetime.utcnow() - timedelta(days=days)
            
            result = await db.execute(
                delete(Tweet).where(
                    and_(
                        Tweet.processed == True,
                        Tweet.created_at < cutoff
                    )
                )
            )
            
            await db.commit()
            
            return {"deleted": result.rowcount}
    
    async def get_resource_stats(self) -> dict:
        """
        Get stats about resources for monitoring.
        
        Returns:
            {"active_projects": int, "expired_pending": int, ...}
        """
        async with async_session() as db:
            active = await db.scalar(
                select(Project).where(Project.deployment_status == "live").count()
            ) or 0
            
            expired_pending = await db.scalar(
                select(Project).where(
                    and_(
                        Project.expires_at != None,
                        Project.expires_at < datetime.utcnow()
                    )
                ).count()
            ) or 0
            
            stuck = await db.scalar(
                select(Project).where(
                    Project.deployment_status.in_(["building", "deploying", "pending"])
                ).count()
            ) or 0
            
            return {
                "active_projects": active,
                "expired_pending_cleanup": expired_pending,
                "stuck_builds": stuck,
            }
    
    async def run_all_cleanup(self) -> dict:
        """
        Run all cleanup tasks. Call this from a cron job.
        
        Returns:
            Combined results from all cleanup tasks
        """
        results = {}
        
        # Expire old projects
        results["expired_projects"] = await self.cleanup_expired_projects()
        
        # Clean up stuck builds
        results["failed_deployments"] = await self.cleanup_failed_deployments()
        
        # Clean up old build history (keep 30 days)
        results["old_builds"] = await self.cleanup_old_builds(days=30)
        
        # Clean up old tweets (keep 7 days)
        results["old_tweets"] = await self.cleanup_processed_tweets(days=7)
        
        return results


# Singleton
cleanup = CleanupService()


# Convenience function for cron jobs
async def run_cleanup():
    """Run all cleanup tasks. Call this from cron."""
    return await cleanup.run_all_cleanup()

