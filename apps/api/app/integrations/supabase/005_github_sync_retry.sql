-- Migration 005: GitHub Sync Retry Worker

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS github_sync_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS github_last_sync_error TEXT,
  ADD COLUMN IF NOT EXISTS github_next_retry_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_submissions_github_next_retry_at ON submissions(github_next_retry_at);
