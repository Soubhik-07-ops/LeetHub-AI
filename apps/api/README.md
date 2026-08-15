# LeetBranch Backend API

FastAPI backend for LeetBranch.

## Local Development Setup

### 1. GitHub Token Configuration
For local development, you need a GitHub Personal Access Token (PAT):
1. Go to GitHub -> Settings -> Developer settings -> Personal access tokens -> Tokens (classic).
2. Generate a new token with at least `repo` permissions (to read/write to your repositories).
3. Do **NOT** commit this token. Add it to `apps/api/.env` (which is git-ignored).

### 2. Required Environment Variables
Create a `.env` file in `apps/api/` based on `.env.example`:
```
GITHUB_TOKEN=your_pat_here
GITHUB_OWNER=your_github_username
GITHUB_REPOSITORY=your_repo_name
GITHUB_BRANCH=main
```

### 3. Start the Server
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Test GitHub Integration
Call the development endpoint to verify your integration works:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/integrations/github/test
```
Successful output:
```json
{
  "success": true,
  "operation": "created",
  "path": ".leetbranch/test/integration-status.md",
  "commit_sha": "...",
  "commit_url": "...",
  "error_message": null
}
```

## GitHub Integration Architecture
- **Dependency Injection**: The `GitHubService` accepts a `GitHubClient` instance. The client lifecycle and HTTP connection pooling are managed by the caller, using an explicit timeout-configured `httpx.AsyncClient`.
- **Idempotency (No-Op)**: When `create_or_update_file` is called, it fetches the existing file content. If the new content identically matches the existing content, it returns an operation of `noop` and skips the GitHub commit. Valid operations are `created`, `updated`, and `noop`.
- **Future OAuth Migration**: Currently, the token and repository are read from environment variables for local development. The service layer is intentionally decoupled from global configuration. During production, user-specific OAuth tokens and repository details will be injected per request from the database, requiring no changes to the service.
