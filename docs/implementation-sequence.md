# Implementation Sequence

## F0: Docs-First Planning

Objective:

Create implementation-ready documentation before scaffolding the app.

Likely files:

- `README.md`
- `docs/product-scope.md`
- `docs/ux-flow.md`
- `docs/ui-design.md`
- `docs/design-system.md`
- `docs/api-integration.md`
- `docs/frontend-architecture.md`
- `docs/local-dev.md`
- `docs/v1-non-goals.md`
- `docs/implementation-sequence.md`
- `docs/testing-plan.md`

Acceptance criteria:

- Docs target `/slideshow-video-jobs`.
- Docs avoid legacy and experimental backend API dependency for v1.
- Docs do not expose provider selection in v1.
- Docs define UX, UI, API integration, architecture, local dev, non-goals, implementation phases, and tests.
- No app implementation exists yet.

Tests:

- File existence check.
- Search docs for forbidden v1 dependencies.
- Manual review against acceptance criteria.

Risks:

- Backend response schema may shift before implementation.
- Some artifact shapes may need adjustment after integration.

## F1: Repo Scaffold And Base Tooling

Objective:

Create the Vite React TypeScript project and install base tooling.

Likely files:

- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `index.html`
- `src/main.tsx`
- `src/app/router.tsx`
- `src/app/providers.tsx`
- Tailwind config and CSS entry files.

Acceptance criteria:

- App boots locally.
- TypeScript compiles.
- Tailwind styles load.
- Router renders empty shell pages.

Tests:

- Build command succeeds.
- Basic smoke test renders app shell.

Risks:

- Package versions may require config updates.
- Local Node version may be incompatible.

## F2: API Client And TypeScript Contracts

Objective:

Implement centralized API client and slideshow job contract types.

Likely files:

- `src/lib/apiClient.ts`
- `src/features/slideshowJobs/api.ts`
- `src/features/slideshowJobs/types.ts`
- `src/features/slideshowJobs/status.ts`

Acceptance criteria:

- Create job function posts to `/slideshow-video-jobs`.
- Detail function gets `/slideshow-video-jobs/:id`.
- Artifact functions use documented artifact routes.
- API errors are normalized.
- `409 Conflict` is represented as artifact-not-ready.
- No provider keys or provider selectors exist.

Tests:

- API client unit tests with mocked fetch.
- Error normalization tests.
- `409` artifact behavior tests.

Risks:

- Backend may return fields with different names.
- Binary artifact content types may vary.

## F3: Routing And Shell Layout

Objective:

Add app shell and core routes.

Likely files:

- `src/app/router.tsx`
- `src/app/providers.tsx`
- `src/pages/RecentJobsPage.tsx`
- `src/pages/CreateJobPage.tsx`
- `src/pages/JobDetailPage.tsx`
- `src/components/layout/*`

Acceptance criteria:

- `/` renders recent jobs.
- `/create` renders create page placeholder or form.
- `/slideshow-jobs/:jobId` renders job detail page.
- Navigation works without full reload.

Tests:

- Route rendering tests.
- Navigation tests.

Risks:

- Frontend route naming may be confused with backend API paths; code reviews should verify API calls.

## F4: Create-Job Form

Objective:

Build structured form and submit jobs.

Likely files:

- `src/features/slideshowJobs/components/CreateJobForm.tsx`
- `src/pages/CreateJobPage.tsx`
- `src/features/slideshowJobs/hooks.ts`
- `src/features/slideshowJobs/api.ts`

Acceptance criteria:

- Form includes v1 fields only.
- Validation prevents invalid requests.
- Submit calls `POST /slideshow-video-jobs`.
- Successful create navigates to job detail.
- Recent job reference is stored locally.
- Form preserves values on errors.

Tests:

- Required field validation.
- Numeric range validation.
- Successful submit mutation.
- Backend unavailable state.
- No provider/content-mode fields rendered.

Risks:

- `educational_level` may not be accepted by backend and needs explicit mapping.

## F5: Job Detail Polling / Status UI

Objective:

Show job status and current step with polling.

Likely files:

- `src/pages/JobDetailPage.tsx`
- `src/features/slideshowJobs/hooks.ts`
- `src/features/slideshowJobs/components/JobStatusHeader.tsx`
- `src/features/slideshowJobs/components/ProgressTimeline.tsx`
- `src/features/slideshowJobs/status.ts`

Acceptance criteria:

- Poll every 2 seconds while queued/running.
- Stop polling on completed/failed.
- Manual refresh is available.
- Current step has a friendly label.
- Unknown steps are tolerated.
- Failed jobs show failure panel.

Tests:

- Poll interval behavior.
- Stop-on-terminal-state tests.
- Step label mapping tests.
- Manual refresh test.

Risks:

- Backend may not expose enough timestamps or step detail initially.

## F6: Artifact Viewers

Objective:

Display brief, plan, script, slide prompts, slide images, voice, and render manifest when available.

Likely files:

- `src/features/slideshowJobs/artifacts.ts`
- `src/features/slideshowJobs/components/SlideArtifactGrid.tsx`
- `src/features/slideshowJobs/components/ArtifactPanel.tsx`
- `src/lib/objectUrl.ts`

Acceptance criteria:

- Artifact queries are lazy or visibility-aware.
- Text artifacts render readably.
- Slide images render from object URLs.
- `409 Conflict` shows "Not ready yet".
- Individual artifact errors do not break the full job page.

Tests:

- Artifact fetch success tests.
- Artifact `409` tests.
- Blob/object URL lifecycle tests.
- Slide grid rendering tests.

Risks:

- Artifact payload formats may differ from initial assumptions.
- Many slide image blobs could increase memory usage if cleanup is missed.

## F7: Final Video Preview / Download

Objective:

Make completed MP4 preview and download the primary output.

Likely files:

- `src/features/slideshowJobs/components/FinalVideoPanel.tsx`
- `src/features/slideshowJobs/artifacts.ts`
- `src/lib/objectUrl.ts`
- `src/lib/format.ts`

Acceptance criteria:

- Video artifact fetches after job completion.
- Native video preview works for MP4 blob.
- Download action is enabled only when ready.
- Object URL is revoked on cleanup.
- `409` shows video not ready without failure styling.

Tests:

- Video blob preview tests.
- Download link filename test.
- Object URL cleanup test.
- Video artifact error state test.

Risks:

- Browser playback may fail if backend returns unsupported encoding.
- Large videos need careful blob lifecycle handling.

## F8: Error / Failure UX

Objective:

Provide clear errors for job failure, artifact failure, backend unavailable, and validation issues.

Likely files:

- `src/features/slideshowJobs/components/FailurePanel.tsx`
- `src/components/ui/*`
- `src/lib/apiClient.ts`

Acceptance criteria:

- Failed jobs show friendly message, step, and optional details.
- Backend unavailable is distinct from backend job failure.
- Artifact `409` is not shown as an error.
- Technical details can be copied or expanded.

Tests:

- Failed job rendering.
- Backend unavailable rendering.
- Technical details disclosure test.
- Retry action tests.

Risks:

- Backend error payload may be inconsistent.

## F9: Polish And Local Validation

Objective:

Validate the full local workflow against the running backend.

Likely files:

- Existing app files.
- Minor style and copy refinements.

Acceptance criteria:

- Create, poll, inspect, preview, and download works locally.
- Loading, empty, `409`, failed, and backend unavailable states are usable.
- Responsive layout is coherent.
- Build passes.
- Unit/component tests pass.

Tests:

- Build.
- Unit tests.
- Component tests.
- Manual backend smoke test.
- Optional Playwright smoke test.

Risks:

- Backend local environment may need FFmpeg or storage configuration.
- Fake media quality may be mistaken for frontend issue.

## F10: Optional Editor / Regeneration Features Later

Objective:

Add editing and regeneration only after v1 proves the base slideshow flow.

Likely files:

- New editor feature modules.
- New routes or tabs.
- API client additions if backend exposes edit/regeneration endpoints.

Acceptance criteria:

- Later features are backed by stable backend APIs.
- Existing create/poll/preview/download flow remains simple.
- Provider controls appear only if public backend API supports them.

Tests:

- Regression tests for v1 workflow.
- Editor-specific tests.
- API compatibility tests.

Risks:

- Editing can quickly turn the app into a full production studio.
- Regeneration may require complex artifact versioning.
