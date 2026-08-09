import base64
from typing import Optional, Dict, Any, Tuple
import httpx

from app.integrations.github.schemas import GitHubRepository, GitHubOperation
from app.integrations.github.exceptions import (
    GitHubAuthenticationError,
    GitHubNotFoundError,
    GitHubRateLimitError,
    GitHubIntegrationError,
    GitHubConflictError
)

class GitHubClient:
    """Client for interacting with GitHub REST API."""
    
    BASE_URL = "https://api.github.com"
    
    def __init__(self, token: str, async_client: httpx.AsyncClient):
        self.token = token
        if not self.token:
            raise GitHubAuthenticationError("GitHub token is missing or empty.")
            
        self.async_client = async_client
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": f"Bearer {self.token}",
            "X-GitHub-Api-Version": "2022-11-28"
        }

    def _handle_response_errors(self, response: httpx.Response, context: str):
        if response.status_code in (200, 201):
            return
            
        if response.status_code == 401:
            raise GitHubAuthenticationError("Invalid GitHub token.")
        elif response.status_code == 403:
            if "rate limit" in response.text.lower():
                raise GitHubRateLimitError("GitHub API rate limit exceeded.")
            raise GitHubAuthenticationError("Permission denied for GitHub resource.")
        elif response.status_code == 404:
            raise GitHubNotFoundError(f"GitHub resource not found: {context}")
        elif response.status_code == 409:
            raise GitHubConflictError("Conflict during GitHub operation (e.g., mismatched SHA).")
        elif response.status_code == 422:
            raise GitHubIntegrationError("GitHub API validation failed for the requested operation.")
            
        raise GitHubIntegrationError(f"GitHub API returned unexpected status {response.status_code}.")

    async def verify_repository(self, owner: str, repo: str) -> GitHubRepository:
        """Verifies if a repository exists and returns its basic info."""
        url = f"{self.BASE_URL}/repos/{owner}/{repo}"
        try:
            response = await self.async_client.get(url, headers=self.headers)
        except httpx.TimeoutException:
            raise GitHubIntegrationError("GitHub API request timed out.")
        except httpx.ConnectError:
            raise GitHubIntegrationError("Failed to connect to GitHub API.")
        except httpx.RequestError:
            raise GitHubIntegrationError("Network error while communicating with GitHub API.")
                
        self._handle_response_errors(response, f"Repository {owner}/{repo}")
        
        data = response.json()
        return GitHubRepository(
            full_name=data["full_name"],
            private=data["private"],
            html_url=data["html_url"],
            default_branch=data["default_branch"]
        )

    async def get_file_details(self, owner: str, repo: str, path: str, branch: str) -> Optional[Dict[str, Any]]:
        """Retrieves file details including SHA and base64 content."""
        url = f"{self.BASE_URL}/repos/{owner}/{repo}/contents/{path}"
        params = {"ref": branch}
        
        try:
            response = await self.async_client.get(url, headers=self.headers, params=params)
        except httpx.TimeoutException:
            raise GitHubIntegrationError("GitHub API request timed out while getting file.")
        except httpx.ConnectError:
            raise GitHubIntegrationError("Failed to connect to GitHub API while getting file.")
        except httpx.RequestError:
            raise GitHubIntegrationError("Network error while getting file from GitHub API.")
                
        if response.status_code == 404:
            return None
            
        self._handle_response_errors(response, f"File {path}")
        data = response.json()
        
        if isinstance(data, list):
            raise GitHubIntegrationError("The requested path is a directory, not a file.")
            
        return data

    async def create_or_update_file(
        self, owner: str, repo: str, path: str, content: str, commit_message: str, branch: str
    ) -> Tuple[GitHubOperation, Optional[Dict[str, Any]]]:
        """Creates or updates a file on GitHub, avoiding unnecessary commits."""
        url = f"{self.BASE_URL}/repos/{owner}/{repo}/contents/{path}"
        
        encoded_content = base64.b64encode(content.encode('utf-8')).decode('utf-8')
        
        payload = {
            "message": commit_message,
            "content": encoded_content,
            "branch": branch
        }
        
        existing_file = await self.get_file_details(owner, repo, path, branch)
        operation_type = GitHubOperation.CREATED
        
        if existing_file:
            operation_type = GitHubOperation.UPDATED
            existing_content_b64 = existing_file.get("content", "").replace("\n", "")
            if existing_content_b64 == encoded_content:
                return GitHubOperation.NOOP, None
                
            payload["sha"] = existing_file["sha"]
            
        try:
            response = await self.async_client.put(url, headers=self.headers, json=payload)
        except httpx.TimeoutException:
            raise GitHubIntegrationError("GitHub API request timed out while saving file.")
        except httpx.ConnectError:
            raise GitHubIntegrationError("Failed to connect to GitHub API while saving file.")
        except httpx.RequestError:
            raise GitHubIntegrationError("Network error while saving file to GitHub API.")
                
        self._handle_response_errors(response, f"Saving file {path}")
        return operation_type, response.json()
