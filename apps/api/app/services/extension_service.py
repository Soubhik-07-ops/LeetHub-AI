import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from app.integrations.supabase.client import get_supabase_client
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

class ExtensionService:
    def generate_pairing_code(self, user_id: str) -> str:
        client = get_supabase_client()
        code = f"{secrets.randbelow(1000000):06d}"
        code_hash = hashlib.sha256(code.encode()).hexdigest()
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
        
        # Delete any existing unused codes for this user
        client.table("extension_pairing_codes").delete().eq("user_id", user_id).is_("used_at", "null").execute()
        
        client.table("extension_pairing_codes").insert({
            "user_id": user_id,
            "code_hash": code_hash,
            "expires_at": expires_at
        }).execute()
        
        return code

    def link_extension(self, code: str) -> str:
        client = get_supabase_client()
        code_hash = hashlib.sha256(code.encode()).hexdigest()
        
        # Find valid pairing code
        res = client.table("extension_pairing_codes").select("*").eq("code_hash", code_hash).is_("used_at", "null").execute()
        
        if not res.data:
            raise HTTPException(status_code=400, detail="Invalid or expired pairing code")
            
        pairing_record = res.data[0]
        
        # Check expiration
        expires_at = datetime.fromisoformat(pairing_record["expires_at"].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(status_code=400, detail="Invalid or expired pairing code")
            
        user_id = pairing_record["user_id"]
        
        # Mark as used
        client.table("extension_pairing_codes").update({
            "used_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", pairing_record["id"]).execute()
        
        # Generate credential
        credential = secrets.token_urlsafe(32)
        credential_hash = hashlib.sha256(credential.encode()).hexdigest()
        device_id = secrets.token_hex(16)
        
        client.table("extension_connections").insert({
            "user_id": user_id,
            "device_id": device_id,
            "credential_hash": credential_hash
        }).execute()
        
        return credential

    def authenticate_credential(self, credential: str) -> str:
        if not credential:
            return None
        client = get_supabase_client()
        credential_hash = hashlib.sha256(credential.encode()).hexdigest()
        
        res = client.table("extension_connections").select("user_id, id").eq("credential_hash", credential_hash).is_("revoked_at", "null").execute()
        if not res.data:
            return None
            
        conn = res.data[0]
        try:
            client.table("extension_connections").update({
                "last_seen_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", conn["id"]).execute()
        except Exception:
            pass # Ignore failures for last_seen_at update
            
        return conn["user_id"]

    def get_connection_status(self, user_id: str) -> dict:
        client = get_supabase_client()
        res = client.table("extension_connections").select("device_id, created_at, last_seen_at").eq("user_id", user_id).is_("revoked_at", "null").order("created_at", desc=True).limit(1).execute()
        
        if not res.data:
            return {"connected": False}
        
        record = res.data[0]
        return {
            "connected": True,
            "device_id": record.get("device_id"),
            "connected_at": record.get("created_at"),
            "last_seen_at": record.get("last_seen_at")
        }

    def revoke_connection(self, user_id: str) -> bool:
        client = get_supabase_client()
        client.table("extension_connections").update({
            "revoked_at": datetime.now(timezone.utc).isoformat()
        }).eq("user_id", user_id).is_("revoked_at", "null").execute()
        
        # also clear pairing codes
        client.table("extension_pairing_codes").delete().eq("user_id", user_id).is_("used_at", "null").execute()
        return True

extension_service = ExtensionService()
