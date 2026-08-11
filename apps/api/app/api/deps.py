from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from app.integrations.supabase.client import get_supabase_client
from app.core.config import settings
from app.services.extension_service import extension_service
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)

async def get_current_user_id(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    """
    Dependency to extract the current authenticated user's ID from the request.
    Verifies the JWT against Supabase.
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing authentication token")
        
    token = credentials.credentials
    supabase = get_supabase_client()
    try:
        user_res = supabase.auth.get_user(token)
        if not user_res or not user_res.user:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
        return user_res.user.id
    except Exception as e:
        logger.error(f"Error verifying token: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid authentication token")

async def get_extension_user_id(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[str]:
    """
    Dependency to extract the current authenticated extension user's ID.
    Checks for the extension credential in the Bearer token.
    """
    if not credentials:
        if settings.ALLOW_ANONYMOUS_SUBMISSIONS:
            return None
        raise HTTPException(status_code=401, detail="Missing extension credential")
        
    token = credentials.credentials
    user_id = extension_service.authenticate_credential(token)
    
    if not user_id:
        if settings.ALLOW_ANONYMOUS_SUBMISSIONS:
            return None
        raise HTTPException(status_code=401, detail="Invalid extension credential")
        
    return user_id
