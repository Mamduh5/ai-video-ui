# Video Studio Frontend

The current scene-video app opens to **Projects**. Choose **New Video**, describe an idea, review the concise storyboard, and start sequential production. Standard Video defaults to native audio, AI-assisted review and continuity from accepted ending frames. Each scene waits for your creative decision; AI findings are advisory.

## R16 aspect ratios

New Video supports **9:16 — Portrait** and **16:9 — Landscape** in Gemini Autopilot, Flow supervised and Flow Autopilot. Fresh defaults are portrait; existing persisted application defaults need the backend's explicit one-time R16 CAS migration. Settings → Video Defaults saves either ratio for each provider; both Flow workflows share the same Flow default. Workflow switches apply provider defaults until an aspect is deliberately chosen, then keep that choice. The Gemini dashboard's + Queue Video opens this same form. The effective ratio is visible before creation, independently of Flow resolution.

The frontend uses backend Gemini capability options and blocks unsupported selections. R16 changes do not resume a queue or authorize generation. Native Gemini selection is fixture verified; live control selection and portrait generation acceptance remain pending. See the backend `docs/r16-aspect-ratios.md` for safe runtime activation and persisted-default migration.

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

## Recover an existing Gemini video

Open the affected project in Video Studio. You can also follow **Recover Existing Video** on its Gemini Autopilot status card. Each recovery card identifies the saved scene, original request time, aspect ratio and saved prompt; you never need a run UUID.

1. Choose **Recover Existing Video**. Studio inspects/downloads that original result in the dedicated authenticated Gemini browser. Keep its original conversation open. Sign-in and security checks are completed manually in Gemini.
2. If the download fails, choose **Upload Existing MP4**. Open the original request in Gemini and download its video with Gemini's normal Download control.
3. Select that MP4 using **Original Gemini MP4** in Video Studio. Review the playable preview, the project/scene, the original request time and prompt. Check the explicit original-association confirmation.
4. Choose **Validate and import original MP4**. Studio checks MP4 integrity, decodes the complete file and requires R3 PASS for the saved aspect, duration and audio policy before attaching it to the original scene. Uploads are limited to 100 MiB.
5. **Recovery completed** means the clip is restored. Existing completion/assembly can finish. Production stays paused; recovery does not authorize another generation.

Recovery status survives page refresh and API restart. After an interrupted attempt, retry the same control; an already imported matching clip is reused. Selecting a different file requires a fresh preview and confirmation. An unrelated existing scene clip, changed saved target, missing attribution or failed validation is rejected. If automatic correlation cannot be verified, use the explicitly owner-confirmed upload fallback. Its provenance says **owner_attributed_original**, not provider-verified attribution.

States distinguish an evidenced existing result ready to download, downloading, failed download/manual fallback, waiting for owner MP4, validation, completion, original result unavailable and blocked attribution/validation. A result with no supporting evidence is shown as **Check original result**. Login/security challenges remain manual. An active operation or a different run's browser reservation must finish or be recovered first; recovery never releases that other reservation.

Neither recovery route calls Generate, Submit or Force Retry, changes generation accounting, rewrites the original run, resumes a queue or clears an unrelated hold. Native Subject Reference and Starting Image remain separate, capability-gated roles.

Implementation and acceptance evidence: [R16.2 recovery report](../ai-video-pipeline/docs/r162-self-service-gemini-recovery.md).
