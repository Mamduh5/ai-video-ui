# API Integration

## Environment

Frontend local development should use:

```text
VITE_API_BASE_URL=http://localhost:8080
```

The frontend should read this value through Vite environment config and centralize API URL construction in `src/lib/apiClient.ts`.

## Endpoint List

V1 targets only:

```text
POST /slideshow-video-jobs
GET /slideshow-video-jobs/:id
GET /slideshow-video-jobs/:id/artifacts/brief
GET /slideshow-video-jobs/:id/artifacts/plan
GET /slideshow-video-jobs/:id/artifacts/script
GET /slideshow-video-jobs/:id/artifacts/slide/:order/image
GET /slideshow-video-jobs/:id/artifacts/slide/:order/prompt
GET /slideshow-video-jobs/:id/artifacts/voice
GET /slideshow-video-jobs/:id/artifacts/render-manifest
GET /slideshow-video-jobs/:id/artifacts/video
```

Do not call legacy job APIs or experimental scene video APIs in v1.

## Request Schema

Example create request:

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

The create form may include `educational_level` for frontend UX. If the backend create schema does not accept it yet, map it into `audience` or omit it at submit time based on the final backend contract. Do not invent backend fields silently; keep this mapping explicit in `api.ts`.

## TypeScript Types

Recommended frontend contract types:

```ts
export type SlideshowJobStatus = "queued" | "running" | "completed" | "failed";

export type SlideshowJobStep =
  | "brief"
  | "plan"
  | "script"
  | "slide_prompts"
  | "slide_images"
  | "voice"
  | "render_manifest"
  | "video"
  | "complete";

export type AspectRatio = "9:16" | "16:9" | "1:1";

export type TargetPlatform = "shorts" | "reels" | "tiktok" | "youtube" | "presentation";

export interface CreateSlideshowJobFormValues {
  topic: string;
  audience: string;
  language: string;
  tone: string;
  educational_level?: string;
  visual_style: string;
  target_duration_seconds: number;
  slide_count: number;
  aspect_ratio: AspectRatio;
  target_platform: TargetPlatform;
  subtitles: boolean;
  must_include: string[];
  must_avoid: string[];
}

export interface CreateSlideshowJobRequest {
  topic: string;
  audience: string;
  tone: string;
  language: string;
  visual_style: string;
  target_duration_seconds: number;
  slide_count: number;
  aspect_ratio: AspectRatio;
  target_platform: TargetPlatform;
  subtitles: boolean;
  must_include: string[];
  must_avoid: string[];
}

export interface CreateSlideshowJobResponse {
  id: string;
  status: SlideshowJobStatus;
  current_step?: SlideshowJobStep | string | null;
  created_at?: string;
}

export interface SlideshowJob {
  id: string;
  status: SlideshowJobStatus;
  current_step?: SlideshowJobStep | string | null;
  topic?: string;
  audience?: string;
  tone?: string;
  language?: string;
  visual_style?: string;
  target_duration_seconds?: number;
  slide_count?: number;
  aspect_ratio?: string;
  target_platform?: string;
  subtitles?: boolean;
  created_at?: string;
  started_at?: string | null;
  updated_at?: string;
  completed_at?: string | null;
  failed_at?: string | null;
  error?: SlideshowJobError | null;
  artifacts?: SlideshowArtifactAvailability;
}

export interface SlideshowJobError {
  message: string;
  code?: string;
  step?: string;
  details?: unknown;
}

export interface SlideshowArtifactAvailability {
  brief?: boolean;
  plan?: boolean;
  script?: boolean;
  slide_prompts?: boolean;
  slide_images?: boolean;
  voice?: boolean;
  render_manifest?: boolean;
  video?: boolean;
}

export interface SlidePlanItem {
  order: number;
  title?: string;
  caption?: string;
  narration?: string;
  image_prompt?: string;
}
```

These types should be adjusted to the exact backend response once confirmed. Prefer additive optional fields over brittle assumptions during the first integration pass.

## Status And Current Step Values

Expected statuses:

- `queued`: accepted but not actively generating.
- `running`: generation is in progress.
- `completed`: final state, expected video artifact should be available.
- `failed`: final state, error details should be shown.

Expected current step values:

- `brief`
- `plan`
- `script`
- `slide_prompts`
- `slide_images`
- `voice`
- `render_manifest`
- `video`
- `complete`

The UI must tolerate unknown `current_step` values by displaying a humanized fallback.

## Step-To-Label Mapping

```ts
export const STEP_LABELS: Record<string, string> = {
  brief: "Creating brief",
  plan: "Planning slides",
  script: "Writing script",
  slide_prompts: "Writing slide prompts",
  slide_images: "Generating slide images",
  voice: "Preparing voice",
  render_manifest: "Preparing render manifest",
  video: "Rendering video",
  complete: "Complete",
};
```

Progress ordering:

```ts
export const STEP_ORDER = [
  "brief",
  "plan",
  "script",
  "slide_prompts",
  "slide_images",
  "voice",
  "render_manifest",
  "video",
  "complete",
] as const;
```

## Polling Behavior

Use TanStack Query for job detail polling:

- Poll every 2 seconds while status is `queued` or `running`.
- Stop polling when status is `completed` or `failed`.
- Manual refresh is always available.
- Optional backoff can be added for long stages after the base v1 behavior works.
- Do not use WebSockets in v1.

Implementation shape:

```ts
useQuery({
  queryKey: ["slideshowJob", jobId],
  queryFn: () => getSlideshowJob(jobId),
  refetchInterval: (query) => {
    const status = query.state.data?.status;
    return status === "queued" || status === "running" ? 2000 : false;
  },
});
```

## Artifact Fetching Behavior

Artifact fetches should be separate from job detail fetches.

Recommended query keys:

- `["slideshowJobArtifact", jobId, "brief"]`
- `["slideshowJobArtifact", jobId, "plan"]`
- `["slideshowJobArtifact", jobId, "script"]`
- `["slideshowJobArtifact", jobId, "slidePrompt", order]`
- `["slideshowJobArtifact", jobId, "slideImage", order]`
- `["slideshowJobArtifact", jobId, "voice"]`
- `["slideshowJobArtifact", jobId, "renderManifest"]`
- `["slideshowJobArtifact", jobId, "video"]`

Fetch artifacts lazily when their panel or tab is visible, except for the final video which can be fetched automatically once the job is completed.

## Binary Artifact Preview Strategy

Binary artifact routes include slide images, voice, and video.

Strategy:

- Fetch binary artifacts as `Blob`.
- Create object URLs with `URL.createObjectURL(blob)`.
- Use object URLs for `<img>`, `<audio>`, or `<video>`.
- Revoke URLs with `URL.revokeObjectURL(url)` when no longer needed.
- Avoid storing blobs or object URLs in local storage.

Image preview:

- Use stable aspect ratio containers.
- Show per-image loading, not-ready, and failed states.

Video preview:

- Use native `<video controls>`.
- Treat final video as the primary output when ready.

## Object URL Lifecycle

Centralize object URL handling in `src/lib/objectUrl.ts` or a hook.

Requirements:

- Revoke old object URLs when a new blob replaces them.
- Revoke object URLs on unmount.
- Do not leak object URLs across route changes.
- Do not keep object URLs in TanStack Query cache as long-lived strings unless cleanup is guaranteed.

Preferred component-level pattern:

```ts
useEffect(() => {
  if (!blob) return undefined;
  const url = URL.createObjectURL(blob);
  setObjectUrl(url);
  return () => URL.revokeObjectURL(url);
}, [blob]);
```

## Error Handling

Normalize API errors in the client:

```ts
export interface ApiError {
  status?: number;
  message: string;
  code?: string;
  details?: unknown;
}
```

Rules:

- `400`: form or request validation issue.
- `404`: job or artifact not found.
- `409`: artifact is not ready yet.
- `500+`: backend failure or render issue.
- Network failure: backend unavailable or CORS issue.

User-facing errors should be friendly and concise. Technical details should be available in a disclosure panel or Technical tab.

## Artifact 409 Not Ready Behavior

When an artifact request returns `409 Conflict`:

- Do not mark the job as failed.
- Do not show red error styling.
- Show "Not ready yet".
- Continue polling job status if the job is queued or running.
- Allow manual retry.

Represent this as a distinct state in artifact helpers:

```ts
export type ArtifactState<T> =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; data: T }
  | { state: "not_ready" }
  | { state: "error"; error: ApiError };
```

## Backend Unavailable Behavior

Network failures should show:

- "Backend unavailable" title.
- Configured API base URL.
- Retry action.
- Local troubleshooting hint.

The create form should preserve entered values. The job detail page should keep the job ID and any locally cached metadata visible.

## No Frontend-Held Provider Keys

The frontend must not store, request, display, or transmit provider API keys. Provider configuration remains backend-owned. V1 should not expose provider selection or provider account controls.

