import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock
from app.main import app
from app.integrations.leetcode.schemas import GitHubSyncStatus

client = TestClient(app)

@pytest.fixture(autouse=True)
def mock_auth():
    from app.api.deps import get_extension_user_id
    app.dependency_overrides[get_extension_user_id] = lambda: "test-user-id"
    yield
    app.dependency_overrides.pop(get_extension_user_id, None)

@pytest.fixture
def mock_db():
    with patch('app.services.leetcode_service.get_supabase_client') as mock_get_client:
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        yield mock_client

@pytest.fixture
def mock_sync():
    with patch('app.api.routes.leetcode.LeetCodeGitHubSyncService.sync_submission', new_callable=AsyncMock) as mock_sync_method:
        yield mock_sync_method

def test_new_submission_github_success(mock_db, mock_sync):
    # Setup DB to simulate new insert
    mock_res = MagicMock()
    mock_res.data = []
    mock_db.table().select().eq().execute.return_value = mock_res
    
    # Setup GitHub success
    mock_sync.return_value = (True, "leetcode/two-sum/111.md", "sha123")
    
    response = client.post("/api/v1/leetcode/submissions", json={
        "problemSlug": "two-sum",
        "problemTitle": "Two Sum",
        "status": "accepted",
        "source": "leetcode",
        "sourceCode": "class Solution: pass",
        "submittedAt": "2026-08-09T23:16:34.126Z",
        "submissionId": "111"
    })
    
    assert response.status_code == 201
    data = response.json()
    assert data["operation"] == "created"
    assert data["githubSync"] == "synced"
    
    # Verify DB update was called
    mock_db.table().update.assert_called()
    mock_sync.assert_called_once()

def test_new_submission_github_failure(mock_db, mock_sync):
    # Setup DB to simulate new insert
    mock_res = MagicMock()
    mock_res.data = []
    mock_db.table().select().eq().execute.return_value = mock_res
    
    # Setup GitHub failure
    mock_sync.return_value = (False, "leetcode/two-sum/111.md", None)
    
    response = client.post("/api/v1/leetcode/submissions", json={
        "problemSlug": "two-sum",
        "problemTitle": "Two Sum",
        "status": "accepted",
        "source": "leetcode",
        "sourceCode": "class Solution: pass",
        "submittedAt": "2026-08-09T23:16:34.126Z",
        "submissionId": "111"
    })
    
    assert response.status_code == 201
    data = response.json()
    assert data["operation"] == "created"
    assert data["githubSync"] == "failed"
    mock_sync.assert_called_once()

def test_duplicate_already_synced(mock_db, mock_sync):
    # Setup DB to return existing row that is already synced
    mock_res = MagicMock()
    mock_res.data = [{"leetcode_submission_id": "111", "github_sync_status": "synced"}]
    mock_db.table().select().eq().execute.return_value = mock_res
    
    response = client.post("/api/v1/leetcode/submissions", json={
        "problemSlug": "two-sum",
        "problemTitle": "Two Sum",
        "status": "accepted",
        "source": "leetcode",
        "sourceCode": "class Solution: pass",
        "submittedAt": "2026-08-09T23:16:34.126Z",
        "submissionId": "111"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["operation"] == "duplicate"
    assert data["githubSync"] == "skipped"
    
    # GitHub should NOT be called
    mock_sync.assert_not_called()

def test_duplicate_previous_failure_retries_success(mock_db, mock_sync):
    # Setup DB to return existing row that failed previously
    mock_res = MagicMock()
    mock_res.data = [{"leetcode_submission_id": "111", "github_sync_status": "failed"}]
    mock_db.table().select().eq().execute.return_value = mock_res
    
    # Setup GitHub retry success
    mock_sync.return_value = (True, "leetcode/two-sum/111.md", "sha123")
    
    response = client.post("/api/v1/leetcode/submissions", json={
        "problemSlug": "two-sum",
        "problemTitle": "Two Sum",
        "status": "accepted",
        "source": "leetcode",
        "sourceCode": "class Solution: pass",
        "submittedAt": "2026-08-09T23:16:34.126Z",
        "submissionId": "111"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["operation"] == "duplicate"
    assert data["githubSync"] == "synced"
    mock_sync.assert_called_once()

def test_duplicate_previous_failure_retries_fails(mock_db, mock_sync):
    # Setup DB to return existing row that failed previously
    mock_res = MagicMock()
    mock_res.data = [{"leetcode_submission_id": "111", "github_sync_status": "failed"}]
    mock_db.table().select().eq().execute.return_value = mock_res
    
    # Setup GitHub retry failure
    mock_sync.return_value = (False, "leetcode/two-sum/111.md", None)
    
    response = client.post("/api/v1/leetcode/submissions", json={
        "problemSlug": "two-sum",
        "problemTitle": "Two Sum",
        "status": "accepted",
        "source": "leetcode",
        "sourceCode": "class Solution: pass",
        "submittedAt": "2026-08-09T23:16:34.126Z",
        "submissionId": "111"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["operation"] == "duplicate"
    assert data["githubSync"] == "failed"
    mock_sync.assert_called_once()

def test_github_path_deterministic():
    from app.services.leetcode_github_service import LeetCodeGitHubSyncService
    service = LeetCodeGitHubSyncService(AsyncMock())
    # Testing sanitization
    import asyncio
    
    class FakeRequest:
        problemSlug = "Two Sum!@#"
        submissionId = "123"
        problemTitle = "Two Sum"
        status = MagicMock(value="accepted")
        submittedAt = MagicMock()
        submittedAt.isoformat.return_value = "2026"
        sourceCode = "code"
        topics = ["Hash Table", "Math"]
        difficulty = "Easy"
        language = "python"

    async def run():
        with patch('app.services.leetcode_github_service.GitHubFileRequest') as mock_req:
            with patch('app.services.leetcode_github_service.github_connection_service') as mock_conn:
                mock_conn.get_connection.return_value = MagicMock(installation_id="123", repository_full_name="owner/repo", default_branch="main")
                with patch('app.services.leetcode_github_service.GitHubAppAuth') as mock_auth:
                    mock_auth.get_installation_access_token = AsyncMock(return_value="token")
                    with patch('app.services.leetcode_github_service.GitHubClient') as mock_gh_client:
                        with patch('app.services.leetcode_github_service.GitHubService') as mock_gh_service_cls:
                            mock_gh_service_cls.return_value.create_or_update_file = AsyncMock(return_value=MagicMock(success=True, commit_sha="abc"))
                            
                            res = await service.sync_submission(FakeRequest(), "test-user")
                            assert res[0] is True
                            assert res[1] == "leetcode/Hash_Table/twosum/123.md"
                
    asyncio.run(run())

def test_markdown_code_fence():
    from app.services.leetcode_github_service import LeetCodeGitHubSyncService
    service = LeetCodeGitHubSyncService(AsyncMock())
    
    assert service._generate_markdown_fence("print('hello')") == "```"
    assert service._generate_markdown_fence("```\ncode\n```") == "````"
    assert service._generate_markdown_fence("`````\ncode\n`````") == "``````"

def test_no_source_code_in_logs(caplog):
    from app.services.leetcode_github_service import LeetCodeGitHubSyncService
    import logging
    caplog.set_level(logging.INFO)
    
    service = LeetCodeGitHubSyncService(AsyncMock())
    
    import asyncio
    class FakeRequest:
        problemSlug = "two-sum"
        submissionId = "123"
        problemTitle = "Two Sum"
        status = MagicMock(value="accepted")
        submittedAt = MagicMock()
        submittedAt.isoformat.return_value = "2026"
        sourceCode = "SUPER_SECRET_SOURCE_CODE"
        
    async def run():
        with patch('app.services.leetcode_github_service.github_connection_service') as mock_conn:
            mock_conn.get_connection.return_value = MagicMock(installation_id="123", repository_full_name="owner/repo", default_branch="main")
            with patch('app.services.leetcode_github_service.GitHubAppAuth') as mock_auth:
                mock_auth.get_installation_access_token = AsyncMock(return_value="token")
                with patch('app.services.leetcode_github_service.GitHubClient') as mock_gh_client:
                    with patch('app.services.leetcode_github_service.GitHubService') as mock_gh_service_cls:
                        mock_gh_service_cls.return_value.create_or_update_file = AsyncMock(return_value=MagicMock(success=False, error_message="Failed"))
                        await service.sync_submission(FakeRequest(), "test")
            
    asyncio.run(run())
    
    for record in caplog.records:
        assert "SUPER_SECRET_SOURCE_CODE" not in record.message
        assert "GITHUB_TOKEN" not in record.message
