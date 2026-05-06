# Ai Video Pipeline Frontend

This repository is the planned frontend for the Ai Video Pipeline slideshow video product path. It is intentionally starting as a docs-first frontend repository so the product scope, UX, API contracts, architecture, and test strategy are clear before React application code is scaffolded.

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

Status: docs-first planning. App implementation has not started.

No production app code, components, package installation, backend calls, or app scaffold are included yet.

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

