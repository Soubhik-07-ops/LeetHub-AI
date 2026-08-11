from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "LeetHub-AI API"
    API_V1_STR: str = "/api/v1"
    
    # Environment Configuration
    FRONTEND_URL: str = "http://localhost:3000"
    REDIS_URL: Optional[str] = None
    
    # Supabase Integration
    SUPABASE_URL: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    ALLOW_ANONYMOUS_SUBMISSIONS: bool = False
    REQUIRE_EMAIL_VERIFICATION: bool = True
    
    # GitHub App Integration
    GITHUB_APP_ID: Optional[str] = None
    GITHUB_APP_CLIENT_ID: Optional[str] = None
    GITHUB_APP_CLIENT_SECRET: Optional[str] = None
    GITHUB_APP_PRIVATE_KEY: Optional[str] = None
    GITHUB_APP_SLUG: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
