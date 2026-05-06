# Local Development

## Prerequisites

The backend must be running before the frontend can create or inspect slideshow video jobs.

Expected backend base URL:

```text
http://localhost:8080
```

Frontend v1 must call the `/slideshow-video-jobs` API family only.

## Frontend Environment

Create `.env.local` during app implementation:

```text
VITE_API_BASE_URL=http://localhost:8080
```

Do not put provider API keys in frontend env files. Provider configuration is backend-owned.

## Local Dev Commands

Commands will be finalized after app scaffolding. Expected placeholders:

```text
npm install
npm run dev
npm run build
npm run test
```

Do not run these until package scaffolding exists.

## Backend CORS Assumption

The backend must allow requests from the Vite dev server origin, commonly:

```text
http://localhost:5173
```

If the browser shows a CORS error:

- Confirm the backend is running.
- Confirm `VITE_API_BASE_URL` points to the backend.
- Confirm the backend allows the frontend origin.
- Confirm the request path starts with `/slideshow-video-jobs`.

## Test Job Payload

Use this payload for manual local validation once the app exists:

```json
{
  "topic": "How photosynthesis works",
  "audience": "middle school students",
  "tone": "clear and friendly",
  "language": "en",
  "visual_style": "clean colorful educational illustration",
  "target_duration_seconds": 90,
  "slide_count": 8,
  "aspect_ratio": "9:16",
  "target_platform": "shorts",
  "subtitles": true,
  "must_include": ["sunlight", "leaves", "water"],
  "must_avoid": ["dense text", "watermarks"]
}
```

If the create form includes `educational_level`, confirm final backend behavior before sending it directly. It may need to be omitted or combined with `audience`.

## Common Issues

## Backend Unavailable

Symptoms:

- Create request fails immediately.
- Job detail cannot load.
- Browser shows network error.

Checks:

- Backend process is running.
- `VITE_API_BASE_URL` is correct.
- Backend port is not blocked or changed.
- Browser devtools network tab shows the expected URL.

## Artifact 409

Symptoms:

- An artifact route returns `409 Conflict`.
- Slide image, script, plan, or final video is not visible yet.

Expected behavior:

- This usually means the artifact is not ready.
- The frontend should show "Not ready yet".
- This should not be treated as a failed job.
- Polling should continue while the job is queued or running.

## Render Failure

Symptoms:

- Job status becomes `failed`.
- Video artifact never becomes ready.
- Backend error references rendering.

Checks:

- Inspect failed step and backend technical details.
- Confirm source artifacts were generated.
- Confirm backend render path and file permissions.

## FFmpeg Missing On Backend

Symptoms:

- Backend job fails during video rendering.
- Error mentions FFmpeg, executable not found, or render command failure.

Resolution:

- Install or configure FFmpeg in the backend runtime.
- Restart backend after changing PATH or environment.

## Fake Media Quality Limitation

Symptoms:

- Slide images look static, placeholder-like, or low quality.
- Voice artifact is absent or synthetic placeholder quality.

Expected behavior:

- The first backend path includes fake/static local-dev generation.
- Real image provider integration is not assumed yet.
- Real TTS provider integration is not assumed yet.
- Frontend should not expose controls to select unavailable providers.

## Wrong API Family

Symptoms:

- Requests return 404 even though backend is running.
- Network tab shows paths outside the slideshow job family.

Resolution:

- Ensure frontend calls use `/slideshow-video-jobs`.
- Do not call legacy or experimental job APIs in v1.

