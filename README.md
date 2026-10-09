# Video Studio

The current scene-video app opens to **Projects**. Choose **New Video**, describe an idea, review the concise storyboard, and start sequential production. Standard Video defaults to native audio, AI-assisted review and continuity from accepted ending frames. Each scene waits for your creative decision; AI findings are advisory.

Routes:

- `/` or `/videos`: saved projects with titles, thumbnails, progress and next actions.
- `/videos/new` (also `/scene-jobs/create`): simple creation; Advanced settings start collapsed.
- `/scene-jobs/:id`: storyboard, generation, scene review, continuity and final video on one page.
- `/create` and `/slideshow-jobs/:id`: retained slideshow tools under Advanced navigation.

Run the backend's `./scripts/run-standard-video.ps1` for the accepted local Flow configuration, then `npm run dev` here. Use `VITE_API_BASE_URL=http://localhost:8080` for the local API. The creation form shows the actual configured scene length; unsupported automation is reported as unavailable.

Opening or reloading a project reads persisted state. It does not authorize generation, acceptance, media overrides or review retries. Manual Flow import, prompts and full histories remain under **Advanced / Diagnostics**. Final videos retain playback, scene markers and a friendly **Download Video** filename using the original artifact.

Validation: `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build`, and `git diff --check`. Unit tests use mocked APIs, with no real Flow or Zen calls. Vitest uses four workers to bound local jsdom resource pressure.

R8 is uncommitted and awaiting completion of the fresh real acceptance. See the backend's `docs/scene-video-revival-r8.md` for checkpoint, audit and live evidence.

---

## Historical slideshow v1 scope

The following documents the original slideshow scope and implementation history. Its placeholder landing-page and slideshow-only statements predate the current scene-video product.
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


## R8.2 opening image review (uncommitted)

Standard Video reads the backend's opt-in opening-keyframe setting. The first
scene shows Preparing opening image, then the saved image and expected entry
state with Generate Another / Use This Image. An unsuitable aspect blocks
approval. Upload Opening Image is a manual fallback through the same gate.
Provider selection and old run history stay in Advanced / Diagnostics.
Reloading resumes the stored review without submitting again. Approval does
not accept the video or start it; the separate video action uses the approved
PNG, and scene review compares Approved opening against Generated opening.
Later scenes keep the accepted R7 ending-frame handoff. The original R8 fresh
two-scene creative acceptance is still required before this milestone is accepted.
