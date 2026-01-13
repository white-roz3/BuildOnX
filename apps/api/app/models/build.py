"""
Build model - individual build attempts/iterations.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, func, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.project import Project


class Build(Base):
    """A single build attempt for a project."""
    
    __tablename__ = "builds"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    # Parent project
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    
    # Build input
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_type: Mapped[str] = mapped_column(String(32), default="initial")  # initial, refine, fork
    
    # Build process
    status: Mapped[str] = mapped_column(String(32), default="queued")  # queued, building, deploying, complete, failed
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    # AI interaction
    ai_model: Mapped[Optional[str]] = mapped_column(String(64))
    ai_request_id: Mapped[Optional[str]] = mapped_column(String(128))
    tokens_used: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Output
    generated_files: Mapped[dict] = mapped_column(JSONB, default=dict)
    build_logs: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text))
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    
    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    
    # Relationships
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="builds",
    )
    
    def __repr__(self) -> str:
        return f"<Build {self.id} ({self.status})>"
    
    @property
    def duration_seconds(self) -> Optional[float]:
        """Get build duration in seconds."""
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None

