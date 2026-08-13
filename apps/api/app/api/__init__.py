from fastapi import APIRouter
from app.api.routes import github, leetcode, analytics, extension, ai

api_router = APIRouter()
api_router.include_router(github.router, prefix="/integrations/github", tags=["integrations"])
api_router.include_router(leetcode.router, prefix="/leetcode", tags=["leetcode"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(extension.router, prefix="/extension", tags=["extension"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
