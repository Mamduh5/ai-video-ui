# Frontend Architecture

## Planned Stack

- React for UI.
- Vite for local development and build tooling.
- TypeScript for API contracts and component props.
- TanStack Query for server state, polling, artifact fetches, retries, and cache control.
- React Router for page routing.
- Tailwind CSS for styling.

## Proposed Source Structure

```text
src/
  app/
    router.tsx
    providers.tsx
  pages/
    RecentJobsPage.tsx
    CreateJobPage.tsx
    JobDetailPage.tsx
  features/
    slideshowJobs/
      api.ts
      types.ts
      hooks.ts
      status.ts
      artifacts.ts
      components/
        CreateJobForm.tsx
        JobStatusHeader.tsx
        ProgressTimeline.tsx
        SlideArtifactGrid.tsx
        ArtifactPanel.tsx
        FinalVideoPanel.tsx
        FailurePanel.tsx
  components/
    layout/
    ui/
  lib/
    apiClient.ts
    format.ts
    objectUrl.ts
  styles/
```

This is a planning structure only. Do not scaffold these files until app implementation starts.

## Route Structure

Recommended routes:

- `/`: recent jobs page.
- `/create`: create presentation video page.
- `/slideshow-jobs/:jobId`: job detail page for a slideshow job.

Backend calls must use `/slideshow-video-jobs/:id`. The frontend route uses slideshow-specific naming to keep v1 separate from older job concepts.

## App Providers

`src/app/providers.tsx` should eventually contain:

- TanStack Query client provider.
- Router provider if routing is composed there.
- Any future toast or theme provider if needed.

Keep providers minimal in v1.

## API Client

`src/lib/apiClient.ts` should:

- Read `VITE_API_BASE_URL`.
- Join base URL and path safely.
- Set JSON headers for JSON requests.
- Parse JSON responses.
- Return blobs for binary artifact requests.
- Normalize API and network errors.
- Treat `409 Conflict` as a typed artifact-not-ready condition.

`features/slideshowJobs/api.ts` should own slideshow-specific endpoint functions:

- `createSlideshowJob(request)`
- `getSlideshowJob(id)`
- `getBriefArtifact(id)`
- `getPlanArtifact(id)`
- `getScriptArtifact(id)`
- `getSlidePromptArtifact(id, order)`
- `getSlideImageArtifact(id, order)`
- `getVoiceArtifact(id)`
- `getRenderManifestArtifact(id)`
- `getVideoArtifact(id)`

## TanStack Query Usage

Use TanStack Query for server state only.

Patterns:

- `useMutation` for job creation.
- `useQuery` for job detail polling.
- `useQuery` for artifact fetches.
- Query keys should include job ID and artifact type.
- Keep polling interval dependent on job status.
- Disable artifact queries until required IDs and visible UI state exist.

Do not mirror all query data into global state. Render from query data directly.

## Local State

Use local component state for:

- Form values.
- Active tab.
- Expanded technical details.
- Object URL strings tied to component lifecycle.

Use local storage only for recent job references:

- Job ID.
- Topic/title.
- Created time.
- Last known status.
- Last known current step.
- Last viewed time.

Do not store blobs, provider secrets, or full technical payloads in local storage.

## No Complex Global State In V1

V1 does not need Redux, Zustand, XState, or a custom global event bus.

Reasons:

- Server state is handled by TanStack Query.
- The app has a small route surface.
- Artifacts are naturally scoped to a job detail page.
- No authenticated workspace state is planned.

## Artifact Object URL Cleanup

Object URLs are needed for image, audio, and video artifact blobs.

Rules:

- Create object URLs near the rendering component.
- Revoke the previous URL when the blob changes.
- Revoke on unmount.
- Avoid storing object URLs in query data or local storage.

Reusable helper options:

- `useObjectUrl(blob)` hook.
- `createManagedObjectUrl(blob)` utility with explicit cleanup.

## Environment Config

Required env var:

```text
VITE_API_BASE_URL=http://localhost:8080
```

Implementation should fail visibly if missing:

- Show an app-level configuration error.
- Include the missing variable name.
- Do not attempt relative backend calls unless intentionally configured.

## Local-Dev Assumptions

Assume:

- Backend runs separately on `http://localhost:8080`.
- Frontend Vite dev server runs on its own port.
- Backend CORS allows the Vite dev origin.
- Fake/static local-dev media may be low quality.
- Final MP4 rendering depends on backend FFmpeg availability.
- No real image or TTS provider is available until backend integration lands.

## Future Extension Points

Potential later features:

- Job list endpoint integration if backend adds one.
- Script editor.
- Prompt editor.
- Per-slide regeneration.
- Provider/model controls if and only if the public backend API supports them.
- Auth and workspaces.
- Publishing integrations.
- True video clip or scene-based workflows as a separate product path.

Future features should not be embedded into v1 state shape in a way that complicates the first implementation.
