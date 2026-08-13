import pytest
from unittest.mock import patch, MagicMock

@patch("app.services.admin_service.get_supabase_client")
def test_admin_users_view_used(mock_supabase):
    from app.services.admin_service import admin_service
    
    mock_client = MagicMock()
    mock_supabase.return_value = mock_client
    
    # Mock chain
    mock_query = MagicMock()
    mock_client.table.return_value.select.return_value.order.return_value = mock_query
    
    # We shouldn't actually execute, just check if table and select were called correctly
    # But since we patched get_supabase_client, we can just call the service method
    mock_query.execute.return_value = MagicMock(data=[], count=0)
    mock_query.range.return_value.execute.return_value = MagicMock(data=[], count=0)
    
    # Test list_users
    admin_service.list_users(page=1, limit=10)
    mock_client.table.assert_called_with("admin_users_view")
    
    # Test list_payment_requests
    admin_service.list_payment_requests()
    mock_client.table.assert_called_with("payment_requests")
    # Verify the select uses the view!
    mock_client.table.return_value.select.assert_called_with("*, user:admin_users_view!payment_requests_user_id_fkey(email)", count="exact")
