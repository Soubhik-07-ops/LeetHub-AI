from fastapi import APIRouter, HTTPException, status
import httpx
from app.services.github_service import GitHubService
from app.integrations.github.client import GitHubClient
from app.integrations.github.schemas import GitHubFileRequest, GitHubFileResult
from app.integrations.github.exceptions import GitHubIntegrationError
from app.core.config import settings

router = APIRouter()

@router.post("/test", response_model=GitHubFileResult)
async def test_github_integration():
    """
    Development endpoint to verify GitHub integration.
    Creates or updates a deterministic test file in the configured repository.
    
    TODO: This endpoint must be protected with authentication or removed before production deployment.
    """
    if not settings.GITHUB_OWNER or not settings.GITHUB_REPOSITORY or not settings.GITHUB_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub configuration (owner, repository, or token) is missing."
        )

    # Configure explicit timeouts for GitHub API communication
    timeout = httpx.Timeout(10.0, connect=5.0)

    async with httpx.AsyncClient(timeout=timeout) as async_client:
        github_client = GitHubClient(token=settings.GITHUB_TOKEN, async_client=async_client)
        service = GitHubService(client=github_client)
        
        try:
            # 1. Verify repository
            await service.verify_repository(
                owner=settings.GITHUB_OWNER, 
                repo=settings.GITHUB_REPOSITORY
            )
        except GitHubIntegrationError as e:
            # We log internally (service does some of this, but we raise safe external messages)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail="GitHub repository verification failed. Please check configuration."
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unexpected internal error verifying repository."
            )

        # 2. Create/Update deterministic file
        path = ".leethub/test/integration-status.md"
        content = (
            "# LeetHub-AI GitHub Integration\n\n"
            "GitHub integration test successful.\n\n"
            "This file was created automatically by the LeetHub-AI backend.\n"
        )
        commit_message = "chore: verify LeetHub-AI GitHub integration"

        request = GitHubFileRequest(
            owner=settings.GITHUB_OWNER,
            repository=settings.GITHUB_REPOSITORY,
            path=path,
            content=content,
            commit_message=commit_message,
            branch=settings.GITHUB_BRANCH
        )

        result = await service.create_or_update_file(request)

        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="GitHub rejected the file operation or a network error occurred."
            )

        return result
