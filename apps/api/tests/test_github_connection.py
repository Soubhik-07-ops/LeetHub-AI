import pytest
from fastapi.testclient import TestClient
from app.main import app
from unittest.mock import patch, MagicMock

client = TestClient(app)

@pytest.fixture(autouse=True)
def mock_supabase_client():
    with patch('app.services.github_connection_service.get_supabase_client') as mock_get_client:
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_res = MagicMock()
        mock_res.data = [{"id": "1", "github_username": "test", "repository_full_name": "", "repository_id": "", "installation_id": "123", "default_branch": "", "created_at": "2026-08-10T00:00:00Z"}]
        mock_query = mock_client.table.return_value.select.return_value.eq.return_value
        mock_query.execute.return_value = mock_res
        mock_query.is_.return_value.execute.return_value = mock_res
        
        mock_insert_res = MagicMock()
        mock_insert_res.data = [{"id": "1", "github_username": "test", "repository_full_name": "test/repo", "repository_id": "123", "installation_id": "123", "default_branch": "main", "created_at": "2026-08-10T00:00:00Z"}]
        mock_client.table.return_value.insert.return_value.execute.return_value = mock_insert_res
        mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_insert_res
        
        yield mock_client

def test_get_connection_unauthorized():
    app.dependency_overrides.clear()
    response = client.get("/api/v1/integrations/github/connection")
    assert response.status_code == 401

def test_create_connection():
    from app.api.deps import get_current_user_id
    from unittest.mock import AsyncMock
    app.dependency_overrides[get_current_user_id] = lambda: "user123"
    try:
        with patch('app.api.routes.github.GitHubAppAuth.get_installation_access_token', new_callable=AsyncMock) as mock_auth:
            mock_auth.return_value = "fake_token"
            with patch('app.api.routes.github.GitHubAppAuth.get_installation_repositories', new_callable=AsyncMock) as mock_repos:
                mock_repos.return_value = [{"id": 123, "full_name": "owner/repo"}]
                
                response = client.post("/api/v1/integrations/github/connection", json={
                    "repository_id": "123",
                    "default_branch": "main"
                })
                assert response.status_code == 200
    finally:
        app.dependency_overrides.pop(get_current_user_id, None)
