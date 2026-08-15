import logging
from typing import Tuple, Optional
from app.integrations.supabase.client import get_supabase_client
from app.core.config import settings

logger = logging.getLogger(__name__)

class AIUsageService:
    def reserve_quota(self, user_id: str, feature: str) -> Tuple[bool, Optional[str], Optional[str], Optional[str]]:
        """
        Atomically checks and reserves quota.
        Returns (is_allowed, usage_id, model_to_use, provider_name)
        """
        client = get_supabase_client()
        try:
            res = client.rpc("check_and_reserve_ai_quota", {
                "p_user_id": user_id,
                "p_feature": feature
            }).execute()
            
            if not res.data or len(res.data) == 0:
                return False, None, None, None
                
            row = res.data[0]
            is_allowed = row.get("is_allowed", False)
            usage_id = row.get("usage_id")
            model_to_use = row.get("model_to_use")
            
            # Substitute config based models if it's the placeholder from DB seed
            if model_to_use == "free-model-placeholder":
                model_to_use = getattr(settings, "OPENROUTER_FREE_MODEL", "openrouter/free")
                provider_name = "openrouter"
            elif model_to_use == "premium-model-placeholder":
                model_to_use = getattr(settings, "NVIDIA_MODEL", "nvidia/nemotron-3.5-lightning-30b-a3b")
                provider_name = "nvidia"
            else:
                provider_name = "openrouter"
                
            return is_allowed, usage_id, model_to_use, provider_name
        except Exception as e:
            logger.error(f"Error reserving AI quota for user {user_id}, feature {feature}: {e}")
            return False, None, None, None

    def finalize_usage(self, usage_id: str, status: str, input_tokens: int = 0, output_tokens: int = 0, cost: float = 0.0):
        """
        Updates the usage row to 'completed' or 'failed'.
        If 'failed', the quota is effectively refunded because the RPC count ignores 'failed' rows.
        """
        if not usage_id:
            return
            
        client = get_supabase_client()
        try:
            client.table("ai_usage").update({
                "status": status,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "estimated_cost": cost
            }).eq("id", usage_id).execute()
        except Exception as e:
            logger.error(f"Error finalizing AI usage {usage_id}: {e}")

    def get_expected_provider_and_model(self, user_id: str) -> Tuple[str, str]:
        from app.services.membership_service import membership_service
        stats = membership_service.get_user_ai_usage_stats(user_id)
        plan_slug = stats.get("plan", "free")
        if plan_slug == "premium":
            return "nvidia", getattr(settings, "NVIDIA_MODEL", "nvidia/nemotron-3.5-lightning-30b-a3b")
        else:
            return "openrouter", getattr(settings, "OPENROUTER_FREE_MODEL", "openrouter/free")

ai_usage_service = AIUsageService()
