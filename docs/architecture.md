# LeetHub-AI Architecture

## 1. System Architecture Overview
LeetHub-AI is composed of several specialized components working together to detect, analyze, and synchronize LeetCode submissions to a GitHub repository, while providing a web dashboard for users to track their progress and analytics.

The system is organized into a monorepo structure with the following parts:
- `apps/web`: The main user dashboard.
- `apps/api`: The backend service orchestrating all logic.
- `apps/extension`: The browser extension detecting submissions.
- `packages/shared`: Shared types, schemas, and contracts.

## 2. Component Responsibilities
- **Web App (`apps/web`)**: 
  - Framework: Next.js (App Router), TypeScript, CSS Modules.
  - Role: Main user interface. Displays synchronized solutions, AI analysis results, streaks, and analytics. Communicates with the backend API.
- **API Backend (`apps/api`)**:
  - Framework: Python, FastAPI.
  - Role: The central brain of the application. Handles REST API requests, authentication, communicates with GitHub, orchestrates AI analysis, implements the synchronization engine, and tracks streaks/analytics.
- **Browser Extension (`apps/extension`)**:
  - Framework: Chrome Extension Manifest V3, TypeScript.
  - Role: Operates within the browser to detect accepted LeetCode submissions. Captures submission metadata and source code, securely transmitting it to the backend API.
- **Shared Packages (`packages/shared`)**:
  - Role: Provides a single source of truth for shared schemas, types, and API contracts used across TypeScript applications (Web and Extension), ensuring type safety and consistency.
- **Database**:
  - Role: Stores user profiles, authentication data, submission records (to prevent duplicates and track history), streak data, and analytics.

## 3. Data Flow
1. **Submission Detection**: The user solves a problem on LeetCode. The browser extension (`apps/extension`) detects the "Accepted" state and extracts the code and metadata.
2. **Transmission**: The extension sends the submission payload securely to the `apps/api` via REST.
3. **Validation & Deduplication**: The API verifies the user's authentication and checks the database to ensure this submission hasn't already been processed (Idempotency check).
4. **AI Processing**: The API passes the code to the abstracted AI service to analyze the solution, generate explanations, or calculate complexity.
5. **Synchronization**: The API's GitHub integration service formats the final files (code + AI analysis) and commits them to the user's linked GitHub repository.
6. **Record Keeping**: The synchronization result, streak update, and analytics are persisted in the database.
7. **Display**: The user views their dashboard (`apps/web`), which fetches the latest sync results, streaks, and analytics from the API.

## 4. Architectural Boundaries

### 4.1. LeetCode Adapter Boundary
The LeetCode integration (both within the extension and any potential API scraping/validation) must be strictly isolated behind an adapter/service boundary. The core application logic must not depend directly on LeetCode's DOM structure or internal API responses. If LeetCode changes its platform, only this adapter needs updating.

### 4.2. GitHub Integration Boundary
The GitHub integration is strictly a server-side responsibility residing in `apps/api`. GitHub OAuth tokens, Personal Access Tokens, and the commit logic will never be exposed to the frontend (`apps/web`) or the browser extension (`apps/extension`).

**Authentication & Configuration Strategy:**
- *Current development authentication*: Uses a `GITHUB_TOKEN` environment variable loaded into the backend's route handler.
- *Dependency Injection*: The `GitHubService` does not pull configuration from the global environment. Instead, clients (including HTTP clients and tokens) and repository identifiers are injected into it.
- *Future production authentication*: Will use GitHub OAuth. The API will store user-specific credentials and repository details securely in the database and inject them into the GitHub service layer per-request.

### 4.3. AI Service Boundary
AI processing is abstracted behind an internal interface in the backend. The core logic defines the input (code + problem metadata) and expected output (analysis structure). The actual implementation can easily swap between providers like OpenRouter, Gemini, or OpenAI without affecting the rest of the system.

### 4.4. Authentication Boundary
Authentication is centrally managed by the API. The Web app and Extension authenticate via secure tokens (e.g., JWT). The extension must maintain a secure session to attribute submissions to the correct user.

### 4.5. Security Boundaries
- The browser extension only reads from specific LeetCode domains and communicates only with the official API domain.
- Sensitive credentials (GitHub tokens, AI API keys, DB passwords) exist only in the backend environment.
- Input validation is strictly enforced at the API gateway layer for all extension and web app requests.

## 5. Idempotency Strategy
The system must never create duplicate GitHub commits for the same submission.
- **Unique Identifier**: Each LeetCode submission has a unique ID (if available from LeetCode) or a deterministic hash generated from the problem ID, code content, and language.
- **Database Check**: Before starting the sync workflow, the API attempts to insert a record with this unique identifier. If it exists, the process halts.
- **State Management**: Only one concurrent sync process per user/submission can run.

## 6. Future Deployment Architecture
- **Web App**: Deployed on a platform like Vercel or AWS Amplify for edge delivery.
- **API Backend**: Containerized (Docker) and deployed on a scalable platform like AWS ECS, Google Cloud Run, or Render.
- **Database**: Managed PostgreSQL or similar relational database (e.g., AWS RDS, Supabase).
- **Extension**: Published to the Chrome Web Store.
