from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

if settings.REDIS_URL:
    limiter = Limiter(key_func=get_remote_address, storage_uri=settings.REDIS_URL)
    logger.info("Rate Limiter initialized with Redis storage.")
else:
    limiter = Limiter(key_func=get_remote_address, storage_uri="memory://")
    logger.info("Rate Limiter initialized with Memory storage (local development).")
