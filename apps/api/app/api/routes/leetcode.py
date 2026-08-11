from fastapi import APIRouter, status, HTTPException, Response, Request
from datetime import datetime, timezone
import logging
from app.integrations.leetcode.schemas import (
    LeetCodeSubmissionRequest,
    LeetCodeSubmissionResponse,
    GitHubSyncStatus
)
from app.services.leetcode_service import leetcode_service
from app.services.leetcode_github_service import LeetCodeGitHubSyncService
from app.services.github_service import GitHubService
from app.integrations.github.client import GitHubClient
from app.core.config import settings
import httpx
from fastapi import Depends
from typing import Optional
from app.api.deps import get_extension_user_id
from app.core.rate_limit import limiter

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/submissions", response_model=LeetCodeSubmissionResponse)
@limiter.limit("30/minute")
async def ingest_submission(
    request: Request,
    body: LeetCodeSubmissionRequest, 
    response: Response,
    user_id: Optional[str] = Depends(get_extension_user_id)
) -> LeetCodeSubmissionResponse:
    try:
        success, operation, github_sync_status = leetcode_service.save_submission(body, user_id=user_id)
        
        # Determine if we need to sync to GitHub
        should_sync = False
        if operation == "created":
            should_sync = True
        elif operation == "duplicate" and github_sync_status == "failed":
            should_sync = True
            
        final_sync_status = GitHubSyncStatus.skipped
        if not should_sync:
            # If it's a duplicate and not failed, it's skipped or whatever it was
            final_sync_status = GitHubSyncStatus.skipped
        else:
            # Execute GitHub Sync
            timeout = httpx.Timeout(10.0, connect=5.0)
            async with httpx.AsyncClient(timeout=timeout) as async_client:
                sync_service = LeetCodeGitHubSyncService(async_client=async_client)
                
                sync_success, gh_path, gh_sha = await sync_service.sync_submission(body, user_id)
                
                final_sync_status = GitHubSyncStatus.synced if sync_success else GitHubSyncStatus.failed
                
                # Update DB state
                leetcode_service.update_github_sync_status(
                    submission_id=body.submissionId,
                    status=final_sync_status.value,
                    path=gh_path,
                    commit_sha=gh_sha
                )

        if operation == "created":
            response.status_code = status.HTTP_201_CREATED
        else:
            response.status_code = status.HTTP_200_OK
            
        # Log only safe metadata
        logger.info(
            "Processed LeetCode submission: submissionId=%s, problemSlug=%s, status=%s, operation=%s, githubSync=%s",
            body.submissionId,
            body.problemSlug,
            body.status.value,
            operation,
            final_sync_status.value
        )
        
        return LeetCodeSubmissionResponse(
            success=success,
            operation=operation,
            submissionId=body.submissionId,
            problemSlug=body.problemSlug,
            status=body.status,
            receivedAt=datetime.now(timezone.utc),
            githubSync=final_sync_status
        )
    except Exception as e:
        logger.error("Failed to process submission: safe internal error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist submission due to an internal error."
        )
