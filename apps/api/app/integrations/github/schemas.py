from pydantic import BaseModel
from typing import Optional
from enum import Enum

class GitHubOperation(str, Enum):
    CREATED = "created"
    UPDATED = "updated"
    NOOP = "noop"

class GitHubRepository(BaseModel):
    full_name: str
    private: bool
    html_url: str
    default_branch: str

class GitHubFileRequest(BaseModel):
    owner: str
    repository: str
    path: str
    content: str
    commit_message: str
    branch: str

class GitHubFileResult(BaseModel):
    success: bool
    operation: Optional[GitHubOperation] = None
    path: str
    commit_sha: Optional[str] = None
    commit_url: Optional[str] = None
    error_message: Optional[str] = None
