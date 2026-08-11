from supabase import create_client, Client
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

_supabase_client = None

def get_supabase_client() -> Client:
    global _supabase_client
    
    if _supabase_client is not None:
        return _supabase_client

    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Supabase configuration is missing. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
        
    try:
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY
        )
        return _supabase_client
    except Exception as e:
        logger.error("Failed to initialize Supabase client")
        raise e
