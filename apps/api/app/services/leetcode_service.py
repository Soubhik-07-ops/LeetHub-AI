import logging
from typing import Tuple
from app.integrations.leetcode.schemas import LeetCodeSubmissionRequest
from app.integrations.supabase.client import get_supabase_client
from postgrest.exceptions import APIError

logger = logging.getLogger(__name__)

class LeetCodeService:
    def save_submission(self, request: LeetCodeSubmissionRequest, user_id: str = None) -> Tuple[bool, str, str]:
        """
        Saves a submission to Supabase.
        Returns a tuple of (success_bool, operation_str, github_sync_status_str).
        operation is 'created' or 'duplicate'.
        Raises Exception safely on failure.
        """
        try:
            client = get_supabase_client()
        except Exception as e:
            logger.error("Failed to acquire Supabase client")
            raise Exception("Database configuration error") from e
            
        try:
            # Check for duplicate submission safely
            res = client.table('submissions').select('leetcode_submission_id, github_sync_status').eq('leetcode_submission_id', request.submissionId).execute()
            if res.data and len(res.data) > 0:
                logger.info("Duplicate submission detected: %s", request.submissionId)
                existing_status = res.data[0].get('github_sync_status', 'pending')
                return True, "duplicate", existing_status
                
            data = {
                "leetcode_submission_id": request.submissionId,
                "problem_slug": request.problemSlug,
                "problem_title": request.problemTitle,
                "status": request.status.value,
                "source_code": request.sourceCode,
                "submitted_at": request.submittedAt.isoformat(),
                "github_sync_status": "pending",
                "user_id": user_id
            }
            
            client.table('submissions').insert(data).execute()
            return True, "created", "pending"
            
        except APIError as e:
            # In case of concurrent insert race condition, handle unique constraint gracefully
            error_msg = str(e).lower()
            if "23505" in error_msg or "unique constraint" in error_msg or "duplicate key" in error_msg:
                logger.info("Duplicate submission constraint triggered for: %s", request.submissionId)
                res_check = client.table('submissions').select('github_sync_status').eq('leetcode_submission_id', request.submissionId).execute()
                status = res_check.data[0].get('github_sync_status', 'pending') if (res_check.data and len(res_check.data) > 0) else 'pending'
                return True, "duplicate", status
            logger.error("Supabase API Error during submission save")
            raise Exception("Database insertion failure") from e
        except Exception as e:
            logger.error("Unexpected error during submission save")
            raise Exception("Internal server error") from e

    def update_github_sync_status(self, submission_id: str, status: str, path: str = None, commit_sha: str = None) -> bool:
        try:
            client = get_supabase_client()
            update_data = {
                "github_sync_status": status
            }
            if status == "synced":
                from datetime import datetime, timezone
                update_data["github_synced_at"] = datetime.now(timezone.utc).isoformat()
                update_data["github_last_sync_error"] = None
            elif status == "failed":
                from datetime import datetime, timezone, timedelta
                update_data["github_sync_attempts"] = 1
                update_data["github_next_retry_at"] = (datetime.now(timezone.utc) + timedelta(minutes=1)).isoformat()
            if path:
                update_data["github_path"] = path
            if commit_sha:
                update_data["github_commit_sha"] = commit_sha
                
            client.table('submissions').update(update_data).eq('leetcode_submission_id', submission_id).execute()
            return True
        except Exception as e:
            logger.error("Failed to update github sync status for %s", submission_id)
            return False

leetcode_service = LeetCodeService()
