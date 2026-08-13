import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.main import app
from app.api.deps import get_current_user_id

client = TestClient(app)

def override_get_current_user_id():
    return "user-123"

@patch("app.services.billing_service.BillingService.get_billing_config")
@patch("app.services.billing_service.get_supabase_client")
def test_create_payment_request_success(mock_supabase, mock_get_billing_config):
    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    mock_client = MagicMock()
    mock_supabase.return_value = mock_client
    mock_get_billing_config.return_value = {"price": 69, "upi_id": "test@upi"}
    
    # 1. No pending requests
    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
    # 2. Plan config
    mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"id": "plan-id", "price_inr": 69}]
    # 3. Insert success
    mock_client.table.return_value.insert.return_value.execute.return_value.data = [{"id": "req-1"}]
    
    response = client.post("/api/v1/billing/payment-request", json={
        "upi_reference": "123456789012",
        "proof_url": "http://example.com/proof.png"
    })
    
    assert response.status_code == 200
    assert response.json()["id"] == "req-1"
    del app.dependency_overrides[get_current_user_id]

@patch("app.services.billing_service.get_supabase_client")
def test_create_payment_request_duplicate_pending(mock_supabase):
    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    mock_client = MagicMock()
    mock_supabase.return_value = mock_client
    
    # 1. Has pending request
    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [{"id": "pending-1"}]
    
    response = client.post("/api/v1/billing/payment-request", json={
        "upi_reference": "123456789012",
        "proof_url": "http://example.com/proof.png"
    })
    
    assert response.status_code == 400
    assert "pending payment request" in response.json()["detail"]
    del app.dependency_overrides[get_current_user_id]
