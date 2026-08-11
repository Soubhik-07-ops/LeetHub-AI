import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app

client = TestClient(app)

@pytest.fixture(autouse=True)
def mock_auth():
    from app.api.deps import get_extension_user_id
    app.dependency_overrides[get_extension_user_id] = lambda: "test-user-id"
    yield
    app.dependency_overrides.pop(get_extension_user_id, None)

@pytest.fixture(autouse=True)
def mock_supabase_client():
    with patch('app.services.leetcode_service.get_supabase_client') as mock_get_client:
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        
        # Default behavior: No duplicate found
        mock_res = MagicMock()
        mock_res.data = []
        mock_client.table().select().eq().execute.return_value = mock_res
        
        yield mock_client

@pytest.fixture(autouse=True)
def mock_github_sync():
    from unittest.mock import AsyncMock
    with patch('app.api.routes.leetcode.LeetCodeGitHubSyncService.sync_submission', new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = (True, "path.md", "sha123")
        yield mock_sync

def test_accepted_submission_returns_201(mock_supabase_client):
    response = client.post("/api/v1/leetcode/submissions", json={
        "problemSlug": "two-sum",
        "problemTitle": "Two Sum",
        "status": "accepted",
        "source": "leetcode",
        "sourceCode": "class Solution: pass",
        "submittedAt": "2026-08-09T23:16:34.126Z",
        "submissionId": "2100888874"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["operation"] == "created"
    assert data["submissionId"] == "2100888874"
    assert data["problemSlug"] == "two-sum"
    assert data["status"] == "accepted"
    assert "receivedAt" in data

def test_duplicate_submission_returns_200(mock_supabase_client):
    # Setup mock to return a duplicate
    mock_res = MagicMock()
    mock_res.data = [{"leetcode_submission_id": "2100888874"}]
    mock_supabase_client.table().select().eq().execute.return_value = mock_res
    
    response = client.post("/api/v1/leetcode/submissions", json={
        "problemSlug": "two-sum",
        "problemTitle": "Two Sum",
        "status": "accepted",
        "source": "leetcode",
        "sourceCode": "class Solution: pass",
        "submittedAt": "2026-08-09T23:16:34.126Z",
        "submissionId": "2100888874"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["operation"] == "duplicate"
    
def test_supabase_failure_safe_500_response(mock_supabase_client):
    mock_supabase_client.table().insert().execute.side_effect = Exception("DB Down")
    
    response = client.post("/api/v1/leetcode/submissions", json={
        "problemSlug": "two-sum",
        "problemTitle": "Two Sum",
        "status": "accepted",
        "source": "leetcode",
        "sourceCode": "class Solution: pass",
        "submittedAt": "2026-08-09T23:16:34.126Z",
        "submissionId": "2100888874"
    })
    assert response.status_code == 500
    assert response.json()["detail"] == "Failed to persist submission due to an internal error."

def test_missing_supabase_config_safe_failure():
    with patch('app.services.leetcode_service.get_supabase_client', side_effect=Exception("Database configuration error")):
        response = client.post("/api/v1/leetcode/submissions", json={
            "problemSlug": "two-sum",
            "problemTitle": "Two Sum",
            "status": "accepted",
            "source": "leetcode",
            "sourceCode": "class Solution: pass",
            "submittedAt": "2026-08-09T23:16:34.126Z",
            "submissionId": "2100888874"
        })
        assert response.status_code == 500

def test_rejected_submission_returns_201():
    response = client.post("/api/v1/leetcode/submissions", json={
        "problemSlug": "two-sum",
        "problemTitle": "Two Sum",
        "status": "rejected",
        "source": "leetcode",
        "sourceCode": "class Solution: pass",
        "submittedAt": "2026-08-09T23:16:34.126Z",
        "submissionId": "2100888875"
    })
    assert response.status_code == 201
    assert response.json()["status"] == "rejected"

def test_runtime_error_normalized_submission_using_rejected_returns_201():
    response = client.post("/api/v1/leetcode/submissions", json={
        "problemSlug": "two-sum",
        "problemTitle": "Two Sum",
        "status": "rejected",
        "source": "leetcode",
        "sourceCode": "class Solution: pass",
        "submittedAt": "2026-08-09T23:16:34.126Z",
        "submissionId": "2100888876"
    })
    assert response.status_code == 201
    assert response.json()["status"] == "rejected"

def test_missing_problem_slug_returns_422():
    response = client.post("/api/v1/leetcode/submissions", json={
        "problemSlug": "",
        "problemTitle": "Two Sum",
        "status": "accepted",
        "source": "leetcode",
        "sourceCode": "class Solution: pass",
        "submittedAt": "2026-08-09T23:16:34.126Z",
        "submissionId": "123"
    })
    assert response.status_code == 422

def test_missing_problem_title_returns_422():
    response = client.post("/api/v1/leetcode/submissions", json={
        "problemSlug": "two-sum",
        "problemTitle": "",
        "status": "accepted",
        "source": "leetcode",
        "sourceCode": "class Solution: pass",
        "submittedAt": "2026-08-09T23:16:34.126Z",
        "submissionId": "123"
    })
    assert response.status_code == 422

def test_empty_source_code_returns_422():
    response = client.post("/api/v1/leetcode/submissions", json={
        "problemSlug": "two-sum",
        "problemTitle": "Two Sum",
        "status": "accepted",
        "source": "leetcode",
        "sourceCode": "   ",
        "submittedAt": "2026-08-09T23:16:34.126Z",
        "submissionId": "123"
    })
    assert response.status_code == 422

def test_empty_submission_id_returns_422():
    response = client.post("/api/v1/leetcode/submissions", json={
        "problemSlug": "two-sum",
        "problemTitle": "Two Sum",
        "status": "accepted",
        "source": "leetcode",
        "sourceCode": "class Solution: pass",
        "submittedAt": "2026-08-09T23:16:34.126Z",
        "submissionId": "   "
    })
    assert response.status_code == 422

def test_invalid_source_returns_422():
    response = client.post("/api/v1/leetcode/submissions", json={
        "problemSlug": "two-sum",
        "problemTitle": "Two Sum",
        "status": "accepted",
        "source": "hackerrank",
        "sourceCode": "class Solution: pass",
        "submittedAt": "2026-08-09T23:16:34.126Z",
        "submissionId": "123"
    })
    assert response.status_code == 422

def test_invalid_status_returns_422():
    response = client.post("/api/v1/leetcode/submissions", json={
        "problemSlug": "two-sum",
        "problemTitle": "Two Sum",
        "status": "invalid_status",
        "source": "leetcode",
        "sourceCode": "class Solution: pass",
        "submittedAt": "2026-08-09T23:16:34.126Z",
        "submissionId": "123"
    })
    assert response.status_code == 422

def test_valid_iso_submitted_at_is_accepted():
    response = client.post("/api/v1/leetcode/submissions", json={
        "problemSlug": "two-sum",
        "problemTitle": "Two Sum",
        "status": "accepted",
        "source": "leetcode",
        "sourceCode": "class Solution: pass",
        "submittedAt": "2026-08-09T23:16:34.126Z",
        "submissionId": "123"
    })
    assert response.status_code == 201
