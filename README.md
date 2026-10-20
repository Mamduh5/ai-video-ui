# Video Studio Frontend

The current scene-video app opens to **Projects**. Choose **New Video**, describe an idea, review the concise storyboard, and start sequential production. Standard Video defaults to native audio, AI-assisted review and continuity from accepted ending frames. Each scene waits for your creative decision; AI findings are advisory.

## Routes

- `/` or `/videos`: saved projects with titles, thumbnails, progress and next actions.
- `/videos/new` (also `/scene-jobs/create`): simple creation; Advanced settings start collapsed.
- `/scene-jobs/:id`: storyboard, generation, scene review, continuity and final video on one page.
- `/gemini-autopilot`: dedicated Gemini Autopilot queue, availability checks, recovery and hold monitoring.
- `/flow-autopilot`: dedicated Flow Autopilot queue, batch credit authorization and FIFO execution.
- `/settings`: global settings for scene limits, Gemini submission caps, storage safety floors and browser sessions.
- `/create` and `/slideshow-jobs/:id`: retained slideshow tools under Advanced navigation.

## Startup & Backend Connection

Run the backend via `.\scripts\start-video-studio.ps1 -Build` (or `./scripts/run-standard-video.ps1`), then `npm run dev` in this directory.

Expected local backend config in `.env.local`:
```text
VITE_API_BASE_URL=http://localhost:8080
```

The backend automatically manages dedicated Flow and Gemini browser sessions on startup when enabled. **Settings → Dedicated browser sessions** shows launch, connection, login and diagnostic states.

> [!IMPORTANT]
> **Primary Operator Guide:** For complete operational instructions, verified Windows startup commands, recovery workflows, and production provider policies, refer to the primary backend operator guide:
> [`../ai-video-pipeline/Readme.md`](../ai-video-pipeline/Readme.md)

## Validation

Run local checks:
```bash
npm run typecheck
npm run lint
npm run test:run -- --maxWorkers=2
npm run build
```

Unit tests use mocked APIs with no real Flow or Gemini browser calls. Vitest uses bounded workers to manage local jsdom resource pressure.

---

## Colab Qwen Storyboard Planning (R15 / R15.1)

Flow storyboard planning uses local Qwen3.5 running in Google Colab Pro, synchronized via Google Drive for Desktop. Under R15.1, storyboard exchange is automatic:

1. Run **Start Flow Planner** once in the Colab notebook (`AI_Video_Planner.ipynb`).
2. Create a project in Video Studio with **Colab Qwen** as Storyboard Planner and **Dense Performance** as production mode.
3. Requests and validated storyboards transfer automatically through the configured Drive folder without manual UUID entry or JSON transfer.
4. Review the automatically imported storyboard in Video Studio, then deliberately authorize production.

See the complete operator instructions in [R15 One-Action Planner Guide](../ai-video-pipeline/docs/r15-colab-flow-one-action-planner.md) and the [R15.1 Acceptance Record](../ai-video-pipeline/docs/acceptance/r15/r15.1-repair-2026-10-20.md).

## Reference Image V1

New Video includes an optional **Subject Reference** uploader:
- **Flow Ingredients:** Supported with Veo 3.1 Fast / Lite at 8 seconds, 720p, 16:9, independent continuity. Subject identity is best-effort.
- **Gemini Subject Reference:** Gated and production-disabled because native Gemini Web role compatibility remains unverified. The uploader explains the limitation and disables image selection.

See [Reference Image V1 Guide](../ai-video-pipeline/docs/reference-image-v1.md) for details.

---

## Historical Documentation

The following documents preserve historical frontend scope and architecture:
- [Frontend and Project Library Contract](docs/project-library.md)
- [Projects Library V1 Report](docs/projects-library-v1.md)
- [Historical Slideshow V1 Scope](docs/product-scope.md)
