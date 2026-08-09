from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "LeetHub-AI API"
    API_V1_STR: str = "/api/v1"
    
    # GitHub Integration
    GITHUB_TOKEN: Optional[str] = None
    GITHUB_OWNER: Optional[str] = None
    GITHUB_REPOSITORY: Optional[str] = None
    GITHUB_BRANCH: str = "main"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
