import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.main import app
from app.api.deps import get_current_admin_user

client = TestClient(app)

def override_get_current_admin_user():
    return "admin-123"

def override_get_current_admin_user_fail():
    from fastapi import HTTPException
    raise HTTPException(status_code=403, detail="Admin privileges required")

@patch("app.api.deps.get_supabase_client")
def test_admin_guard_rejects_normal_user(mock_supabase):
    app.dependency_overrides[get_current_admin_user] = override_get_current_admin_user_fail
    
    response = client.get("/api/v1/admin/dashboard")
    assert response.status_code == 403
    
    del app.dependency_overrides[get_current_admin_user]

@patch("app.services.admin_service.get_supabase_client")
def test_admin_approve_payment(mock_admin_supabase):
    app.dependency_overrides[get_current_admin_user] = override_get_current_admin_user
    
    mock_admin_client = MagicMock()
    mock_admin_supabase.return_value = mock_admin_client
    
    mock_admin_client.rpc.return_value.execute.return_value.data = {"success": True, "subscription_id": "sub-1"}
    
    response = client.post("/api/v1/admin/payments/req-1/approve", json={"admin_note": "verified"})
    assert response.status_code == 200
    assert response.json()["success"] == True
    
    mock_admin_client.rpc.assert_called_once_with(
        "approve_payment_request",
        {"p_request_id": "req-1", "p_admin_id": "admin-123", "p_admin_note": "verified"}
    )
    
    del app.dependency_overrides[get_current_admin_user]
