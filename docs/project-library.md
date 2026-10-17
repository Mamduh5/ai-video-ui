# Frontend and project library contract

Current operational reference for the library API and Projects UI on 2026-10-17. The Projects library now uses the additive read-only API. Existing routes, provider controls, and production/recovery workflows remain supported. See [Projects Library V1](projects-library-v1.md).

## Current application boundaries

- `src/app/router.tsx` owns routes. `/` and `/videos` render `ProjectsPage`; `/videos/new` and `/scene-jobs/create` render `NewVideoPage` through its compatibility re-export; `/scene-jobs/:jobId` renders `SceneVideoPage`. Slideshow creation/detail remain supported under `/create` and `/slideshow-jobs/:jobId`.
- `src/lib/apiClient.ts` owns API URL construction, HTTP parsing, typed errors, and fetch injection for offline tests.
- `src/features/projectLibrary/types.ts` owns the new library contract and shared `NextAction` shape. `pages/videoProduct.ts` re-exports that type for existing consumers and retains legacy summary/presentation helpers.
- `src/features/projectLibrary/api.ts` exposes `getProjectLibrary(query, clientOptions?, signal?)`, a GET-only, cancellable read client. It supplies ProjectsPage through the existing React Query provider and useInfiniteQuery.
- `src/features/slideshowJobs` retains contracts, API/artifact/status helpers, React Query polling hooks, and slideshow form/artifact UI for `/create` and `/slideshow-jobs/:jobId`.
- `SceneVideoPage` still owns legacy/detail workflow composition; production, opening-image, continuity, scene review, conformance, exports, and recovery panels retain their existing contracts.
- `RecoveryPromptEditor` owns its unsaved draft. The Gemini page keys the automatic recommended form by saved prompt; explicit edits survive polling, and Cancel returns the latest persisted prompt. Opening/editing/refreshing this form does not submit recovery or generation.

The scene detail page (about 52 KB before cleanup) and Gemini page (about 30 KB) retain substantial production coupling. A broad split would cross recovery and provider boundaries; defer it to focused changes with their existing regression suites. No dependencies were removed: every direct production dependency is used by the app and build/test tooling remains required.

## Additive library API

`GET /scene-video-library` returns `api_version: "scene-video-library.v1"`. The existing `GET /scene-video-jobs` offset API and all project detail, creation and mutation APIs remain in use and unchanged. The Projects page now uses this endpoint; non-library legacy consumers retain their existing API.

| Query | Contract |
| --- | --- |
| `q` | Literal title, topic or project ID search; URL encoded by the client |
| `status` | Persisted machine state: `pending`, `running`, `completed`, `failed`, `awaiting_external_generation`, `awaiting_review`, `awaiting_human_decision`, `conformance_attention_required` |
| `provider` | `flow_web`, `gemini_web`, `manual` |
| `workflow` | `flow_unattended`, `gemini_autopilot`, `flow_supervised`, `manual`, `colab_planning` |
| `paused` | Optional boolean; both `true` and `false` are serialized |
| `sort` | `recent` (default), `created`, `name` |
| `limit` | Integer 1..100, default 40 |
| `cursor` | Opaque query-bound next-page token; retain the same query while browsing |

The response contains `projects`, `sort`, and `page: { limit, has_more, next_cursor }`. The last page has `next_cursor: null`, and empty results use `projects: []`.

Each project contains stable `id`, `title`, persisted `status`, separate `display_status`, `provider`, `workflow`, `paused`, `progress: { scene_count, accepted_count, percent }`, `storage: { state, label, archive_percent }`, and `next_action`. Optional action `scene_order` and `attempt` are omitted when absent. Timestamps (`created_at`, `updated_at`, `next_automatic_at`), media URLs, duration, aspect ratio, and acceptance type are explicitly nullable. `eligibility_estimated` is always boolean. Percentages are always numeric; storage state is extensible and unknown states must not imply that a mutation is allowed.

`next_action.type` is a machine value; `label` and `message` are display text. Render server-owned progress/status/action/storage fields rather than recomputing them from provider names or display labels. A read response does not authorize executing an action. The lightweight contract omits internal object keys and large production/run histories; obtain detail only when opening a project.

Malformed input returns HTTP 400 `{ error, code: "invalid_library_query", field }`; unavailable reads return HTTP 503 `{ error, code: "library_unavailable" }`. The common client preserves `code`, status, message and the full structured error in `ApiClientError.details`. The library client performs no retries or mutations.

The Projects UI keys cached cursor chains by search, filters, sort, and page size, uses the returned `next_cursor`, and stops at `has_more: false`. Explicit Refresh discards continuation pages and starts from page one. Treat nullable historical data explicitly; use detail APIs for production/recovery controls. The backend contract document explains snapshot and concurrent-update behavior.

## Verified cleanup and preservation

Removed `src/pages/RecentJobsPage.tsx` and its single self-only placeholder test. A repository-wide reference search found only the component, its own test, and historical planning references in `frontend-architecture.md` / `implementation-sequence.md`; the router had no import or route. Its only test asserted obsolete placeholder text and a slideshow creation link. Real Projects, slideshow, Dense, frozen Fast, media, recovery and production tests remain intact.

The historical planning references are retained and explicitly labeled; they explain the original v1 design rather than promise a current route. README's stale R8 uncommitted/pending text is replaced with the authoritative backend acceptance-report reference. No acceptance reports or milestone evidence were deleted or moved.

The existing lint failure (`react-hooks/set-state-in-effect` in Gemini saved-prompt synchronization) was resolved by moving draft ownership into the small editor component; no lint rule or assertion was suppressed.

## Documentation classification

| Class | References and treatment |
| --- | --- |
| Current operational | README opening sections, this contract, and source/tests; current source and scripts prevail where older text differs |
| Historical milestone evidence | `r2-test-concurrency.md`, `r14-engineering-checkpoint.md`, README R8/R8.2/R13 notes, sibling backend acceptance reports; retained with their original boundaries |
| Historical slideshow v1 design | `product-scope.md` (including consolidated V1 Non-Goals), `ux-flow.md`, `ui-design.md`, `design-system.md`, `api-integration.md`, `frontend-architecture.md`, `implementation-sequence.md`, `local-dev.md` (original manual payload and troubleshooting), and `testing-plan.md`; retained, not interpreted as current scene-video restrictions |
| Obsolete runtime draft | Unreachable `RecentJobsPage` placeholder and its self-test removed; no supported runtime path depended on them |

## Validation and rollback

Baseline (clean frontend `main`, commit `6bc2da1`): 42 Vitest files / 283 tests passed; typecheck and production build passed; lint failed with the single saved-prompt effect error described above. Node was v22.23.1. Tests use mocked HTTP; no provider or production database calls are required.

Final validation: all 42 Vitest files / 291 tests passed (91.24s); typecheck, lint, production build and `git diff --check` passed. The build transformed 155 modules (477.87 kB JS, 137.81 kB gzip). The only removed test is the unreachable placeholder assertion; eight library HTTP contract cases and one recovery-edit regression were added. No live-provider, production database, browser or worker acceptance was performed.

Run `npm run test:run`, `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` after changes. Library tests cover literal query encoding, combined filters including paused=false, opaque continuation metadata, historical nulls, server-owned states/actions, empty results, structured validation/unavailable errors, GET-only behavior, and cancellation. Gemini regressions cover saved-prompt refresh, explicit draft preservation and Cancel without a POST.

There is no frontend schema or data migration. Roll back the frontend cleanup commit to restore the prior files and import boundaries; the cleanup introduced an additive API client. The subsequent Projects UI depends on the new endpoint; roll back that UI change first if the additive endpoint is unavailable. Backend index/read-model rollback is documented separately in the backend report.
