# Product Scope

## Product Name Recommendation

Recommended product label: **Explainer Slideshow Studio**.

This name is more precise than "Presentation Video Studio" for v1 because the first product path is focused on educational, explanatory, short-form slideshow videos rather than full slide-deck authoring or business presentation workflows. It still leaves room for presentation-style content later.

## Target User

The first target user is a solo or internal operator who wants to generate slideshow-based explainer videos from structured inputs, inspect the generated artifacts, and download the final MP4.

The first version is not optimized for a public multi-user SaaS workflow. It should prioritize operational clarity, fast validation of backend behavior, and easy debugging over marketing polish or account-based collaboration.

## V1 Goal

Create a frontend that can:

- Submit structured slideshow video jobs to `POST /slideshow-video-jobs`.
- Poll `GET /slideshow-video-jobs/:id` until completion or failure.
- Show the active generation step.
- Display plan, script, slide prompts, slide images, voice artifact availability, render manifest, and final video when ready.
- Preview and download the final MP4.
- Present friendly errors with optional technical detail.

## V1 User Outcomes

By the end of v1, an operator should be able to:

- Describe an educational or explainer topic through a structured form.
- Select practical output constraints such as duration, slide count, aspect ratio, target platform, language, and subtitles.
- Understand whether the backend is queued, running, completed, or failed.
- See which stage the job is currently in.
- Inspect generated creative artifacts without needing local filesystem access.
- Confirm the final video renders and plays in the browser.
- Download the final MP4 for manual review or publishing outside the app.

## What "Slideshow Video" Means

For v1, a slideshow video is an MP4 rendered from a generated presentation-like sequence:

- A topic brief or interpretation of the requested subject.
- A slide plan that breaks the topic into ordered visual beats.
- A script or narration text.
- Per-slide title and caption content.
- Per-slide image prompts.
- Per-slide images from the backend's current generation path.
- Optional voice artifact when the backend provides one.
- A render manifest describing the assembled media.
- A final FFmpeg-rendered MP4.

The product is closer to "structured explainer video generation" than to freeform video editing.

## What This Product Is Not

V1 is not:

- A full timeline editor.
- A slide deck editor.
- A script editor.
- A prompt engineering workbench.
- A provider control panel.
- A publishing automation tool.
- A social media account manager.
- A multi-user workspace.
- A frontend for legacy character/topic jobs.
- A frontend for experimental scene video jobs.

## Backend Assumptions

The frontend assumes:

- The backend exposes the first API-visible `/slideshow-video-jobs` family.
- Job creation accepts a structured JSON request.
- Job detail returns stable identifiers, status, current step, timestamps, request fields, and error information when failed.
- Artifacts are fetched through dedicated artifact routes.
- Some artifacts may return `409 Conflict` while they are not ready.
- Local development can produce fake/static media.
- Final slideshow video rendering uses the backend's FFmpeg path.
- Real image provider integration is not available yet.
- Real TTS provider integration is not available yet.
- Provider selection is not part of the public API and should not appear in v1 UI.

## Success Criteria

V1 is successful when:

- A user can create a valid slideshow job without typing raw JSON.
- Job progress is understandable without reading logs.
- Artifact readiness is visible.
- Plan and script are readable when available.
- Slides are inspectable as ordered visual units.
- The final MP4 is clearly presented as the primary output.
- Download works when the video artifact is ready.
- Failures show the failed step, a friendly message, and optional technical details.
- The frontend does not depend on non-v1 API families.

## Deferred Scope

Deferred until later:

- Editing generated scripts, prompts, or slides.
- Regenerating individual slides.
- Selecting providers, models, content modes, or browser accounts.
- Real image/TTS quality controls.
- Auth, teams, workspaces, roles, and permissions.
- Billing or credits display.
- Uploading or publishing to TikTok or other platforms.
- Managing large multi-project dashboards.
- True video clip generation beyond slideshow assembly.

