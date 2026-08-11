import asyncio
import logging
from datetime import datetime, timezone, timedelta
from app.integrations.supabase.client import get_supabase_client
from app.services.leetcode_github_service import LeetCodeGitHubSyncService
from app.integrations.leetcode.schemas import GitHubSyncStatus, LeetCodeSubmissionRequest, SubmissionStatus
import httpx

logger = logging.getLogger(__name__)

class GitHubSyncRetryWorker:
    def __init__(self):
        self.running = False
        self.task = None

    async def start(self):
        self.running = True
        self.task = asyncio.create_task(self._run_loop())
        logger.info("GitHub Sync Retry Worker started.")

    async def stop(self):
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        logger.info("GitHub Sync Retry Worker stopped.")

    async def _run_loop(self):
        while self.running:
            try:
                await self._process_pending_retries()
            except Exception as e:
                logger.error(f"Error in retry worker loop: {e}")
            
            # Wait 60 seconds before next poll
            await asyncio.sleep(60)

    async def _process_pending_retries(self):
        supabase = get_supabase_client()
        
        # Query for failed syncs needing retry using atomic RPC
        try:
            res = supabase.rpc("claim_retry_submissions", {"max_rows": 5}).execute()
        except Exception as e:
            logger.error(f"Error calling claim_retry_submissions RPC: {e}")
            return
            
        if not res.data:
            return
            
        logger.info(f"Found {len(res.data)} submissions to retry syncing.")
        
        timeout = httpx.Timeout(10.0, connect=5.0)
        async with httpx.AsyncClient(timeout=timeout) as async_client:
            sync_service = LeetCodeGitHubSyncService(async_client=async_client)
            
            for sub in res.data:
                await self._retry_submission(sub, sync_service, supabase)

    async def _retry_submission(self, sub: dict, sync_service: LeetCodeGitHubSyncService, supabase):
        user_id = sub.get("user_id")
        submission_id = sub.get("leetcode_submission_id")
        attempts = sub.get("github_sync_attempts", 0) + 1
        
        logger.info(f"Retrying sync for submission {submission_id} (Attempt {attempts})")
        
        # Reconstruct request for sync_service
        try:
            status_enum = SubmissionStatus(sub.get("status"))
        except ValueError:
            status_enum = SubmissionStatus("accepted") # default to accepted for retry logic if parsing fails
            
        request = LeetCodeSubmissionRequest(
            problemSlug=sub.get("problem_slug"),
            problemTitle=sub.get("problem_title"),
            status=status_enum,
            source="leetcode",
            sourceCode=sub.get("source_code"),
            submittedAt=datetime.fromisoformat(sub.get("submitted_at").replace('Z', '+00:00')),
            submissionId=submission_id
        )
        
        try:
            sync_success, gh_path, gh_sha = await sync_service.sync_submission(request, user_id)
            
            if sync_success:
                # Success: update status to synced
                supabase.table("submissions").update({
                    "github_sync_status": "synced",
                    "github_path": gh_path,
                    "github_commit_sha": gh_sha,
                    "github_synced_at": datetime.now(timezone.utc).isoformat(),
                    "github_sync_attempts": attempts,
                    "github_last_sync_error": None
                }).eq("id", sub.get("id")).execute()
                logger.info(f"Successfully retried sync for {submission_id}")
            else:
                # Still failing: calculate backoff
                self._handle_failure(supabase, sub.get("id"), attempts, "Unknown sync failure")
                
        except Exception as e:
            logger.error(f"Exception during retry sync for {submission_id}: {e}")
            error_msg = str(e)
            # If 401/403, we might want to stop retrying, but exponential backoff handles it up to 3 tries.
            self._handle_failure(supabase, sub.get("id"), attempts, error_msg)
            
    def _handle_failure(self, supabase, row_id: str, attempts: int, error_msg: str):
        # Exponential backoff: 1 min, 5 mins, 15 mins...
        backoff_minutes = 5 ** (attempts - 1)
        next_retry = datetime.now(timezone.utc) + timedelta(minutes=backoff_minutes)
        
        supabase.table("submissions").update({
            "github_sync_attempts": attempts,
            "github_last_sync_error": error_msg,
            "github_next_retry_at": next_retry.isoformat()
        }).eq("id", row_id).execute()

worker = GitHubSyncRetryWorker()
