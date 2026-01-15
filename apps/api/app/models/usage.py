"""
Usage tracking model for billing and analytics.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, DateTime, ForeignKey, func, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UsageRecord(Base):
    """
    Track individual usage events for billing and analytics.
    
    Actions tracked:
    - build: New project build
    - refine: AI-assisted refinement
    - deploy: Deployment (re-deploy counts)
    - view: Project view (for popular project analytics)
    """
    
    __tablename__ = "usage_records"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    # Who
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )
    
    # What
    action: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    
    # Resource reference (optional)
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
    )
    build_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("builds.id", ondelete="SET NULL"),
        nullable=True,
    )
    
    # Usage metrics
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    compute_seconds: Mapped[int] = mapped_column(Integer, default=0)
    
    # When
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )
    
    # Indexes for common queries
    __table_args__ = (
        Index("idx_usage_user_date", "user_id", "created_at"),
        Index("idx_usage_action_date", "action", "created_at"),
    )


# ─────────────────────────────────────────────────────────────
# Usage Tracking Functions
# ─────────────────────────────────────────────────────────────

from datetime import timedelta
from sqlalchemy import select
from app.database import async_session


async def track_usage(
    action: str,
    user_id: str = None,
    project_id: str = None,
    build_id: str = None,
    tokens: int = 0,
    compute_seconds: int = 0,
):
    """
    Record a usage event.
    
    Args:
        action: Type of action (build, refine, deploy, view)
        user_id: Optional user ID
        project_id: Optional project ID
        build_id: Optional build ID
        tokens: AI tokens consumed
        compute_seconds: Compute time used
    """
    async with async_session() as db:
        record = UsageRecord(
            action=action,
            user_id=uuid.UUID(user_id) if user_id else None,
            project_id=uuid.UUID(project_id) if project_id else None,
            build_id=uuid.UUID(build_id) if build_id else None,
            tokens_used=tokens,
            compute_seconds=compute_seconds,
        )
        db.add(record)
        await db.commit()


async def get_user_usage(user_id: str, days: int = 30) -> dict:
    """
    Get usage stats for a user over the past N days.
    
    Returns:
        {
            "builds": int,
            "refines": int,
            "total_tokens": int,
            "total_compute_seconds": int,
            "estimated_cost": float
        }
    """
    async with async_session() as db:
        uid = uuid.UUID(user_id)
        start = datetime.utcnow() - timedelta(days=days)
        
        # Count builds
        builds = await db.scalar(
            select(func.count(UsageRecord.id))
            .where(UsageRecord.user_id == uid)
            .where(UsageRecord.action == "build")
            .where(UsageRecord.created_at >= start)
        ) or 0
        
        # Count refines
        refines = await db.scalar(
            select(func.count(UsageRecord.id))
            .where(UsageRecord.user_id == uid)
            .where(UsageRecord.action == "refine")
            .where(UsageRecord.created_at >= start)
        ) or 0
        
        # Sum tokens
        total_tokens = await db.scalar(
            select(func.sum(UsageRecord.tokens_used))
            .where(UsageRecord.user_id == uid)
            .where(UsageRecord.created_at >= start)
        ) or 0
        
        # Sum compute
        total_compute = await db.scalar(
            select(func.sum(UsageRecord.compute_seconds))
            .where(UsageRecord.user_id == uid)
            .where(UsageRecord.created_at >= start)
        ) or 0
        
        # Estimate cost (rough)
        estimated_cost = total_tokens * 0.000008  # ~$8/1M tokens average
        
        return {
            "builds": builds,
            "refines": refines,
            "total_tokens": total_tokens,
            "total_compute_seconds": total_compute,
            "estimated_cost": round(estimated_cost, 4),
        }


async def get_monthly_usage(user_id: str) -> dict:
    """Get current month's usage for billing."""
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    async with async_session() as db:
        uid = uuid.UUID(user_id)
        
        result = await db.execute(
            select(
                func.count(UsageRecord.id).label("total_actions"),
                func.sum(UsageRecord.tokens_used).label("total_tokens"),
            )
            .where(UsageRecord.user_id == uid)
            .where(UsageRecord.created_at >= start_of_month)
        )
        
        row = result.one()
        return {
            "actions": row.total_actions or 0,
            "tokens": row.total_tokens or 0,
            "period_start": start_of_month.isoformat(),
        }


