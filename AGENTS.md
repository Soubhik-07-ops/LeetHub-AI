# LeetHub-AI Engineering Rules

## 1. Architectural Principles
- **LeetCode Adapter Boundary**: LeetCode integration must be strictly isolated behind an adapter/service boundary. Core application logic must not depend directly on LeetCode's DOM structure or internal API responses.
- **GitHub Integration Boundary**: GitHub integration must remain strictly server-side (`apps/api`). GitHub credentials must never be exposed to the browser extension or frontend web app.
- **AI Service Boundary**: The AI provider must be abstracted behind an internal service interface in the API so that the provider (OpenRouter, Gemini, OpenAI) can be easily swapped.
- **Idempotency**: The system must be designed with idempotency from the beginning. The same LeetCode submission must never create duplicate GitHub commits.

## 2. Technology Stack & Rules
- **Web App (`apps/web`)**: Next.js, App Router, TypeScript, CSS Modules. **Do NOT use Tailwind CSS.** Do NOT use styled-components.
- **Python API (`apps/api`)**: FastAPI backend. All environment configuration via environment variables. Do not hardcode secrets.
- **Browser Extension (`apps/extension`)**: Manifest V3, TypeScript. Use the minimum permissions necessary.

## 3. General Development Guidelines
- Prioritize creating small, working vertical slices before adding advanced features.
- Never commit real API keys, GitHub tokens, database credentials, or JWT secrets. Use `.env.example` for placeholders.
