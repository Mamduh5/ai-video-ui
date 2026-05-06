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

Status: F1 scaffold exists.

The React + Vite + TypeScript app shell, routing, Tailwind setup, TanStack Query provider, and basic tests are in place. Backend API calls, the create-job form, polling, artifact fetching, and final video preview are not implemented yet.

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

The app does not call the backend yet, but the environment variable is reserved for the later `/slideshow-video-jobs` integration.

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
