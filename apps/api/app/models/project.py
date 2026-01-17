"""
Project model - the generated applications.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import String, Integer, Text, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.build import Build
    from app.models.version import ProjectVersion
    from app.models.like import ProjectLike
    from app.models.comment import ProjectComment


class Project(Base):
    """A generated application project."""
    
    __tablename__ = "projects"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    # Owner
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )
    
    # Identity
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(256))
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # Prompts
    original_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    refined_prompt: Mapped[Optional[str]] = mapped_column(Text)
    
    # Project configuration
    template: Mapped[str] = mapped_column(String(64), default="static-site")
    tech_stack: Mapped[dict] = mapped_column(JSONB, default=dict)
    
    # Generated content
    files: Mapped[dict] = mapped_column(JSONB, default=dict)
    entry_point: Mapped[str] = mapped_column(String(256), default="index.html")
    
    # Deployment info
    deployment_url: Mapped[Optional[str]] = mapped_column(Text)
    deployment_status: Mapped[str] = mapped_column(String(32), default="pending")
    deployment_id: Mapped[Optional[str]] = mapped_column(String(128))
    
    # Metadata
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    views: Mapped[int] = mapped_column(Integer, default=0)
    forks: Mapped[int] = mapped_column(Integer, default=0)
    
    # Tweet linkage
    source_tweet_id: Mapped[Optional[str]] = mapped_column(String(64))
    reply_tweet_id: Mapped[Optional[str]] = mapped_column(String(64))
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    # Relationships
    user: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="projects",
    )
    builds: Mapped[List["Build"]] = relationship(
        "Build",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    versions: Mapped[List["ProjectVersion"]] = relationship(
        "ProjectVersion",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="desc(ProjectVersion.version_number)",
    )
    likes: Mapped[List["ProjectLike"]] = relationship(
        "ProjectLike",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    comments: Mapped[List["ProjectComment"]] = relationship(
        "ProjectComment",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="desc(ProjectComment.created_at)",
    )
    
    def __repr__(self) -> str:
        return f"<Project {self.slug}>"
    
    @property
    def public_url(self) -> str:
        """Get the public URL for this project."""
        return f"https://BuildOnX.app/p/{self.slug}"
    
    @property
    def studio_url(self) -> str:
        """Get the studio editor URL."""
        return f"https://BuildOnX.app/studio/{self.slug}"

