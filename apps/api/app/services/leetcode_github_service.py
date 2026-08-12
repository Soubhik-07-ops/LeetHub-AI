import logging
import re
from typing import Tuple, Optional

from app.integrations.github.schemas import GitHubFileRequest
from app.integrations.leetcode.schemas import LeetCodeSubmissionRequest
from app.services.github_service import GitHubService
from app.integrations.github.client import GitHubClient
from app.integrations.github.auth import GitHubAppAuth
from app.services.github_connection_service import github_connection_service
import httpx

logger = logging.getLogger(__name__)

class LeetCodeGitHubSyncService:
    def __init__(self, async_client: httpx.AsyncClient):
        self.async_client = async_client

    def _sanitize_slug(self, slug: str) -> str:
        # Keep only alphanumerics and hyphens
        return re.sub(r'[^a-zA-Z0-9\-]', '', slug.lower())

    def _sanitize_topic(self, topic: str) -> str:
        # Replace spaces with underscores, preserve case, remove illegals
        topic = topic.replace(' ', '_')
        return re.sub(r'[^a-zA-Z0-9\-_]', '', topic)

    def _generate_markdown_fence(self, source_code: str) -> str:
        """Finds the longest sequence of backticks in the source code to generate a safe fence."""
        matches = re.findall(r'`+', source_code)
        if not matches:
            return '```'
        max_len = max(len(m) for m in matches)
        return '`' * max(3, max_len + 1)

    async def sync_submission(self, request: LeetCodeSubmissionRequest, user_id: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Synchronizes a submission to GitHub.
        Returns: (success, path, commit_sha)
        """
        try:
            slug = self._sanitize_slug(request.problemSlug)
            
            # 1. Load connection settings from user
            conn = github_connection_service.get_connection(user_id)
            if not conn or not conn.installation_id or not conn.repository_full_name:
                logger.info("GitHub sync skipped: No valid GitHub connection configured for user.")
                return False, None, None

            # Split repository_full_name (e.g. "octocat/hello-world")
            parts = conn.repository_full_name.split("/")
            if len(parts) != 2:
                logger.error("GitHub sync failed: Invalid repository format.")
                return False, None, None
                
            owner, repo = parts[0], parts[1]
            branch = conn.default_branch or "main"

            # 2. Get short-lived installation access token
            token = await GitHubAppAuth.get_installation_access_token(conn.installation_id, self.async_client)
            
            github_client = GitHubClient(token=token, async_client=self.async_client)
            github_service = GitHubService(client=github_client)

            primary_topic = "Uncategorized"
            if request.topics and len(request.topics) > 0:
                primary_topic = request.topics[0]
                
            topic_folder = self._sanitize_topic(primary_topic)
            path = f"leetcode/{topic_folder}/{slug}/{request.submissionId}.md"
            
            fence = self._generate_markdown_fence(request.sourceCode)
            content = (
                f"# {request.problemTitle}\n\n"
                f"- **Difficulty:** {request.difficulty or 'Unknown'}\n"
                f"- **Language:** {request.language or 'Unknown'}\n"
                f"- **Topics:** {', '.join(request.topics) if request.topics else 'None'}\n"
                f"- **Submission ID:** {request.submissionId}\n"
                f"- **Status:** {request.status.value}\n"
                f"- **Date:** {request.submittedAt.isoformat()}\n\n"
                f"## Source Code\n\n"
                f"{fence}\n"
                f"{request.sourceCode}\n"
                f"{fence}\n"
            )

            commit_message = f"feat(leetcode): sync {slug} ({request.status.value})"

            file_req = GitHubFileRequest(
                owner=owner,
                repository=repo,
                path=path,
                content=content,
                commit_message=commit_message,
                branch=branch
            )

            result = await github_service.create_or_update_file(file_req)
            if result.success:
                logger.info("Successfully synced submission %s to GitHub.", request.submissionId)
                return True, path, result.commit_sha
            else:
                logger.error("Failed to sync submission %s to GitHub. Error: %s", request.submissionId, getattr(result, 'error_message', 'Unknown'))
                return False, path, None

        except Exception as e:
            logger.exception("Unexpected error during GitHub sync for submission %s", request.submissionId)
            return False, None, None

