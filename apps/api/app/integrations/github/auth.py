import time
import jwt
import httpx
from typing import Dict, Any, Optional
from app.core.config import settings
from app.integrations.github.exceptions import GitHubAuthenticationError, GitHubIntegrationError
import logging

logger = logging.getLogger(__name__)

class GitHubAppAuth:
    """Handles GitHub App authentication, JWT generation, and token generation."""
    
    BASE_URL = "https://api.github.com"

    @classmethod
    def generate_app_jwt(cls) -> str:
        """Generates a GitHub App JWT using the private key."""
        if not settings.GITHUB_APP_ID or not settings.GITHUB_APP_PRIVATE_KEY:
            raise GitHubAuthenticationError("GitHub App ID or Private Key is not configured.")

        # Ensure the private key is properly formatted
        private_key = settings.GITHUB_APP_PRIVATE_KEY.replace('\\n', '\n')

        now = int(time.time())
        payload = {
            # issued at time, 60 seconds in the past to allow for clock drift
            "iat": now - 60,
            # JWT expiration time (10 minute maximum)
            "exp": now + (10 * 60),
            # GitHub App's identifier
            "iss": settings.GITHUB_APP_ID
        }

        try:
            encoded_jwt = jwt.encode(payload, private_key, algorithm="RS256")
            return encoded_jwt
        except Exception as e:
            logger.error(f"Failed to generate GitHub App JWT: {e}")
            raise GitHubAuthenticationError("Failed to generate GitHub App JWT.")

    @classmethod
    async def get_installation_access_token(cls, installation_id: str, async_client: httpx.AsyncClient) -> str:
        """Generates a short-lived installation access token for a specific installation."""
        app_jwt = cls.generate_app_jwt()
        
        url = f"{cls.BASE_URL}/app/installations/{installation_id}/access_tokens"
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": f"Bearer {app_jwt}",
            "X-GitHub-Api-Version": "2022-11-28"
        }

        try:
            response = await async_client.post(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            return data["token"]
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (401, 403, 404):
                raise GitHubAuthenticationError(f"Failed to get installation token. Installation may be invalid or suspended. Status: {e.response.status_code}")
            raise GitHubIntegrationError(f"GitHub API error fetching installation token: {e}")
        except Exception as e:
            logger.error(f"Unexpected error getting installation token: {e}")
            raise GitHubIntegrationError("Unexpected error communicating with GitHub API.")

    @classmethod
    async def get_installation_details(cls, installation_id: str, async_client: httpx.AsyncClient) -> Dict[str, Any]:
        """Fetches the details of an installation using the App JWT."""
        app_jwt = cls.generate_app_jwt()
        
        url = f"{cls.BASE_URL}/app/installations/{installation_id}"
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": f"Bearer {app_jwt}",
            "X-GitHub-Api-Version": "2022-11-28"
        }

        try:
            response = await async_client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise GitHubAuthenticationError("Installation not found.")
            raise GitHubIntegrationError(f"Failed to fetch installation details. Status: {e.response.status_code}")
        except Exception as e:
            logger.error(f"Error fetching installation details: {e}")
            raise GitHubIntegrationError("Error fetching installation details from GitHub.")

    @classmethod
    async def get_installation_repositories(cls, installation_token: str, async_client: httpx.AsyncClient) -> list:
        """Fetches repositories accessible to the installation."""
        url = f"{cls.BASE_URL}/installation/repositories"
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": f"Bearer {installation_token}",
            "X-GitHub-Api-Version": "2022-11-28"
        }

        repos = []
        page = 1
        try:
            while True:
                response = await async_client.get(f"{url}?per_page=100&page={page}", headers=headers)
                response.raise_for_status()
                data = response.json()
                
                repos.extend(data.get("repositories", []))
                
                if len(data.get("repositories", [])) < 100:
                    break
                page += 1
                
            return repos
        except Exception as e:
            logger.error(f"Error fetching installation repositories: {e}")
            raise GitHubIntegrationError("Error fetching repositories from GitHub.")
