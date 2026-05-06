# V1 Non-Goals

Frontend v1 is intentionally narrow. The goal is to create, poll, inspect, preview, and download slideshow videos through the `/slideshow-video-jobs` backend surface.

The following are explicitly deferred:

- Full editor.
- Script editor.
- Prompt editor.
- Per-slide regeneration.
- Per-slide editing.
- Provider selection UI.
- Content mode selector.
- Model selection.
- Voice provider selection.
- Browser-provider controls.
- Browser account controls.
- Auth.
- Team management.
- Workspace management.
- Upload-to-TikTok.
- Upload to social platforms.
- Publishing automation.
- Timeline editor.
- True video clips.
- Scene-video jobs.
- Legacy job flows.
- Billing or credits display.
- Multi-project dashboard.
- Public SaaS onboarding.
- Realtime collaboration.
- WebSocket progress.

## Why These Are Deferred

V1 should validate the first API-visible slideshow job workflow before adding editing, publishing, provider controls, or account complexity. The backend does not yet expose real image provider or real TTS provider selection through the public v1 API, so the frontend should not imply those controls exist.

## What V1 Does Instead

V1 focuses on:

- Structured slideshow job creation.
- Polling job status.
- Clear current-step progress.
- Artifact inspection.
- Final MP4 preview.
- Final MP4 download.
- Friendly failed-job handling.
- Secondary technical details for debugging.

