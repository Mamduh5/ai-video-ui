# Ai Video Pipeline Frontend

This repository is the planned frontend for the Ai Video Pipeline slideshow video product path. It started as a docs-first frontend repository so the product scope, UX, API contracts, architecture, and test strategy were clear before React application code was scaffolded.

## Target Backend API

Frontend v1 targets only the slideshow video job API family:

- `POST /slideshow-video-jobs`
- `GET /slideshow-video-jobs/:id`
- `GET /slideshow-video-jobs/:id/artifacts/*`

The v1 frontend must not depend on legacy `/jobs` routes or experimental `/scene-video-jobs` routes.

## Planned Stack

Use this stack unless implementation discovers a strong reason to change:

- React
- Vite
- TypeScript
- TanStack Query
- React Router
- Tailwind CSS

## Current Status

Status: F6/F7 artifact viewers and final video preview exist.

The React + Vite + TypeScript app shell, routing, Tailwind setup, TanStack Query provider, and basic tests are in place. Typed `/slideshow-video-jobs` API contracts, artifact URL helpers, an API client wrapper, and mocked unit tests also exist.

The create page now includes a structured slideshow job form. When the backend API is running, a valid submit calls `POST /slideshow-video-jobs` and navigates to `/slideshow-jobs/:jobId` after creation.

The job detail page now fetches `GET /slideshow-video-jobs/:id`, polls while jobs are queued or running, stops polling on completed or failed jobs, and shows status, progress, request summary, slide summaries, artifact readiness, and failure details. It can also fetch read-only slideshow artifacts: brief, plan, script, slide prompts, slide images, voice, render manifest, and final MP4.

The final video panel previews the rendered MP4 and exposes a download link when the completed job has a video artifact. Editing, per-slide regeneration, publishing, and provider controls remain deferred. Real media quality still depends on backend provider integration.

The recent jobs page is still placeholder-level because no backend list endpoint is assumed.

## Local Development

Install dependencies:

```bash
npm install
```

Copy the example environment file:

```bash
cp .env.example .env.local
```

Expected local backend config:

```text
VITE_API_BASE_URL=http://localhost:8080
```

Run the dev server:

```bash
npm run dev
```

Run validation:

```bash
npm run typecheck
npm run test:run
npm run build
```

The create form uses this environment variable when submitting to `/slideshow-video-jobs`. Tests mock the API and do not require a running backend.

## V1 Goal

Frontend v1 should let an internal or solo operator create, poll, inspect, preview, and download slideshow videos:

- Submit a structured slideshow job request.
- Poll job status and show the current step.
- Show generated plan and script when available.
- Show per-slide titles, captions, prompts, and images when available.
- Show the final rendered MP4 when ready.
- Download the final MP4.
- Display friendly failures with optional technical details.

Real image and TTS quality depends on later backend provider integration. The first backend path includes fake/static local-dev generation and real FFmpeg slideshow rendering, but no real image provider and no real TTS provider are assumed by this frontend.

## Docs Index

- [Product Scope](docs/product-scope.md)
- [UX Flow](docs/ux-flow.md)
- [UI Design](docs/ui-design.md)
- [Design System](docs/design-system.md)
- [API Integration](docs/api-integration.md)
- [Frontend Architecture](docs/frontend-architecture.md)
- [Local Development](docs/local-dev.md)
- [V1 Non-Goals](docs/v1-non-goals.md)
- [Implementation Sequence](docs/implementation-sequence.md)
- [Testing Plan](docs/testing-plan.md)
