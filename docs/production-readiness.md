# Production Readiness Overview (Phase 6E)

This document outlines the production readiness posture of LeetBranch following the Phase 6E Hardening phase.

## 1. Architecture Overview
LeetBranch uses a decoupled architecture for security and scale:
- **Chrome Extension (Client)**: Captures user submission intents directly from the browser context. Persists to `chrome.storage.local` before attempting reliable transport to the backend.
- **Next.js (Web Dashboard)**: Renders the analytics dashboard and manages integrations (GitHub App flow and extension pairing).
- **FastAPI (Backend)**: Validates incoming payloads, manages Supabase persistence, generates analytics, and orchestrates GitHub synchronization.
- **Supabase (Database & Auth)**: PostgreSQL with strict Row-Level Security (RLS) guaranteeing absolute data isolation.

## 2. Authentication Architecture
- **Web App**: Uses standard Supabase Auth (JWTs).
- **Extension**: Uses a proprietary OTP Pairing protocol. Next.js generates a 6-digit cryptographically random code (valid 10 mins). The extension redeems this for a secure, 32-byte long-lived Extension Credential that is hashed (SHA-256) before storage in the database.

## 3. GitHub App Architecture
- Replaced global PAT tokens with a per-user GitHub App configuration.
- The Backend generates short-lived Installation Access Tokens uniquely scoped to individual GitHub App installations.
- Tokens are never stored permanently, never logged, and never exposed to the frontend.

## 4. Database Security
- Strict RLS ensures `auth.uid() = user_id`.
- Foreign keys cascade deletion naturally if a user account is destroyed.
- Data isolated by `UUID`. No anonymous data migration occurs without cryptographic proof of ownership.

## 5. Extension Security
- Extension communicates strictly with the backend via Bearer Authentication.
- Host permissions must remain restricted to LeetCode and the designated backend API.
- Re-use of pairing codes is impossible.

## 6. API Security
- Validated via Pydantic models.
- JWT and Bearer validations enforce 401 blocks.
- Anonymous Submissions strictly disabled in production (`ALLOW_ANONYMOUS_SUBMISSIONS=false`).

## 7. Secret Management
- `SUPABASE_SERVICE_ROLE_KEY` is completely hidden.
- `GITHUB_APP_PRIVATE_KEY` and client secrets are restricted strictly to FastAPI's `.env`.
- Frontend `.env.local` contains only public keys (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).

## 8. Threat Model
- **Token Theft**: If an extension token is stolen, the user can easily "Disconnect" from the dashboard which immediately revokes the credential.
- **Database Exposure**: RLS prevents an attacker gaining global query access even if an endpoint has a SQL-injection vulnerability (which Pydantic mitigates).
- **GitHub Abuse**: Scope boundaries (per-repo installation tokens) mean LeetBranch cannot accidentally write to a repo it wasn't explicitly granted access to.

## 9. Failure Modes & Recovery
- **GitHub Outage**: The backend gracefully flags the `github_sync_status` as `failed` or `skipped`, keeping the `submission` safely inside Supabase. Future retry jobs can be triggered.
- **Network Drop**: Chrome Extension retains the payload locally until transport succeeds.

## 10. Observability
- Strict standard Python logging.
- `submissionId` and `operation` are logged, but sensitive `sourceCode` and Tokens are strictly barred from log output.

## 11. Deployment Requirements
- Must enforce HTTPS in production.
- Use platform-managed Secret Managers (e.g. AWS Secrets Manager, Vercel Secrets).
- Supabase production requires Email Verification (do not disable).

## 12. Remaining Production Work
- True distributed background tasks (e.g. Celery / Redis) for queueing GitHub retries in case of long-term GitHub outages.
- More robust Rate-Limiting beyond single-instance architectures (e.g. Redis based token buckets).
