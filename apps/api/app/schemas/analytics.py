from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class ActivityDay(BaseModel):
    date: str # YYYY-MM-DD in UTC
    submissions: int

class RecentSubmission(BaseModel):
    problemSlug: str
    problemTitle: str
    status: str
    submittedAt: datetime
    githubSyncStatus: str
    
    model_config = ConfigDict(populate_by_name=True)

class AnalyticsOverviewResponse(BaseModel):
    total_submissions: int
    unique_problems: int
    accepted_submissions: int
    rejected_submissions: int
    acceptance_rate: float
    github_synced_count: int
    github_failed_count: int
    github_skipped_count: int
    current_streak: int
    longest_streak: int
    activity_by_day: List[ActivityDay]
    recent_submissions: List[RecentSubmission]
