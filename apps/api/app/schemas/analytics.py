from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class ActivityDay(BaseModel):
    date: str # YYYY-MM-DD in UTC
    submissions: int

class RecentSubmission(BaseModel):
    leetcodeSubmissionId: str
    problemSlug: str
    problemTitle: str
    status: str
    submittedAt: datetime
    githubSyncStatus: str
    
    model_config = ConfigDict(populate_by_name=True)

class TrendIntelligence(BaseModel):
    recent_attempted: int
    recent_accepted: int
    previous_attempted: int
    previous_accepted: int
    recent_acceptance_rate: float
    previous_acceptance_rate: float
    acceptance_rate_delta: float
    volume_delta: int
    classification: str
    recommendation: str

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
    trend: Optional[TrendIntelligence] = None

class TopicIntelligence(BaseModel):
    topic: str
    attempted: int
    accepted: int
    acceptance_rate: float
    total_submissions: int
    strength: str
    weakness_score: float
    confidence: str

class TopicIntelligenceResponse(BaseModel):
    topics: List[TopicIntelligence]

class DifficultyIntelligence(BaseModel):
    difficulty: str
    attempted: int
    accepted: int
    acceptance_rate: float
    total_submissions: int

class DifficultyIntelligenceResponse(BaseModel):
    difficulties: List[DifficultyIntelligence]

class LanguageIntelligence(BaseModel):
    language: str
    attempted: int
    accepted: int
    acceptance_rate: float
    total_submissions: int

class LanguageIntelligenceResponse(BaseModel):
    languages: List[LanguageIntelligence]

class ContestIntelligence(BaseModel):
    contest_type: str
    attempted: int
    accepted: int
    acceptance_rate: float
    total_submissions: int

class ContestIntelligenceResponse(BaseModel):
    contests: List[ContestIntelligence]

class HeatmapDay(BaseModel):
    activity_date: str
    submissions: int

class ActivityHeatmapResponse(BaseModel):
    heatmap: List[HeatmapDay]

class SubmissionDetailResponse(BaseModel):
    id: str
    leetcode_submission_id: str
    problem_slug: str
    problem_title: str
    status: str
    source_code: str
    submitted_at: datetime
    github_sync_status: str
    topics: List[str]
    difficulty: str
    language: str
    contest_slug: Optional[str]

