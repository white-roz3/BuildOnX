"""
User model - linked to X/Twitter accounts.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import String, Integer, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.tweet import Tweet


class User(Base):
    """User account linked to X/Twitter."""
    
    __tablename__ = "users"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    # Twitter/X identity
    x_user_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    x_username: Mapped[str] = mapped_column(String(64), nullable=False)
    x_display_name: Mapped[Optional[str]] = mapped_column(String(256))
    x_profile_image: Mapped[Optional[str]] = mapped_column(Text)
    
    # OAuth tokens (encrypted)
    access_token_encrypted: Mapped[Optional[str]] = mapped_column(Text)
    refresh_token_encrypted: Mapped[Optional[str]] = mapped_column(Text)
    
    # Subscription
    tier: Mapped[str] = mapped_column(String(32), default="free")  # free, pro, enterprise
    credits: Mapped[int] = mapped_column(Integer, default=5)
    
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
    
    # Relationships
    projects: Mapped[List["Project"]] = relationship(
        "Project",
        back_populates="user",
        lazy="selectin",
    )
    tweets: Mapped[List["Tweet"]] = relationship(
        "Tweet",
        back_populates="user",
        lazy="selectin",
    )
    
    def __repr__(self) -> str:
        return f"<User @{self.x_username}>"
    
    @property
    def is_pro(self) -> bool:
        """Check if user has pro tier."""
        return self.tier in ("pro", "enterprise")


