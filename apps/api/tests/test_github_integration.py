import pytest
import pytest_asyncio
import respx
import httpx
import base64
from app.integrations.github.client import GitHubClient
from app.integrations.github.exceptions import (
    GitHubAuthenticationError,
    GitHubNotFoundError,
    GitHubRateLimitError,
    GitHubIntegrationError,
    GitHubConflictError
)
from app.services.github_service import GitHubService
from app.integrations.github.schemas import GitHubFileRequest, GitHubOperation

@pytest_asyncio.fixture
async def async_client():
    async with httpx.AsyncClient() as client:
        yield client

@pytest_asyncio.fixture
async def github_client(async_client):
    return GitHubClient("fake_token", async_client)

@pytest_asyncio.fixture
async def github_service(github_client):
    return GitHubService(github_client)

@pytest.mark.asyncio
async def test_missing_token(async_client):
    with pytest.raises(GitHubAuthenticationError):
        GitHubClient("", async_client)

@pytest.mark.asyncio
@respx.mock
async def test_verify_repository_success(github_client):
    respx.get("https://api.github.com/repos/owner/repo").mock(
        return_value=httpx.Response(200, json={
            "full_name": "owner/repo",
            "private": False,
            "html_url": "https://github.com/owner/repo",
            "default_branch": "main"
        })
    )
    
    repo = await github_client.verify_repository("owner", "repo")
    assert repo.full_name == "owner/repo"

@pytest.mark.asyncio
@respx.mock
async def test_verify_repository_not_found(github_client):
    respx.get("https://api.github.com/repos/owner/repo").mock(
        return_value=httpx.Response(404, json={"message": "Not Found"})
    )
    
    with pytest.raises(GitHubNotFoundError):
        await github_client.verify_repository("owner", "repo")

@pytest.mark.asyncio
@respx.mock
async def test_rate_limit_error(github_client):
    respx.get("https://api.github.com/repos/owner/repo").mock(
        return_value=httpx.Response(403, text="API rate limit exceeded")
    )
    
    with pytest.raises(GitHubRateLimitError):
        await github_client.verify_repository("owner", "repo")

@pytest.mark.asyncio
@respx.mock
async def test_network_failures(github_client):
    # Test TimeoutException
    respx.get("https://api.github.com/repos/owner/repo").mock(side_effect=httpx.TimeoutException("Timeout"))
    with pytest.raises(GitHubIntegrationError, match="timed out"):
        await github_client.verify_repository("owner", "repo")

    # Test ConnectError
    respx.get("https://api.github.com/repos/owner/repo").mock(side_effect=httpx.ConnectError("Failed"))
    with pytest.raises(GitHubIntegrationError, match="connect"):
        await github_client.verify_repository("owner", "repo")
        
    # Test RequestError
    respx.get("https://api.github.com/repos/owner/repo").mock(side_effect=httpx.RequestError("Network"))
    with pytest.raises(GitHubIntegrationError, match="Network error"):
        await github_client.verify_repository("owner", "repo")

@pytest.mark.asyncio
@respx.mock
async def test_create_file_success(github_client):
    respx.get("https://api.github.com/repos/owner/repo/contents/test.md").mock(
        return_value=httpx.Response(404)
    )
    
    respx.put("https://api.github.com/repos/owner/repo/contents/test.md").mock(
        return_value=httpx.Response(201, json={
            "content": {"name": "test.md"},
            "commit": {"sha": "12345"}
        })
    )
    
    operation, result = await github_client.create_or_update_file("owner", "repo", "test.md", "content", "msg", "main")
    assert operation == GitHubOperation.CREATED
    assert result["commit"]["sha"] == "12345"

@pytest.mark.asyncio
@respx.mock
async def test_update_file_success(github_client):
    existing_content = base64.b64encode(b"old content").decode('utf-8')
    respx.get("https://api.github.com/repos/owner/repo/contents/test.md").mock(
        return_value=httpx.Response(200, json={
            "sha": "old_sha",
            "content": existing_content
        })
    )
    
    respx.put("https://api.github.com/repos/owner/repo/contents/test.md").mock(
        return_value=httpx.Response(200, json={
            "content": {"name": "test.md"},
            "commit": {"sha": "new_sha"}
        })
    )
    
    operation, result = await github_client.create_or_update_file("owner", "repo", "test.md", "new content", "msg", "main")
    assert operation == GitHubOperation.UPDATED
    assert result["commit"]["sha"] == "new_sha"

@pytest.mark.asyncio
@respx.mock
async def test_noop_unchanged_content(github_client):
    content = "same content"
    encoded = base64.b64encode(content.encode('utf-8')).decode('utf-8')
    
    respx.get("https://api.github.com/repos/owner/repo/contents/test.md").mock(
        return_value=httpx.Response(200, json={
            "sha": "existing_sha",
            "content": encoded + "\n"  # GitHub often adds newlines to base64
        })
    )
    
    # We should NOT see a PUT request
    put_route = respx.put("https://api.github.com/repos/owner/repo/contents/test.md")
    
    operation, result = await github_client.create_or_update_file("owner", "repo", "test.md", content, "msg", "main")
    assert operation == GitHubOperation.NOOP
    assert result is None
    assert not put_route.called

@pytest.mark.asyncio
@respx.mock
async def test_directory_conflict(github_client):
    respx.get("https://api.github.com/repos/owner/repo/contents/dir").mock(
        return_value=httpx.Response(200, json=[{"type": "file"}, {"type": "dir"}])
    )
    
    with pytest.raises(GitHubIntegrationError, match="directory"):
        await github_client.create_or_update_file("owner", "repo", "dir", "content", "msg", "main")

@pytest.mark.asyncio
@respx.mock
async def test_service_create_file_success(github_service):
    respx.get("https://api.github.com/repos/owner/repo/contents/test.md").mock(
        return_value=httpx.Response(404)
    )
    
    respx.put("https://api.github.com/repos/owner/repo/contents/test.md").mock(
        return_value=httpx.Response(201, json={
            "commit": {"sha": "12345", "html_url": "http://commit"}
        })
    )
    
    request = GitHubFileRequest(
        owner="owner",
        repository="repo",
        path="test.md",
        content="content",
        commit_message="msg",
        branch="main"
    )
    
    result = await github_service.create_or_update_file(request)
    assert result.success is True
    assert result.operation == GitHubOperation.CREATED
    assert result.commit_sha == "12345"

@pytest.mark.asyncio
@respx.mock
async def test_service_safe_error_handling(github_service):
    respx.get("https://api.github.com/repos/owner/repo/contents/test.md").mock(
        return_value=httpx.Response(403, text="API rate limit exceeded")
    )
    
    request = GitHubFileRequest(
        owner="owner",
        repository="repo",
        path="test.md",
        content="content",
        commit_message="msg",
        branch="main"
    )
    
    result = await github_service.create_or_update_file(request)
    assert result.success is False
    assert "rate limit" in result.error_message
    assert result.operation is None
