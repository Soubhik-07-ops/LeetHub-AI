import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.workers.github_retry_worker import GitHubSyncRetryWorker
from datetime import datetime, timezone, timedelta

@pytest.mark.asyncio
@patch("app.workers.github_retry_worker.get_supabase_client")
@patch("app.workers.github_retry_worker.LeetCodeGitHubSyncService")
async def test_worker_exponential_backoff_and_rpc(mock_sync_service, mock_get_supabase):
    worker = GitHubSyncRetryWorker()
    
    mock_supabase = MagicMock()
    mock_get_supabase.return_value = mock_supabase
    
    # Mock RPC returning 1 failed row
    mock_res = MagicMock()
    mock_res.data = [{
        "id": "row-1",
        "user_id": "user-1",
        "leetcode_submission_id": "sub-1",
        "github_sync_attempts": 2,
        "status": "Accepted",
        "problem_slug": "two-sum",
        "problem_title": "Two Sum",
        "source_code": "print(1)",
        "submitted_at": "2023-01-01T12:00:00Z"
    }]
    mock_supabase.rpc.return_value.execute.return_value = mock_res
    
    # Mock Sync Failure again
    mock_service_instance = AsyncMock()
    mock_service_instance.sync_submission.return_value = (False, None, None)
    mock_sync_service.return_value = mock_service_instance
    
    # Execute the processing function directly
    await worker._process_pending_retries()
    
    # Assert RPC was called for multi-instance safety
    mock_supabase.rpc.assert_called_with("claim_retry_submissions", {"max_rows": 5})
    
    # Assert it updated failure state with backoff
    mock_supabase.table.return_value.update.assert_called_once()
    update_kwargs = mock_supabase.table.return_value.update.call_args[0][0]
    
    assert update_kwargs["github_sync_attempts"] == 3
    assert "github_next_retry_at" in update_kwargs
    assert update_kwargs["github_last_sync_error"] == "Unknown sync failure"
