from app.integrations.github.client import GitHubClient
from app.integrations.github.schemas import GitHubFileRequest, GitHubFileResult, GitHubRepository, GitHubOperation
from app.integrations.github.exceptions import GitHubIntegrationError
import logging

logger = logging.getLogger(__name__)

class GitHubService:
    """Service layer for GitHub integration."""
    
    def __init__(self, client: GitHubClient):
        self.client = client

    async def verify_repository(self, owner: str, repo: str) -> GitHubRepository:
        """Verifies the specified repository."""
        return await self.client.verify_repository(owner=owner, repo=repo)

    async def create_or_update_file(self, request: GitHubFileRequest) -> GitHubFileResult:
        """Creates or updates a file in the configured repository."""
        try:
            operation, result_data = await self.client.create_or_update_file(
                owner=request.owner,
                repo=request.repository,
                path=request.path,
                content=request.content,
                commit_message=request.commit_message,
                branch=request.branch
            )
            
            if operation == GitHubOperation.NOOP:
                return GitHubFileResult(
                    success=True,
                    operation=GitHubOperation.NOOP,
                    path=request.path
                )
                
            commit = result_data.get("commit", {}) if result_data else {}
            return GitHubFileResult(
                success=True,
                operation=operation,
                path=request.path,
                commit_sha=commit.get("sha"),
                commit_url=commit.get("html_url")
            )
            
        except GitHubIntegrationError as e:
            logger.error(f"GitHub integration error during file operation: {e}")
            return GitHubFileResult(
                success=False,
                path=request.path,
                error_message=str(e)
            )
        except Exception as e:
            logger.exception("Unexpected error in GitHub integration")
            return GitHubFileResult(
                success=False,
                path=request.path,
                error_message="An unexpected internal error occurred."
            )
