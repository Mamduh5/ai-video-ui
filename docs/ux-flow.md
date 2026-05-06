# UX Flow

## UX Principles

- The primary UX is a structured form, not a raw prompt box.
- The job detail page makes progress visible at all times.
- The final video becomes the hero output when ready.
- Slides are inspectable but not editable in v1.
- Debug details are available but secondary.

## Recent Jobs Page

Purpose: provide a starting point and a way to reopen recent local jobs.

V1 can support recent jobs through client-side storage because no backend list endpoint is assumed. Store recently created job IDs, titles/topics, created timestamps, and last known status in local storage after successful job creation or detail fetch.

Flow:

1. User opens `/`.
2. App reads recent job references from local storage.
3. If there are recent jobs, show a compact table or list.
4. Each row links to `/slideshow-jobs/:id` for the slideshow job detail route.
5. User can click "Create" to start a new job.
6. User can manually refresh a job row by opening the detail page.

Empty state:

- Show a direct action to create the first slideshow video.
- Avoid marketing copy.

Important constraint: all backend calls must use `/slideshow-video-jobs`. The frontend route should also use slideshow-specific naming to avoid confusion with older job concepts.

## Create New Slideshow Job

Purpose: collect the structured request needed by `POST /slideshow-video-jobs`.

Flow:

1. User opens `/create`.
2. App shows a structured form with sensible defaults.
3. User fills topic, audience, tone, language, educational level, visual style, target duration, slide count, aspect ratio, target platform, subtitles, must-include items, and must-avoid items.
4. App validates required fields and practical numeric ranges.
5. User submits.
6. App sends the request to `POST /slideshow-video-jobs`.
7. On success, app stores the returned job reference locally and navigates to the job detail page.

Do not include:

- Provider selection.
- Content mode selection.
- Model selection.
- Voice provider selection.
- Browser account controls.
- Advanced raw prompt field as the primary UX.

## Structured Form Submission

Expected form fields:

- `topic`
- `audience`
- `language`
- `tone`
- `educational_level`
- `visual_style`
- `target_duration_seconds`
- `slide_count`
- `aspect_ratio`
- `target_platform`
- `subtitles`
- `must_include`
- `must_avoid`

Submission behavior:

- Disable submit while the request is in flight.
- Preserve form values on validation errors.
- Show friendly API errors near the submit action.
- Store only non-sensitive job metadata locally.
- Do not store provider credentials or provider keys in the frontend.

## Navigate To Job Detail

After creation succeeds:

1. Read the job ID from the response.
2. Add or update the local recent jobs entry.
3. Navigate to `/slideshow-jobs/:id`.
4. Start job detail polling immediately.

If navigation succeeds but the first detail fetch fails, show the job detail failure state with retry.

## Poll Status

The job detail page polls `GET /slideshow-video-jobs/:id`.

Polling rules:

- Poll every 2 seconds while status is `queued` or `running`.
- Stop polling when status is `completed` or `failed`.
- Allow manual refresh at all times.
- Optional v1 enhancement: back off during long-running stages after several minutes.
- Do not use WebSockets in v1.

Progress visibility:

- Show status badge.
- Show current step label.
- Show timestamps when available.
- Show a progress timeline based on known step order.
- Show "waiting for artifact" states separately from failed states.

## Inspect Slides And Artifacts

The detail page should progressively unlock artifacts as they become available.

Recommended behavior:

- Fetch plan and script when job detail indicates they may be ready, or when the user opens the relevant tab.
- Fetch slide prompt text per slide when the slide grid or slide detail is visible.
- Fetch slide images as binary artifacts and render them with object URLs.
- Treat `409 Conflict` as "not ready yet", not as a fatal error.
- Treat network errors and non-409 API errors as visible artifact errors with retry.

Artifact viewer tabs:

- Slides
- Script
- Plan
- Technical

The Slides tab should be the default once slide data exists. Before then, show progress and available high-level artifacts.

## Preview Final MP4

When the video artifact is ready:

1. Fetch `GET /slideshow-video-jobs/:id/artifacts/video`.
2. Create an object URL for the returned binary blob.
3. Render it in a native `<video controls>` element.
4. Make the video preview the main visual element on the page.
5. Keep progress and artifacts available below or beside it.

If the video returns `409 Conflict`, keep showing the progress state and label the video as not ready.

## Download Final MP4

Download behavior:

- Enable the download action only when the video artifact is ready.
- Use the video artifact route as the source of the MP4.
- Prefer a generated filename based on topic and job ID, sanitized for filesystem compatibility.
- If using an object URL, revoke it when the component unmounts or when a newer blob replaces it.

The download action should be explicit and visible near the video preview.

## Failed Job Handling

When a job status is `failed`:

- Stop polling.
- Show a friendly failure message.
- Show the failed or last known step.
- Show the backend error message when available.
- Put technical details behind a secondary disclosure panel.
- Keep any successfully generated artifacts inspectable.
- Provide actions to retry status fetch, return to create page, or create a new job with the same form values if request data is available.

Do not imply that the user can fix provider selection in the frontend; provider configuration is backend-owned.

## Artifact 409 Not Ready Handling

Artifact routes may return `409 Conflict` while generation is still in progress.

UI behavior:

- Label the artifact as "Not ready yet".
- Do not show a red error state for `409`.
- Retry automatically while the job is still queued or running if the artifact is visible.
- Offer manual retry after job completion if an optional artifact remains unavailable.

## Backend Unavailable Handling

When the backend cannot be reached:

- Show a clear "Backend unavailable" message.
- Include the configured API base URL.
- Provide a retry action.
- Preserve entered form values.
- For job detail, keep the last known local job metadata visible if available.

Common causes to mention in local-dev docs:

- Backend server is not running.
- Incorrect `VITE_API_BASE_URL`.
- CORS is not configured for the frontend dev origin.
- Backend crashed during generation.

## Refresh And Reopen Behavior

Refresh behavior:

- Detail pages should be directly reloadable by job ID.
- App should fetch fresh job status after reload.
- Local recent jobs should be updated with the latest known status.
- Object URLs should be recreated after reload by refetching binary artifacts.

Reopen behavior:

- Recent job entries should navigate back to detail.
- If the backend no longer knows the job ID, show a not-found or unavailable state.
- If artifacts are no longer present, show artifact-specific unavailable states while preserving job metadata.
