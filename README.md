# LeetHub-AI

LeetHub-AI is an intelligent platform designed to detect, analyze, and synchronize LeetCode submissions to a GitHub repository, while providing a web dashboard for tracking progress and analytics.

## Current Architecture
The project is structured as a monorepo containing:
- **Web App (`apps/web`)**: Next.js (App Router) user dashboard.
- **API Backend (`apps/api`)**: Python FastAPI orchestrator for integrations and AI logic.
- **Browser Extension (`apps/extension`)**: Chrome Manifest V3 extension to detect submissions.
- **Shared (`packages/shared`)**: Shared TypeScript code and types.

## Current Development Status
- Monorepo initialized.
- Foundational apps created (Web, API, Extension, Shared).
- API currently exposes only a `/health` endpoint.
- Web app is a minimal starter page.

## How to Start the Web App
1. Install dependencies from the root:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev:web
   ```
3. Open [http://localhost:3000](http://localhost:3000)

## How to Start the API
1. Navigate to the API directory:
   ```bash
   cd apps/api
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

## How to Load the Extension Locally
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked** and select the `apps/extension` folder in this repository.
