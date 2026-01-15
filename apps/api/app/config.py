"""
Application configuration using Pydantic Settings.
"""

from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    
    # App
    app_name: str = "HeyClaude"
    debug: bool = False
    secret_key: str = "change-me-in-production"
    base_domain: str = "heyclaude.app"
    api_url: str = "https://heyclaude-api-production.up.railway.app"
    frontend_url: str = "https://heyclaude-web-production.up.railway.app"
    
    # Database (Railway provides postgresql://, we need postgresql+asyncpg://)
    database_url: str = "postgresql+asyncpg://buildonx:buildonx@localhost:5432/buildonx"
    
    @property
    def async_database_url(self) -> str:
        """Convert database URL to async format."""
        url = self.database_url
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        return url
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    
    # Twitter/X API
    twitter_api_key: str = ""
    twitter_api_secret: str = ""
    twitter_bearer_token: str = ""
    twitter_access_token: str = ""
    twitter_access_secret: str = ""
    twitter_bot_user_id: str = ""
    twitter_bot_username: str = "buildheyclaude"
    twitter_bot_enabled: bool = True  # Enable/disable auto-processing of mentions
    
    # Anthropic
    anthropic_api_key: str = ""
    
    # Fly.io
    fly_api_token: str = ""
    fly_org: str = ""
    
    # Cloudflare (optional)
    cloudflare_account_id: Optional[str] = None
    cloudflare_api_token: Optional[str] = None
    
    # Rate Limits
    free_tier_builds_per_hour: int = 3
    free_tier_builds_per_day: int = 10
    project_expiry_days: int = 7
    
    # Alerts
    discord_webhook_url: Optional[str] = None
    slack_webhook_url: Optional[str] = None
    
    # Admin
    admin_api_key: Optional[str] = None


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()

