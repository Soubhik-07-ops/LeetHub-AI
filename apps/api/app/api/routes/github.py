from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.responses import RedirectResponse
import httpx
from app.core.rate_limit import limiter
from app.integrations.github.auth import GitHubAppAuth
from app.core.config import settings
from app.api.deps import get_current_user_id
from app.schemas.github import GitHubConnectionCreate, GitHubConnectionResponse
from app.services.github_connection_service import github_connection_service
from datetime import datetime

router = APIRouter()

@router.get("/install")
@limiter.limit("10/minute")
def install_github_app(request: Request, user_id: str = Depends(get_current_user_id)):
    if not settings.GITHUB_APP_SLUG:
        raise HTTPException(status_code=500, detail="GITHUB_APP_SLUG not configured")
    
    # In production, state should be a signed JWT to prevent CSRF. 
    # For local development/demo, we pass user_id directly.
    url = f"https://github.com/apps/{settings.GITHUB_APP_SLUG}/installations/new?state={user_id}"
    return {"url": url}

@router.get("/callback")
@limiter.limit("10/minute")
async def github_callback(request: Request, installation_id: str, setup_action: str, state: str):
    user_id = state
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing state")

    async with httpx.AsyncClient() as client:
        details = await GitHubAppAuth.get_installation_details(installation_id, client)
        github_username = details.get("account", {}).get("login", "")

    # Save partial connection (no repository selected yet)
    github_connection_service.save_connection(
        user_id=user_id,
        installation_id=installation_id,
        github_username=github_username,
        repository_id="",
        repository_full_name="",
        default_branch="main"
    )
    
    # Redirect back to frontend dashboard
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/")

@router.get("/repositories")
async def get_repositories(user_id: str = Depends(get_current_user_id)):
    conn = github_connection_service.get_connection(user_id)
    if not conn or not conn.installation_id:
        raise HTTPException(status_code=404, detail="No GitHub installation found")
        
    async with httpx.AsyncClient() as client:
        token = await GitHubAppAuth.get_installation_access_token(conn.installation_id, client)
        repos = await GitHubAppAuth.get_installation_repositories(token, client)
        
    return [{"id": str(r["id"]), "full_name": r["full_name"], "default_branch": r["default_branch"]} for r in repos]

@router.get("/connection", response_model=GitHubConnectionResponse)
def get_connection(user_id: str = Depends(get_current_user_id)):
    conn = github_connection_service.get_connection(user_id)
    if not conn:
        raise HTTPException(status_code=404, detail="GitHub connection not found")
    return conn

@router.post("/connection", response_model=GitHubConnectionResponse)
@limiter.limit("10/minute")
async def create_connection(request: Request, data: GitHubConnectionCreate, user_id: str = Depends(get_current_user_id)):
    conn = github_connection_service.get_connection(user_id)
    if not conn or not conn.installation_id:
        raise HTTPException(status_code=404, detail="GitHub installation not found. Connect GitHub first.")
        
    # Verify the repository belongs to the installation
    async with httpx.AsyncClient() as client:
        token = await GitHubAppAuth.get_installation_access_token(conn.installation_id, client)
        repos = await GitHubAppAuth.get_installation_repositories(token, client)
        
    repo_match = next((r for r in repos if str(r["id"]) == data.repository_id), None)
    if not repo_match:
        raise HTTPException(status_code=403, detail="Repository not accessible to this installation.")
        
    return github_connection_service.save_connection(
        user_id=user_id,
        installation_id=conn.installation_id,
        github_username=conn.github_account_login,
        repository_id=data.repository_id,
        repository_full_name=repo_match["full_name"],
        default_branch=data.default_branch
    )

@router.delete("/connection")
def delete_connection(user_id: str = Depends(get_current_user_id)):
    github_connection_service.delete_connection(user_id)
    return {"status": "deleted"}
