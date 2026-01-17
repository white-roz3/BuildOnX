"""
Project version model for version history.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.project import Project


class ProjectVersion(Base):
    """A version/snapshot of a project."""
    
    __tablename__ = "project_versions"
    
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
    
    version_number: Mapped[int] = mapped_column(default=1)
    
    # Snapshot of files at this version
    files: Mapped[dict] = mapped_column(JSONB, nullable=False)
    
    # What changed
    change_description: Mapped[str] = mapped_column(Text, nullable=True)
    
    # Metadata
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    
    # Relationships
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="versions",
    )
    
    def __repr__(self) -> str:
        return f"<ProjectVersion {self.project_id} v{self.version_number}>"

