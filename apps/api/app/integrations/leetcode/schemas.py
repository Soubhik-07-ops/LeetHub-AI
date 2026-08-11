from pydantic import BaseModel, field_validator, Field
from datetime import datetime
from enum import Enum

class SubmissionStatus(str, Enum):
    accepted = "accepted"
    rejected = "rejected"
    pending = "pending"
    unknown = "unknown"

class OperationType(str, Enum):
    created = "created"
    duplicate = "duplicate"

class GitHubSyncStatus(str, Enum):
    synced = "synced"
    failed = "failed"
    skipped = "skipped"

class LeetCodeSubmissionRequest(BaseModel):
    problemSlug: str
    problemTitle: str
    status: SubmissionStatus
    source: str
    sourceCode: str = Field(..., max_length=102400)
    submittedAt: datetime
    submissionId: str

    @field_validator("problemSlug")
    @classmethod
    def validate_problem_slug(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("problemSlug must not be empty")
        return v

    @field_validator("problemTitle")
    @classmethod
    def validate_problem_title(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("problemTitle must not be empty")
        return v

    @field_validator("source")
    @classmethod
    def validate_source(cls, v: str) -> str:
        if v != "leetcode":
            raise ValueError("source must equal 'leetcode'")
        return v

    @field_validator("sourceCode")
    @classmethod
    def validate_source_code(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("sourceCode must not be empty")
        return v

    @field_validator("submissionId")
    @classmethod
    def validate_submission_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("submissionId must not be empty")
        return v

class LeetCodeSubmissionResponse(BaseModel):
    success: bool
    operation: OperationType
    submissionId: str
    problemSlug: str
    status: SubmissionStatus
    receivedAt: datetime
    githubSync: GitHubSyncStatus
