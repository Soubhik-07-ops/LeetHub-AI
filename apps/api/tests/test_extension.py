import pytest
from fastapi.testclient import TestClient
from app.main import app
from unittest.mock import patch, MagicMock

client = TestClient(app)

@pytest.fixture(autouse=True)
def mock_supabase_client():
    with patch('app.services.extension_service.get_supabase_client') as mock_get_client:
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        
        mock_res = MagicMock()
        mock_res.data = []
        mock_client.table.return_value.select.return_value.eq.return_value.is_.return_value.execute.return_value = mock_res
        mock_client.table.return_value.delete.return_value.eq.return_value.is_.return_value.execute.return_value = mock_res
        
        yield mock_client

def test_generate_pairing_code():
    from app.api.deps import get_current_user_id
    app.dependency_overrides[get_current_user_id] = lambda: "user123"
    try:
        response = client.post("/api/v1/extension/pairing-code")
        assert response.status_code == 200
    finally:
        app.dependency_overrides.pop(get_current_user_id, None)

def test_link_extension_invalid_code():
    response = client.post("/api/v1/extension/link", json={"code": "123456"})
    assert response.status_code == 400
    assert "Invalid or expired pairing code" in response.json()["detail"]
