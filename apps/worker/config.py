"""
Worker configuration.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Worker settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    
    # Database
    database_url: str = "postgresql+asyncpg://buildonx:buildonx@localhost:5432/buildonx"
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    
    # Twitter/X API
    twitter_api_key: str = ""
    twitter_api_secret: str = ""
    twitter_bearer_token: str = ""
    twitter_access_token: str = ""
    twitter_access_secret: str = ""
    twitter_bot_user_id: str = ""
    twitter_bot_username: str = "BuildAppsOnX"
    
    # Anthropic
    anthropic_api_key: str = ""
    
    # Fly.io
    fly_api_token: str = ""
    fly_org: str = ""
    
    # Base domain
    base_domain: str = "BuildOnX.app"


settings = Settings()

