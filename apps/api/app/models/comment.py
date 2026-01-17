"""
Project comment model.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.project import Project


class ProjectComment(Base):
    """A comment on a project."""
    
    __tablename__ = "project_comments"
    
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
    
    # Commenter identifier (username or IP)
    author: Mapped[str] = mapped_column(String(256), nullable=False)
    
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    
    # Relationships
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="comments",
    )
    
    def __repr__(self) -> str:
        return f"<ProjectComment {self.id} on {self.project_id}>"

