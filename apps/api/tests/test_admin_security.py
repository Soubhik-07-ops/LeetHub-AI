import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.main import app

client = TestClient(app)

def test_normal_user_cannot_access_admin():
    # If we don't override the admin dependency, it will try to call supabase and fail since there's no auth header, returning 401/403.
    response = client.get("/api/v1/admin/dashboard")
    assert response.status_code == 401

@patch("app.api.deps.get_supabase_client")
def test_normal_user_gets_403(mock_supabase):
    from app.api.deps import get_current_user_id
    
    # Override get_current_user_id to simulate logged in normal user
    def override_get_current_user_id():
        return "normal-user-123"
        
    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    
    # Simulate DB check failing to find admin role
    mock_client = mock_supabase.return_value
    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
    
    response = client.get("/api/v1/admin/dashboard")
    assert response.status_code == 403
    
    del app.dependency_overrides[get_current_user_id]
