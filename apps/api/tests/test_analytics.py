import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app
from app.api.deps import get_current_user_id

client = TestClient(app)

def create_mock_supabase_data(data):
    mock_client = MagicMock()
    mock_query = MagicMock()
    mock_res = MagicMock()
    mock_res.data = data
    
    mock_query.select.return_value = mock_query
    mock_query.eq.return_value = mock_query
    mock_query.order.return_value = mock_query
    mock_query.limit.return_value = mock_query
    mock_query.execute.return_value = mock_res
    
    mock_client.table.return_value = mock_query
    
    # Mock RPCs
    def rpc_side_effect(name, *args, **kwargs):
        m = MagicMock()
        if name == 'get_overview_stats':
            acc = len([d for d in data if d.get('status') == 'accepted'])
            m.execute.return_value = MagicMock(data=[{
                'total_submissions': len(data),
                'unique_problems': len(set(d.get('problem_slug', '') for d in data)),
                'accepted_submissions': acc,
                'rejected_submissions': len(data) - acc,
                'github_synced_count': len([d for d in data if d.get('github_sync_status') == 'synced']),
                'github_failed_count': len([d for d in data if d.get('github_sync_status') == 'failed']),
                'github_skipped_count': len([d for d in data if d.get('github_sync_status') not in ('synced', 'failed')])
            }])
        elif name == 'get_streak_stats':
            m.execute.return_value = MagicMock(data=[{'current_streak': 0, 'longest_streak': 0}])
        elif name == 'get_activity_heatmap':
            from collections import Counter
            dates = Counter([d.get('submitted_at', '')[:10] for d in data if d.get('submitted_at')])
            hm = [{'activity_date': k, 'submissions': v} for k, v in dates.items()]
            m.execute.return_value = MagicMock(data=hm)
        elif name == 'get_trend_metrics':
            m.execute.return_value = MagicMock(data=[])
        else:
            m.execute.return_value = MagicMock(data=[])
        return m
        
    mock_client.rpc.side_effect = rpc_side_effect
    
    return mock_client, mock_query

@patch('app.services.analytics_service.get_supabase_client')
def test_analytics_empty_dataset(mock_get_client):
    app.dependency_overrides[get_current_user_id] = lambda: "test-user"
    try:
        mock_client, _ = create_mock_supabase_data([])
        mock_get_client.return_value = mock_client
        
        res = client.get("/api/v1/analytics/overview")
        assert res.status_code == 200
        data = res.json()
        assert data["total_submissions"] == 0
        assert data["unique_problems"] == 0
        assert data["acceptance_rate"] == 0.0 # handles zero division
        assert data["activity_by_day"] == []
    finally:
        app.dependency_overrides.pop(get_current_user_id, None)

@patch('app.services.analytics_service.get_supabase_client')
def test_analytics_mixed_dataset(mock_get_client):
    app.dependency_overrides[get_current_user_id] = lambda: "test-user"
    try:
        mock_data = [
            {"id": "1", "leetcode_submission_id": "1001", "problem_slug": "two-sum", "problem_title": "Two Sum", "status": "accepted", "submitted_at": "2026-08-01T12:00:00Z", "github_sync_status": "synced"},
            {"id": "2", "leetcode_submission_id": "1002", "problem_slug": "two-sum", "problem_title": "Two Sum", "status": "rejected", "submitted_at": "2026-08-01T14:00:00Z", "github_sync_status": "synced"},
            {"id": "3", "leetcode_submission_id": "1003", "problem_slug": "add-two-numbers", "problem_title": "Add", "status": "accepted", "submitted_at": "2026-08-02T12:00:00Z", "github_sync_status": "failed"},
            {"id": "4", "leetcode_submission_id": "1004", "problem_slug": "add-two-numbers", "problem_title": "Add", "status": "accepted", "submitted_at": "2026-08-03T12:00:00Z", "github_sync_status": "pending"}
        ]
        mock_client, _ = create_mock_supabase_data(mock_data)
        mock_get_client.return_value = mock_client
        
        res = client.get("/api/v1/analytics/overview")
        assert res.status_code == 200
        data = res.json()
        
        assert data["total_submissions"] == 4
        assert data["unique_problems"] == 2
        assert data["accepted_submissions"] == 3
        assert data["rejected_submissions"] == 1
        assert data["acceptance_rate"] == 75.0
        
        assert data["github_synced_count"] == 2
        assert data["github_failed_count"] == 1
        assert data["github_skipped_count"] == 1
        
        # Check UTC activity
        assert len(data["activity_by_day"]) == 3
        assert data["activity_by_day"][0] == {"date": "2026-08-01", "submissions": 2}
    finally:
        app.dependency_overrides.pop(get_current_user_id, None)

@patch('app.services.analytics_service.get_supabase_client')
def test_analytics_user_id_filtering_fallback(mock_get_client):
    # This test is no longer applicable since fallback is removed
    pass

@patch('app.services.analytics_service.get_supabase_client')
def test_analytics_user_id_filtering_authenticated(mock_get_client):
    mock_client, mock_query = create_mock_supabase_data([])
    mock_get_client.return_value = mock_client
    
    app.dependency_overrides[get_current_user_id] = lambda: "authenticated-user-id"
    
    try:
        client.get("/api/v1/analytics/overview")
        
        # Should filter by the authenticated user id
        mock_query.eq.assert_called_with('user_id', 'authenticated-user-id')
        mock_query.is_.assert_not_called()
    finally:
        app.dependency_overrides.pop(get_current_user_id, None)

@patch('app.services.analytics_service.get_supabase_client')
def test_analytics_ignores_client_user_id_query_param(mock_get_client):
    # Not applicable since we removed the None fallback
    pass

@patch('app.services.analytics_service.get_supabase_client')
def test_analytics_no_source_code_selected(mock_get_client):
    app.dependency_overrides[get_current_user_id] = lambda: "test-user"
    try:
        mock_client, mock_query = create_mock_supabase_data([])
        mock_get_client.return_value = mock_client
        
        client.get("/api/v1/analytics/overview")
        
        # Ensure select does not request source_code
        select_args = mock_query.select.call_args[0][0]
        assert "source_code" not in select_args
        assert "problem_slug" in select_args
    finally:
        app.dependency_overrides.pop(get_current_user_id, None)
