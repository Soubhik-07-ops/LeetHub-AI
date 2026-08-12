from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional
from app.api.deps import get_current_user_id
from app.core.rate_limit import limiter
from app.services.analytics_service import analytics_service
from app.services.intelligence_service import intelligence_service
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    TopicIntelligenceResponse,
    DifficultyIntelligenceResponse,
    LanguageIntelligenceResponse,
    ContestIntelligenceResponse,
    ActivityHeatmapResponse,
    SubmissionDetailResponse
)
import logging
from app.integrations.supabase.client import get_supabase_client

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/overview", response_model=AnalyticsOverviewResponse)
@limiter.limit("10/minute")
async def get_overview(
    request: Request,
    user_id: Optional[str] = Depends(get_current_user_id)
) -> AnalyticsOverviewResponse:
    """
    Returns dashboard overview metrics for the authenticated user.
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required for analytics")
        
    try:
        return analytics_service.get_overview(user_id=user_id)
    except Exception as e:
        logger.error(f"Error generating analytics overview: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/intelligence/topics", response_model=TopicIntelligenceResponse)
async def get_topics(user_id: Optional[str] = Depends(get_current_user_id)) -> TopicIntelligenceResponse:
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        return intelligence_service.get_topic_intelligence(user_id=user_id)
    except Exception as e:
        logger.error(f"Error generating topic intelligence: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/intelligence/difficulty", response_model=DifficultyIntelligenceResponse)
async def get_difficulty(user_id: Optional[str] = Depends(get_current_user_id)) -> DifficultyIntelligenceResponse:
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        return intelligence_service.get_difficulty_intelligence(user_id=user_id)
    except Exception as e:
        logger.error(f"Error generating difficulty intelligence: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/intelligence/languages", response_model=LanguageIntelligenceResponse)
async def get_languages(user_id: Optional[str] = Depends(get_current_user_id)) -> LanguageIntelligenceResponse:
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        return intelligence_service.get_language_intelligence(user_id=user_id)
    except Exception as e:
        logger.error(f"Error generating language intelligence: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/intelligence/contests", response_model=ContestIntelligenceResponse)
async def get_contests(user_id: Optional[str] = Depends(get_current_user_id)) -> ContestIntelligenceResponse:
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        return intelligence_service.get_contest_intelligence(user_id=user_id)
    except Exception as e:
        logger.error(f"Error generating contest intelligence: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/intelligence/heatmap", response_model=ActivityHeatmapResponse)
async def get_heatmap(user_id: Optional[str] = Depends(get_current_user_id)) -> ActivityHeatmapResponse:
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        return intelligence_service.get_activity_heatmap(user_id=user_id)
    except Exception as e:
        logger.error(f"Error generating heatmap: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/submissions/{leetcode_id}", response_model=SubmissionDetailResponse)
async def get_submission(leetcode_id: str, user_id: Optional[str] = Depends(get_current_user_id)) -> SubmissionDetailResponse:
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        client = get_supabase_client()
        res = client.table('submissions').select('*').eq('leetcode_submission_id', leetcode_id).eq('user_id', user_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Submission not found")
        
        row = res.data[0]
        return SubmissionDetailResponse(
            id=row['id'],
            leetcode_submission_id=row['leetcode_submission_id'],
            problem_slug=row['problem_slug'],
            problem_title=row['problem_title'],
            status=row['status'],
            source_code=row['source_code'],
            submitted_at=row['submitted_at'],
            github_sync_status=row['github_sync_status'],
            topics=row.get('topics') or [],
            difficulty=row.get('difficulty') or 'Unknown',
            language=row.get('language') or 'Unknown',
            contest_slug=row.get('contest_slug')
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching submission detail: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

