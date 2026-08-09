from fastapi import APIRouter
from app.api.routes import github

api_router = APIRouter()
api_router.include_router(github.router, prefix="/integrations/github", tags=["integrations"])
