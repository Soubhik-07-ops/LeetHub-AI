import logging
from typing import Dict, Any, Optional
from fastapi import HTTPException
from app.integrations.supabase.client import get_supabase_client
from app.services.membership_service import membership_service

logger = logging.getLogger(__name__)

class BillingService:
    def get_billing_config(self) -> Dict[str, Any]:
        """Fetch the public UPI configuration."""
        client = get_supabase_client()
        res = client.table("app_settings").select("value").eq("key", "upi_config").execute()
        if not res.data:
            # Fallback default if not seeded
            return {
                "upi_id": "your-upi-id@upi",
                "display_name": "LeetBranch Premium",
                "qr_url": None,
                "description": "Unlock the full AI Developer Coach"
            }
        return res.data[0]["value"]

    def create_payment_request(self, user_id: str, upi_reference: str, proof_url: Optional[str], user_note: Optional[str]) -> Dict[str, Any]:
        """Creates a new payment request for the premium plan."""
        client = get_supabase_client()
        
        # 1. Check if user already has a pending request
        existing = client.table("payment_requests").select("id").eq("user_id", user_id).eq("status", "pending").execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="You already have a pending payment request.")

        # 2. Get the Premium plan from DB for its ID
        plan_res = client.table("plans").select("id").eq("slug", "premium").execute()
        if not plan_res.data:
            raise HTTPException(status_code=500, detail="Premium plan configuration not found.")
        
        premium_plan = plan_res.data[0]
        
        # 3. Get the dynamic price from settings (what the user actually saw)
        config = self.get_billing_config()
        current_price = config.get("price", 69)
        
        # 4. Create the request
        payload = {
            "user_id": user_id,
            "plan_id": premium_plan["id"],
            "amount": current_price * 100, # paise 
            "currency": "INR",
            "payment_method": "upi",
            "upi_reference": upi_reference,
            "proof_url": proof_url,
            "user_note": user_note,
            "status": "pending"
        }
        
        # Since I instructed INR in instructions, wait, let me check the Phase 9B prompt: "₹69 = 6900 paise". Yes, convert to paise.
        
        insert_res = client.table("payment_requests").insert(payload).execute()
        if not insert_res.data:
            raise HTTPException(status_code=500, detail="Failed to create payment request.")
            
        return insert_res.data[0]

    def get_billing_status(self, user_id: str) -> Dict[str, Any]:
        """Returns the user's current subscription status and recent payment request."""
        client = get_supabase_client()
        
        # Current active subscription info is already handled partially by usage stats, 
        # but let's query it directly here.
        sub_res = client.table("user_subscriptions") \
            .select("*, plans(name, slug)") \
            .eq("user_id", user_id) \
            .eq("status", "active") \
            .execute()
            
        active_sub = None
        if sub_res.data:
            # Check if it's expired
            # (We could check date logic here or rely on MembershipService logic)
            active_sub = sub_res.data[0]
            
        # Recent payment requests (pending or rejected or approved)
        req_res = client.table("payment_requests") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
            
        latest_request = req_res.data[0] if req_res.data else None
        
        return {
            "active_subscription": active_sub,
            "latest_payment_request": latest_request
        }

billing_service = BillingService()
