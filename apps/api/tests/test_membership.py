import pytest
from unittest.mock import patch, MagicMock

from app.services.membership_service import membership_service
from app.services.ai_usage_service import ai_usage_service

@pytest.fixture
def mock_supabase():
    with patch("app.services.membership_service.get_supabase_client") as mock1, \
         patch("app.services.ai_usage_service.get_supabase_client") as mock2:
        yield mock1, mock2

def test_get_user_ai_usage_stats_success(mock_supabase):
    mock1, mock2 = mock_supabase
    mock_client = MagicMock()
    mock1.return_value = mock_client
    
    mock_client.rpc.return_value.execute.return_value.data = {
        "plan": "free",
        "analysis": {"limit": 5, "used": 2, "remaining": 3},
        "chat": {"limit": 10, "used": 5, "remaining": 5}
    }
    
    stats = membership_service.get_user_ai_usage_stats("user-123")
    assert stats["plan"] == "free"
    assert stats["analysis"]["remaining"] == 3

def test_get_user_ai_usage_stats_fallback(mock_supabase):
    mock1, mock2 = mock_supabase
    mock_client = MagicMock()
    mock1.return_value = mock_client
    
    # Simulate DB error
    mock_client.rpc.return_value.execute.side_effect = Exception("DB error")
    
    stats = membership_service.get_user_ai_usage_stats("user-123")
    assert stats["plan"] == "free"
    assert stats["analysis"]["remaining"] == 0 # Fallback should block usage for safety

def test_reserve_quota_success(mock_supabase):
    mock1, mock2 = mock_supabase
    mock_client = MagicMock()
    mock2.return_value = mock_client
    
    # Mock row returned from check_and_reserve_ai_quota
    mock_client.rpc.return_value.execute.return_value.data = [{
        "is_allowed": True,
        "usage_id": "usage-123",
        "model_to_use": "free-model-placeholder"
    }]
    
    with patch("app.services.ai_usage_service.settings") as mock_settings:
        mock_settings.OPENROUTER_FREE_MODEL = "openrouter/free"
        is_allowed, usage_id, model = ai_usage_service.reserve_quota("user-123", "analysis")
        
        assert is_allowed is True
        assert usage_id == "usage-123"
        assert model == "openrouter/free"

def test_reserve_quota_exhausted(mock_supabase):
    mock1, mock2 = mock_supabase
    mock_client = MagicMock()
    mock2.return_value = mock_client
    
    mock_client.rpc.return_value.execute.return_value.data = [{
        "is_allowed": False,
        "usage_id": None,
        "model_to_use": "free-model-placeholder"
    }]
    
    is_allowed, usage_id, model = ai_usage_service.reserve_quota("user-123", "analysis")
    assert is_allowed is False
    assert usage_id is None

def test_finalize_usage(mock_supabase):
    mock1, mock2 = mock_supabase
    mock_client = MagicMock()
    mock2.return_value = mock_client
    
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    mock_eq = MagicMock()
    mock_table.update.return_value = mock_eq
    
    ai_usage_service.finalize_usage("usage-123", "completed", 10, 20, 0.01)
    
    mock_table.update.assert_called_once_with({
        "status": "completed",
        "input_tokens": 10,
        "output_tokens": 20,
        "estimated_cost": 0.01
    })
    mock_eq.eq.assert_called_once_with("id", "usage-123")
    mock_eq.eq.return_value.execute.assert_called_once()
