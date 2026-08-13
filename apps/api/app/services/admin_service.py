import logging
from typing import Dict, Any, List, Optional
from fastapi import HTTPException
from app.integrations.supabase.client import get_supabase_client

logger = logging.getLogger(__name__)

class AdminService:
    def get_dashboard_stats(self) -> Dict[str, Any]:
        """Aggregates overview statistics for the admin dashboard."""
        client = get_supabase_client()
        
        # In a real app we'd use RPCs for complex aggregates. 
        users_res = client.table("admin_users_view").select("id", count="exact").execute()
        premium_res = client.table("user_subscriptions").select("id", count="exact").eq("status", "active").execute()
        
        pending_res = client.table("payment_requests").select("id", count="exact").eq("status", "pending").execute()
        approved_res = client.table("payment_requests").select("id", count="exact").eq("status", "approved").execute()
        rejected_res = client.table("payment_requests").select("id", count="exact").eq("status", "rejected").execute()
        
        total_users = users_res.count if users_res and users_res.count is not None else 0
        premium_users = premium_res.count if premium_res and premium_res.count is not None else 0
        
        # Calculate AI Requests Today / Month from admin_ai_usage_view
        ai_res = client.table("admin_ai_usage_view").select("daily_used, monthly_used").execute()
        ai_today = sum(r.get("daily_used", 0) for r in (ai_res.data or []))
        ai_month = sum(r.get("monthly_used", 0) for r in (ai_res.data or []))
        
        return {
            "total_users": total_users,
            "free_users": total_users - premium_users,
            "premium_users": premium_users,
            "pending_payments": pending_res.count if pending_res and pending_res.count is not None else 0,
            "approved_payments": approved_res.count if approved_res and approved_res.count is not None else 0,
            "rejected_payments": rejected_res.count if rejected_res and rejected_res.count is not None else 0,
            "ai_requests_today": ai_today,
            "ai_requests_month": ai_month
        }

    def list_payment_requests(self, status: Optional[str] = None, page: int = 1, limit: int = 50) -> Dict[str, Any]:
        client = get_supabase_client()
        offset = (page - 1) * limit
        
        query = client.table("payment_requests").select(
            "*, user:admin_users_view!payment_requests_user_id_fkey(email)", 
            count="exact"
        ).order("created_at", desc=True)
        
        if status:
            query = query.eq("status", status)
            
        res = query.range(offset, offset + limit - 1).execute()
        return {
            "data": res.data,
            "count": res.count,
            "page": page,
            "limit": limit
        }

    def list_users(self, page: int = 1, limit: int = 50, search: Optional[str] = None) -> Dict[str, Any]:
        client = get_supabase_client()
        offset = (page - 1) * limit
        
        query = client.table("admin_users_view").select(
            "*, subscriptions:user_subscriptions(*)", 
            count="exact"
        ).order("created_at", desc=True)
        
        if search:
            query = query.ilike("email", f"%{search}%")
            
        res = query.range(offset, offset + limit - 1).execute()
        return {
            "data": res.data,
            "count": res.count,
            "page": page,
            "limit": limit
        }

    def list_subscriptions(self, page: int = 1, limit: int = 50) -> Dict[str, Any]:
        client = get_supabase_client()
        offset = (page - 1) * limit
        
        res = client.table("user_subscriptions").select(
            "*, user:admin_users_view!user_subscriptions_user_id_fkey(email)", 
            count="exact"
        ).order("updated_at", desc=True).range(offset, offset + limit - 1).execute()
        
        return {
            "data": res.data,
            "count": res.count,
            "page": page,
            "limit": limit
        }
        
    def list_ai_usage(self, page: int = 1, limit: int = 50) -> Dict[str, Any]:
        client = get_supabase_client()
        offset = (page - 1) * limit
        
        res = client.table("admin_ai_usage_view").select(
            "*", 
            count="exact"
        ).order("monthly_used", desc=True).range(offset, offset + limit - 1).execute()
        
        return {
            "data": res.data,
            "count": res.count,
            "page": page,
            "limit": limit
        }
        
    def list_audit_logs(self, page: int = 1, limit: int = 50) -> Dict[str, Any]:
        client = get_supabase_client()
        offset = (page - 1) * limit
        
        res = client.table("admin_audit_logs").select(
            "*, admin:admin_users_view!admin_audit_logs_admin_user_id_fkey(email)", 
            count="exact"
        ).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        return {
            "data": res.data,
            "count": res.count,
            "page": page,
            "limit": limit
        }

    def approve_payment(self, request_id: str, admin_id: str, admin_note: Optional[str]) -> Dict[str, Any]:
        client = get_supabase_client()
        try:
            res = client.rpc(
                "approve_payment_request",
                {
                    "p_request_id": request_id,
                    "p_admin_id": admin_id,
                    "p_admin_note": admin_note or ""
                }
            ).execute()
            return res.data
        except Exception as e:
            logger.error(f"Approval failed: {e}")
            raise HTTPException(status_code=400, detail=str(e))

    def reject_payment(self, request_id: str, admin_id: str, admin_note: Optional[str]) -> Dict[str, Any]:
        client = get_supabase_client()
        try:
            res = client.rpc(
                "reject_payment_request",
                {
                    "p_request_id": request_id,
                    "p_admin_id": admin_id,
                    "p_admin_note": admin_note or ""
                }
            ).execute()
            return res.data
        except Exception as e:
            logger.error(f"Rejection failed: {e}")
            raise HTTPException(status_code=400, detail=str(e))
            
    def get_settings(self) -> Dict[str, Any]:
        client = get_supabase_client()
        res = client.table("app_settings").select("*").execute()
        settings_dict = {}
        for r in res.data:
            settings_dict[r["key"]] = r["value"]
        return settings_dict

    def update_settings(self, admin_id: str, settings_key: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        client = get_supabase_client()
        
        # Upsert setting
        res = client.table("app_settings").upsert({
            "key": settings_key,
            "value": payload,
            "updated_by": admin_id
        }, on_conflict="key").execute()
        
        # Log action
        client.table("admin_audit_logs").insert({
            "admin_user_id": admin_id,
            "action": f"{settings_key}_updated",
            "target_type": "app_settings",
            "target_id": settings_key,
            "metadata": payload
        }).execute()
        
        return res.data[0] if res.data else {}

admin_service = AdminService()
