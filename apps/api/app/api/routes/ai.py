from fastapi import APIRouter, Depends, HTTPException, Request
from app.api.deps import get_current_user_id
from app.services.ai_coach_service import ai_coach_service
from app.services.membership_service import membership_service
from app.schemas.ai_coach import AIAnalysisResult, AIChatRequest, AIChatResponse
from app.core.rate_limit import limiter
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/usage")
async def get_usage(user_id: str = Depends(get_current_user_id)):
    """
    Returns AI usage stats and limits for the user.
    """
    return membership_service.get_user_ai_usage_stats(user_id)

@router.post("/analyze/{submission_id}", response_model=AIAnalysisResult)
@limiter.limit("5/minute")
async def analyze_submission(
    request: Request,
    submission_id: str,
    force: bool = False,
    user_id: str = Depends(get_current_user_id)
):
    """
    Analyzes a specific submission using the AI Coach.
    Returns structured feedback on complexity, quality, mistakes, and hints.
    """
    try:
        result = await ai_coach_service.analyze_submission(user_id=user_id, submission_id=submission_id, force=force)
        return result
    except ValueError as e:
        logger.warning(f"Validation error in analyze_submission: {e}")
        raise HTTPException(status_code=403, detail=str(e))
    except RuntimeError as e:
        logger.error(f"Upstream AI provider error: {e}")
        raise HTTPException(status_code=502, detail="Failed to communicate with AI provider.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in analyze_submission: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/chat", response_model=AIChatResponse)
@limiter.limit("20/hour")
async def chat(
    request: Request,
    chat_req: AIChatRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Continues or starts a conversation with the AI Coach.
    """
    try:
        result = await ai_coach_service.chat(
            user_id=user_id, 
            message=chat_req.message, 
            conversation_id=str(chat_req.conversation_id) if chat_req.conversation_id else None,
            submission_id=str(chat_req.submission_id) if chat_req.submission_id else None
        )
        return result
    except ValueError as e:
        logger.warning(f"Validation error in chat: {e}")
        raise HTTPException(status_code=403, detail=str(e))
    except RuntimeError as e:
        logger.error(f"Upstream AI provider error: {e}")
        raise HTTPException(status_code=502, detail="Failed to communicate with AI provider.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in chat: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
