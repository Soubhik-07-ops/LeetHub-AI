# LeetBranch Engineering Guidelines

## Project

LeetBranch is an AI-powered developer productivity platform that synchronizes accepted LeetCode solutions with GitHub while maintaining coding activity analytics and streak tracking.

## Development Philosophy

- Build production-quality software.
- Prefer simple, maintainable architecture over unnecessary abstraction.
- Do not implement features that were not requested.
- Do not rewrite working code without a clear reason.
- Never expose secrets or credentials.
- Never hardcode API keys, tokens, passwords, JWT secrets, or database credentials.
- Use environment variables for all secrets.
- Validate external input.
- Handle API failures gracefully.
- Write code that is easy to test.
- Keep modules focused on a single responsibility.

## Frontend

- Next.js App Router.
- TypeScript.
- CSS Modules.
- Do not introduce Tailwind CSS unless explicitly requested.
- Prefer reusable components.
- Avoid unnecessary client components.
- Use server components where appropriate.
- Maintain accessible semantic HTML.
- Keep UI responsive.
- Avoid excessive animations.
- Do not make the UI look like an AI-generated template.

## Backend

- Python.
- FastAPI.
- Pydantic models for request/response validation.
- Async I/O where appropriate.
- Clear separation between API, services, integrations, and data access.
- Never place business logic directly inside route handlers.
- External integrations must be isolated behind service/adapter interfaces.

## Browser Extension

- Chrome Extension Manifest V3.
- TypeScript.
- Keep extension permissions minimal.
- Never store sensitive credentials directly in content scripts.
- Communication with the backend must use authenticated requests.
- Do not depend on brittle DOM selectors when a more reliable mechanism exists.
- Treat LeetCode integration as an adapter so the rest of the system remains independent from LeetCode implementation details.

## GitHub Integration

- Use GitHub's official APIs.
- Never expose GitHub tokens to the browser page.
- GitHub credentials must remain server-side.
- Implement idempotency so the same LeetCode submission cannot create duplicate commits.

## AI

- AI providers must be abstracted behind an internal service interface.
- Do not couple business logic directly to a specific AI provider.
- AI-generated explanations must never silently modify the user's original solution.
- Store AI processing status and errors.
- AI failures must not corrupt the original submission.

## Database

- PostgreSQL/Supabase.
- Use migrations for schema changes.
- Never modify production data structures manually without documenting the migration.
- Store external IDs for idempotency and synchronization.

## Security

- Secrets belong only in environment variables.
- Never commit .env files.
- Validate all external input.
- Apply least-privilege permissions.
- Do not log authentication tokens or sensitive credentials.
- Sanitize data displayed in the frontend.

## Git

Use conventional commit messages:

feat:
fix:
refactor:
docs:
test:
chore:
security:

Keep commits focused and atomic.

## Important

Before implementing a feature:

1. Inspect the existing project structure.
2. Understand existing code.
3. Identify affected modules.
4. Implement the smallest clean solution.
5. Run relevant tests/type checks/linting.
6. Report exactly what changed.
7. Report any remaining issues.

Do not claim something works unless it was actually tested.