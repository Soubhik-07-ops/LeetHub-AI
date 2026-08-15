from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "LeetBranch API"
    API_V1_STR: str = "/api/v1"
    
    # Environment Configuration
    FRONTEND_URL: str
    CORS_ORIGINS: str
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

    # AI Configuration
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_BASE_URL: str
    OPENROUTER_FREE_MODEL: str
    OPENROUTER_PREMIUM_MODEL: str

    # NVIDIA AI Configuration
    # NVIDIA AI Configuration
    NVIDIA_API_KEY: Optional[str] = None
    NVIDIA_BASE_URL: str
    NVIDIA_MODEL: str

    # Business Rules Limits
    FREE_ANALYSIS_LIMIT: int = 5
    FREE_CHAT_LIMIT: int = 10
    PREMIUM_ANALYSIS_LIMIT: int = 500
    PREMIUM_CHAT_LIMIT: int = 1000

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
