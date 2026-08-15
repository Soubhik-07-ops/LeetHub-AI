# LeetBranch Development Roadmap

This roadmap outlines the incremental phases of development for LeetBranch, prioritizing the smallest working vertical slice first and progressively adding complexity.

## Phase 1: Core Vertical Slice (MVP)
**Goal:** Establish the foundational pipeline: LeetCode → Extension → API → GitHub.

1. **Monorepo Setup**: Initialize the monorepo structure with `apps/web`, `apps/api`, `apps/extension`, and `packages/shared`.
2. **API Foundation**: Set up FastAPI, database connection, and basic structure.
3. **GitHub Integration (Backend)**: Implement the service to authenticate with GitHub and create commits on a user's behalf.
4. **Extension Basics**: Create the Manifest V3 extension to detect an accepted submission and extract basic code/metadata.
5. **API Endpoint & Idempotency**: Create an endpoint to receive submissions from the extension, implement deduplication logic, and trigger the GitHub sync.
6. **End-to-End Test**: Verify a manual submission on LeetCode appears in the designated GitHub repository.

## Phase 2: AI Processing & Code Organization
**Goal:** Enhance the synchronized repository with AI insights and better file structure.

1. **AI Service Abstraction**: Define the AI provider interface in the backend.
2. **AI Provider Implementation**: Integrate an initial AI provider (e.g., Gemini or OpenRouter) to analyze time/space complexity and generate a README for the solution.
3. **Repository Organization**: Update the GitHub service to organize commits into structured folders (e.g., by difficulty or topic).
4. **Update Sync Workflow**: Integrate the AI analysis step into the submission pipeline before the GitHub commit.

## Phase 3: Dashboard & Authentication
**Goal:** Provide a user interface to view sync history and manage settings.

1. **Authentication System**: Implement user login (e.g., OAuth via GitHub) in the backend and web frontend.
2. **Web Dashboard Base**: Set up Next.js app with CSS Modules and define the core layout.
3. **Sync History View**: Create API endpoints to fetch past submissions and display them on the web dashboard.
4. **Extension Authentication**: Allow the user to log into the extension using their web dashboard session.

## Phase 4: Gamification & Analytics
**Goal:** Motivate users by tracking streaks and analyzing their progress.

1. **Streak Tracking Engine**: Implement backend logic to calculate and maintain daily coding streaks.
2. **Analytics Service**: Aggregate user data to show language preferences, difficulty breakdown, and activity heatmaps.
3. **Dashboard Enhancements**: Add streak counters, heatmaps, and charts to the user dashboard.

## Phase 5: Advanced Features & Hardening
**Goal:** Add intelligent recommendations, notifications, and prepare for production.

1. **AI Recommendations**: Use the AI service to suggest similar problems or optimizations based on user history.
2. **Notification System**: Implement real-time or email notifications for broken streaks or successful syncs.
3. **Production Hardening**:
   - Comprehensive error handling and retry mechanisms.
   - Rate limiting and security audits.
   - CI/CD pipeline setup for automated testing and deployment.
   - Extension publishing preparation.
