# Video Studio

The current scene-video app opens to **Projects**. Choose **New Video**, describe an idea, review the concise storyboard, and start sequential production. Standard Video defaults to native audio, AI-assisted review and continuity from accepted ending frames. Each scene waits for your creative decision; AI findings are advisory.

Routes:

- `/` or `/videos`: saved projects with titles, thumbnails, progress and next actions.
- `/videos/new` (also `/scene-jobs/create`): simple creation; Advanced settings start collapsed.
- `/scene-jobs/:id`: storyboard, generation, scene review, continuity and final video on one page.
- `/create` and `/slideshow-jobs/:id`: retained slideshow tools under Advanced navigation.

Run the backend's `./scripts/run-standard-video.ps1` for the accepted local Flow configuration, then `npm run dev` here. Use `VITE_API_BASE_URL=http://localhost:8080` for the local API. The creation form shows the actual configured scene length; unsupported automation is reported as unavailable.

The backend now manages enabled dedicated Flow/Gemini browser startup and read-only reconnection. **Settings → Dedicated browser sessions** shows launch, connection, login and failure diagnostics. Colab remains manual. See the backend's [browser management and reference acceptance report](../ai-video-pipeline/docs/dedicated-browser-management.md) for exact launch commands and the currently blocked Tesla live test.

Opening or reloading a project reads persisted state. It does not authorize generation, acceptance, media overrides or review retries. Manual Flow import, prompts and full histories remain under **Advanced / Diagnostics**. Final videos retain playback, scene markers and a friendly **Download Video** filename using the original artifact.

Validation: `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build`, and `git diff --check`. Unit tests use mocked APIs, with no real Flow or Zen calls. Vitest uses four workers to bound local jsdom resource pressure.

Current architecture, documentation classification, and the additive typed library API are documented in [Frontend and project library contract](docs/project-library.md). The Projects page uses the read-only cursor library API with server-side search, provider/status/pause filters, sorting, and compact list/grid views. See [Projects Library V1](docs/projects-library-v1.md) for navigation behavior and verification.

R8 acceptance is recorded in the sibling backend's `docs/scene-video-revival-r8.md` (section 20). Earlier milestone notes below preserve the original checkpoint context and are not current worktree or acceptance status.

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

## Historical slideshow v1 docs index

These original scope and planning documents are retained as historical references. Current scene-video contracts are in [Frontend and project library contract](docs/project-library.md).

- [Product Scope and V1 Non-Goals](docs/product-scope.md)
- [UX Flow](docs/ux-flow.md)
- [UI Design](docs/ui-design.md)
- [Design System](docs/design-system.md)
- [API Integration](docs/api-integration.md)
- [Frontend Architecture](docs/frontend-architecture.md)
- [Local Development](docs/local-dev.md)
- [Implementation Sequence](docs/implementation-sequence.md)
- [Testing Plan](docs/testing-plan.md)


## Historical R8.2 opening image review checkpoint

Standard Video reads the backend's opt-in opening-keyframe setting. The first
scene shows Preparing opening image, then the saved image and expected entry
state with Generate Another / Use This Image. An unsuitable aspect blocks
approval. Upload Opening Image is a manual fallback through the same gate.
Provider selection and old run history stay in Advanced / Diagnostics.
Reloading resumes the stored review without submitting again. Approval does
not accept the video or start it; the separate video action uses the approved
PNG, and scene review compares Approved opening against Generated opening.
Later scenes keep the accepted R7 ending-frame handoff. At this initial checkpoint, the original R8 fresh
two-scene creative acceptance was still required; the backend R8 report records the subsequent acceptance.
# R13 Colab storyboard planning

New Video supports an opt-in Colab Qwen planner for supervised Flow. The project
page provides a complete notebook kit, manual request/result/receipt transfer,
saved scene prompt revisions and Human only review. Colab storyboard regeneration
before production keeps the same project ID and advances its planning revision.
The configured planner remains the default; Gemini Autopilot retains its own lane.

Set `COLAB_EXCHANGE_DIR` on the backend to the actual absolute Drive for Desktop
`AI_Video_Planner` folder for automatic exchange, or leave it empty and use the
manual controls. Upload the kit's complete `notebook` folder into that Drive folder,
open its notebook in Colab and run steps 1-4. Save any scene edits and inspect the
effective prompt before starting production. Each Flow clip still requires explicit
human acceptance and chained-frame confirmation. Stop the model and disconnect
the Colab runtime when the queue pass finishes.

R13 was owner-approved, accepted and closed on 2026-10-14. Real A100 Qwen
storyboard planning, manual transfer/import, scene prompt controls and restart
persistence passed through the running backend and rendered UI. Automated tests
use mocked inference and isolated data; real Drive Desktop synchronization and
fresh-VM cache restoration remain unverified. This was planning-only acceptance;
no Flow/Gemini video generation was submitted.

The operator guide and acceptance records are in the sibling backend repository
at `docs/r13-colab-qwen-planner.md` and `docs/acceptance/r13/`. Separate local
backend/frontend commits close R13. No push or R14 implementation is included.

## Reference Image V1

New Video includes an optional Gemini **Subject Reference** uploader, gated by verified browser capability. The current role is unverified, so the form explains the limitation and disables image selection while preserving text-only creation. Gemini dashboard queue creation opens the same New Video form. See [Reference Image V1](docs/reference-image-v1.md) for formats, controls, atomic persistence, retry behavior and validation limits.
