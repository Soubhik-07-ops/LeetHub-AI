import logging
from typing import Optional
from app.integrations.supabase.client import get_supabase_client
from app.schemas.github import GitHubConnectionCreate, GitHubConnectionResponse
from fastapi import HTTPException
from datetime import datetime

logger = logging.getLogger(__name__)

class GitHubConnectionService:
    def get_connection(self, user_id: str) -> Optional[GitHubConnectionResponse]:
        client = get_supabase_client()
        res = client.table("github_connections").select("*").eq("user_id", user_id).is_("revoked_at", "null").execute()
        
        if not res.data:
            return None
            
        record = res.data[0]
        try:
            dt = datetime.fromisoformat(record["created_at"].replace('Z', '+00:00'))
        except:
            dt = datetime.now()
            
        return GitHubConnectionResponse(
            github_account_login=record.get("github_username") or "",
            repository_full_name=record.get("repository_full_name") or "",
            repository_id=record.get("repository_id") or "",
            installation_id=record.get("installation_id") or "",
            default_branch=record.get("default_branch") or "main",
            created_at=dt
        )

    def save_connection(self, user_id: str, installation_id: str, github_username: str, repository_id: str, repository_full_name: str, default_branch: str) -> GitHubConnectionResponse:
        client = get_supabase_client()
        
        # Check if already exists (active)
        res = client.table("github_connections").select("id").eq("user_id", user_id).is_("revoked_at", "null").execute()
        
        payload = {
            "user_id": user_id,
            "github_username": github_username,
            "repository_full_name": repository_full_name,
            "repository_id": repository_id,
            "installation_id": installation_id,
            "default_branch": default_branch,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        if res.data:
            record_id = res.data[0]["id"]
            updated = client.table("github_connections").update(payload).eq("id", record_id).execute()
            if not updated.data:
                raise HTTPException(status_code=500, detail="Failed to update connection")
            ret_record = updated.data[0]
        else:
            inserted = client.table("github_connections").insert(payload).execute()
            if not inserted.data:
                raise HTTPException(status_code=500, detail="Failed to create connection")
            ret_record = inserted.data[0]
            
        dt = datetime.now()
        if "created_at" in ret_record:
            try:
                dt = datetime.fromisoformat(ret_record["created_at"].replace('Z', '+00:00'))
            except:
                pass
                
        return GitHubConnectionResponse(
            github_account_login=ret_record.get("github_username") or "",
            repository_full_name=ret_record.get("repository_full_name") or "",
            repository_id=ret_record.get("repository_id") or "",
            installation_id=ret_record.get("installation_id") or "",
            default_branch=ret_record.get("default_branch") or "main",
            created_at=dt
        )

    def delete_connection(self, user_id: str) -> bool:
        client = get_supabase_client()
        client.table("github_connections").update({"revoked_at": datetime.utcnow().isoformat()}).eq("user_id", user_id).is_("revoked_at", "null").execute()
        return True

github_connection_service = GitHubConnectionService()
