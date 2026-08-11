from fastapi import APIRouter, Depends, HTTPException, Response
from typing import Optional
from app.api.deps import get_current_user_id
from app.schemas.analytics import AnalyticsOverviewResponse
from app.services.analytics_service import analytics_service
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/overview", response_model=AnalyticsOverviewResponse)
async def get_overview(
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
