import logging
from typing import Dict, Any
from app.integrations.supabase.client import get_supabase_client
from app.core.config import settings

logger = logging.getLogger(__name__)

class MembershipService:
    def get_user_ai_usage_stats(self, user_id: str) -> Dict[str, Any]:
        client = get_supabase_client()
        try:
            # We call the RPC we defined in 011_membership_and_usage.sql
            res = client.rpc("get_user_ai_usage_stats", {"p_user_id": user_id}).execute()
            if not res.data:
                raise ValueError("Failed to retrieve usage stats")
            return res.data
        except Exception as e:
            logger.error(f"Error fetching membership stats: {e}")
            # Fallback to free plan with zero quota if error occurs
            return {
                "plan": "free",
                "analysis": {"limit": settings.FREE_ANALYSIS_LIMIT, "used": settings.FREE_ANALYSIS_LIMIT, "remaining": 0, "period": "daily", "reset_at": None},
                "chat": {"limit": settings.FREE_CHAT_LIMIT, "used": settings.FREE_CHAT_LIMIT, "remaining": 0, "period": "daily", "reset_at": None}
            }

membership_service = MembershipService()
