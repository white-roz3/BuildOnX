"""
Tweet model - tracking processed tweets.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.project import Project


class Tweet(Base):
    """A processed tweet from X/Twitter."""
    
    __tablename__ = "tweets"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    # Twitter identity
    tweet_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    
    # Relationships
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id"),
        nullable=True,
    )
    
    # Tweet metadata
    tweet_type: Mapped[Optional[str]] = mapped_column(String(32))  # mention, reply, quote
    content: Mapped[Optional[str]] = mapped_column(Text)
    conversation_id: Mapped[Optional[str]] = mapped_column(String(64))
    
    # Processing status
    processed: Mapped[bool] = mapped_column(Boolean, default=False)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    
    # Relationships
    user: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="tweets",
    )
    
    def __repr__(self) -> str:
        return f"<Tweet {self.tweet_id}>"


