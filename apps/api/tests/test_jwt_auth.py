import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app
from app.core.config import settings

client = TestClient(app)

@patch('app.api.deps.get_supabase_client')
def test_missing_auth_header_for_analytics(mock_get_client):
    res = client.get("/api/v1/analytics/overview")
    assert res.status_code == 401

@patch('app.api.deps.get_supabase_client')
def test_malformed_auth_header(mock_get_client):
    res = client.get("/api/v1/analytics/overview", headers={"Authorization": "MalformedToken"})
    assert res.status_code in (401, 403)

@patch('app.api.deps.get_supabase_client')
def test_invalid_jwt(mock_get_client):
    mock_client = MagicMock()
    mock_client.auth.get_user.return_value = None
    mock_get_client.return_value = mock_client

    res = client.get("/api/v1/analytics/overview", headers={"Authorization": "Bearer invalidtoken"})
    assert res.status_code == 401
    assert "Invalid authentication token" in res.json()["detail"]

@patch('app.api.deps.get_supabase_client')
@patch('app.services.analytics_service.get_supabase_client')
def test_valid_jwt(mock_analytics_client, mock_auth_client):
    mock_auth = MagicMock()
    mock_user_res = MagicMock()
    mock_user_res.user.id = "valid-user-id"
    mock_auth.auth.get_user.return_value = mock_user_res
    mock_auth_client.return_value = mock_auth
    
    mock_db = MagicMock()
    mock_query = MagicMock()
    mock_query.select.return_value = mock_query
    mock_query.eq.return_value = mock_query
    mock_query.order.return_value = mock_query
    mock_query.limit.return_value = mock_query
    mock_query.execute.return_value = MagicMock(data=[])
    mock_db.table.return_value = mock_query
    
    def rpc_side_effect(name, *args, **kwargs):
        m = MagicMock()
        if name == 'get_overview_stats':
            m.execute.return_value = MagicMock(data=[{'total_submissions': 0, 'unique_problems': 0, 'accepted_submissions': 0, 'rejected_submissions': 0, 'github_synced_count': 0, 'github_failed_count': 0, 'github_skipped_count': 0}])
        else:
            m.execute.return_value = MagicMock(data=[])
        return m
    mock_db.rpc.side_effect = rpc_side_effect
    
    mock_analytics_client.return_value = mock_db

    res = client.get("/api/v1/analytics/overview", headers={"Authorization": "Bearer validtoken"})
    assert res.status_code == 200


