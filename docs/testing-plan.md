# Testing Plan

## Goals

The test strategy should verify the frontend workflow without requiring a real backend in automated unit tests.

Core behaviors to protect:

- Structured form submission.
- Correct `/slideshow-video-jobs` API calls.
- Polling while jobs are active.
- Stop polling when jobs are terminal.
- Artifact `409 Conflict` handling.
- Blob/object URL cleanup.
- Friendly failure and backend unavailable states.
- No v1 provider selection or content mode controls.

## Unit Tests

Recommended coverage:

- API URL construction.
- JSON response parsing.
- API error normalization.
- `409 Conflict` to artifact-not-ready mapping.
- Step-to-label mapping.
- Status helper functions.
- Filename sanitization for MP4 download.
- Date and duration formatting.

Automated unit tests should mock `fetch` and should not require a running backend.

## Component Tests

Recommended coverage:

- Recent jobs empty state.
- Recent jobs populated state from mocked local storage.
- Create form default values.
- Create form validation errors.
- Submit loading state.
- Job detail queued state.
- Job detail running state.
- Job detail completed state with video panel.
- Job detail failed state with technical details collapsed by default.
- Artifact panel ready, loading, not-ready, and error states.

Component tests should use mocked query data or a mocked API layer.

## API Client Tests With Mocked Backend

Test the API client with mocked `fetch` responses:

- `POST /slideshow-video-jobs` sends the expected JSON body.
- `GET /slideshow-video-jobs/:id` parses job detail.
- Text/JSON artifact routes parse correctly.
- Binary artifact routes return `Blob`.
- `400`, `404`, `409`, `500`, and network errors produce expected typed errors.
- Configured `VITE_API_BASE_URL` is used.

Do not call the real backend in automated unit tests.

## Create Form Validation Tests

Validate:

- Topic is required.
- Duration must be a positive number within accepted v1 range.
- Slide count must be a positive integer within accepted v1 range.
- Aspect ratio must be one of supported options.
- Target platform must be one of supported options.
- Must-include and must-avoid token parsing trims empty values.
- `educational_level` does not get silently sent if backend contract does not support it.

Also verify the form does not render:

- Provider selection.
- Content mode selection.
- Model selection.
- Voice provider selection.
- Advanced raw prompt field as the primary UX.

## Polling Behavior Tests

Use fake timers with TanStack Query test utilities.

Validate:

- Polls every 2 seconds while status is `queued`.
- Polls every 2 seconds while status is `running`.
- Stops polling when status becomes `completed`.
- Stops polling when status becomes `failed`.
- Manual refresh works after polling stops.
- Unknown status does not create infinite aggressive polling.

Optional later:

- Backoff behavior for long-running stages.

## Artifact Object URL Cleanup Tests

Mock `URL.createObjectURL` and `URL.revokeObjectURL`.

Validate:

- A URL is created when a blob is available.
- Previous URL is revoked when blob changes.
- URL is revoked on component unmount.
- No object URL is created for `not_ready` or error artifact states.
- Video and image panels both use cleanup behavior.

## Error State Tests

Validate:

- Backend unavailable shows configured API base URL and retry action.
- Job failure shows status, failed step, friendly message, and collapsed technical details.
- Artifact `409` shows "Not ready yet" with non-error styling.
- Non-409 artifact failure shows retry action.
- Missing job shows not-found or unavailable state.
- Failed jobs preserve any available artifacts.

## Optional Playwright Later

Playwright is optional after the app exists and the core unit/component tests are in place.

Useful browser tests:

- Create form happy path with mocked network.
- Job detail progress transition from queued to running to completed.
- Final video panel appears when video blob is available.
- Download link is enabled only when video is ready.
- Backend unavailable state appears on network failure.

Prefer mocked network for CI. A separate manual or smoke suite can target a real local backend when needed.

## Manual Local Validation

Once implementation begins, manually validate against the local backend:

1. Start backend on `http://localhost:8080`.
2. Start frontend dev server.
3. Submit the documented photosynthesis payload.
4. Confirm job detail polling starts.
5. Confirm current step changes.
6. Confirm artifacts appear progressively.
7. Confirm final MP4 previews.
8. Confirm MP4 download works.
9. Confirm `409` artifact states are nonfatal during generation.
10. Stop backend and confirm unavailable state is friendly.

Manual validation can depend on the backend. Automated unit tests should not.

## Test Data

Use stable fixture data for:

- Queued job.
- Running job at each known step.
- Completed job with all artifacts.
- Failed job with structured error.
- Artifact not ready response.
- Backend unavailable network error.
- Slide plan with multiple slides.
- Binary image and video blob placeholders.

Fixture data should target the slideshow API family only.

