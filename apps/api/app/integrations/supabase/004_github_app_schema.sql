-- Migration 004: GitHub App Schema Updates

-- Add new columns for GitHub App flow
ALTER TABLE github_connections ADD COLUMN IF NOT EXISTS repository_id TEXT;
ALTER TABLE github_connections ADD COLUMN IF NOT EXISTS repository_full_name TEXT;
ALTER TABLE github_connections ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE github_connections ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

-- We want to ensure a user can only have one active connection for a specific repository
CREATE UNIQUE INDEX IF NOT EXISTS idx_github_conn_user_repo ON github_connections(user_id, repository_id) WHERE revoked_at IS NULL;
