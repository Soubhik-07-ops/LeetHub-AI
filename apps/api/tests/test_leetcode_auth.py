import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app

client = TestClient(app)

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

def test_submission_associates_with_user_if_authenticated(mock_supabase_client):
    # Override the dependency to simulate an authenticated user
    from app.api.deps import get_extension_user_id
    app.dependency_overrides[get_extension_user_id] = lambda: "123e4567-e89b-12d3-a456-426614174000"
    
    try:
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
        
        # Check that user_id was inserted
        insert_args = mock_supabase_client.table().insert.call_args[0][0]
        assert insert_args["user_id"] == "123e4567-e89b-12d3-a456-426614174000"
    finally:
        # Clean up override
        app.dependency_overrides.pop(get_extension_user_id)

def test_submission_without_auth_saves_with_null_user(mock_supabase_client):
    # The default dependency returns None
    response = client.post("/api/v1/leetcode/submissions", json={
        "problemSlug": "two-sum",
        "problemTitle": "Two Sum",
        "status": "accepted",
        "source": "leetcode",
        "sourceCode": "class Solution: pass",
        "submittedAt": "2026-08-09T23:16:34.126Z",
        "submissionId": "2100888875"
    })
    
    assert response.status_code == 401

def test_client_payload_cannot_inject_user_id(mock_supabase_client):
    # Attempt to send a user_id maliciously in the payload
    response = client.post("/api/v1/leetcode/submissions", json={
        "problemSlug": "two-sum",
        "problemTitle": "Two Sum",
        "status": "accepted",
        "source": "leetcode",
        "sourceCode": "class Solution: pass",
        "submittedAt": "2026-08-09T23:16:34.126Z",
        "submissionId": "2100888876",
        "user_id": "malicious-user-id"
    })
    
    assert response.status_code == 401
