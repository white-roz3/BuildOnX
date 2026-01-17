"""
Project like model.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, DateTime, ForeignKey, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.project import Project


class ProjectLike(Base):
    """A like on a project."""
    
    __tablename__ = "project_likes"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    
    # Identifier for the liker (IP or user ID in future)
    liker_id: Mapped[str] = mapped_column(String(256), nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    
    # Relationships
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="likes",
    )
    
    # Ensure one like per project per liker
    __table_args__ = (
        UniqueConstraint('project_id', 'liker_id', name='_project_liker_uc'),
    )
    
    def __repr__(self) -> str:
        return f"<ProjectLike {self.project_id} by {self.liker_id}>"

