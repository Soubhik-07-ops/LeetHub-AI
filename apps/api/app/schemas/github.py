from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class GitHubConnectionCreate(BaseModel):
    repository_id: str
    default_branch: str = "main"

class GitHubConnectionResponse(BaseModel):
    installation_id: str
    github_account_login: str
    repository_id: str
    repository_full_name: str
    default_branch: str
    created_at: datetime
