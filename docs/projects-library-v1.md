# Projects Library V1

2026-10-17. Routes `/` and `/videos` use `GET /scene-video-library` through the existing typed client and React Query provider. The local cleanup baseline is frontend `dd89db8`; backend `75944df` and `3e7945e`. These commits are preserved.

## Browsing

Compact rows are the default. A remembered list/grid preference changes presentation without another API request. Each item shows the returned title, provider, display status, scene progress, update date, storage state and contextual detail link. Preview images load lazily, preserve portrait content, and fall back on missing/broken media. Rows do not fetch project details or execute production actions. Creation and all existing detail/recovery routes remain available.

Search uses literal title, topic or project ID matching across the server library with a 300ms debounce and cancellation. Provider, persisted status and pause filters combine with Last updated, Newest created or Name (A–Z). Completed includes technical and human acceptance types. Labels and counts never prove human creative approval; Gemini and unattended projects carry an explicit review caveat. No human-reviewed badge is inferred.

Each request asks for 40 summaries. **Load more** appends the next opaque cursor page only when clicked; keyboard and touch users use the same control. No numbered pages or scroll-triggered prefetch. Duplicate IDs moving across a boundary appear once. Search/filter/sort changes select a different cached query chain. **Refresh** cancels the current read, trims continuations and reads page one so projects changed after the cursor boundary can reappear. The list does not repeatedly refetch all loaded pages in the background; use Refresh for current production state. Details retain their existing polling and production controls.

## Navigation context

Search, filters, sort and explicit view live in the URL. Search replaces its history entry as you type; filter/sort/view changes create history entries. Browser Back/Forward restores those values. React Query retains loaded pages for 30 minutes after leaving the library, without refetching/reordering them on return. Scroll offsets and the last library URL live in tab-scoped session storage; the shared Projects navigation returns to that URL. List/grid preference lives in local storage. Disabled/full storage gracefully falls back to normal browsing.

A full browser reload retains URL/preferences but loses the in-memory query cache. It starts with one page instead of silently refetching hundreds of rows; scroll restoration is limited by those loaded rows. Detail mutations do not silently rewrite the cursor chain; Refresh updates the library. A cursor is a browsing boundary, not a transaction snapshot.

## Verification

Run `npm run test:run`, `npm run lint`, `npm run typecheck`, `npm run build` and `git diff --check`. Projects tests exercise bounded cursor loading, server search beyond loaded data, supported filters and sorts, URL/back navigation, cached pages/scroll, cancellation, refresh, loading/error/empty states, archive actions and technical acceptance wording. Existing detail tests remain in place.

The optional browser harness `e2e/project-library.browser.mjs` runs against an isolated local Vite server and intercepts all fixture API/media requests. It uses Playwright from `PLAYWRIGHT_MODULE_PATH` (or an already installed local copy), no production API. See its header for exact invocation and output paths. Screenshots and browser results are synthetic fixture evidence, not provider or owner creative acceptance. API gaps are tracked separately in [Library API gaps](project-library-api-gaps.md).

No backend/schema changes, production data writes, provider submissions, worker restarts, pushes or deployment are part of this UI change. The Gemini/session hash observation in the cleanup baseline remains unexplained; this work supplies no causal evidence and does not change production sessions.

## Final local evidence

- Full frontend regression: **43 files / 310 tests passed**, `npm run test:run -- --maxWorkers=2` (109.96s). The cleanup baseline had 291 tests; 18 library cases and one shared-navigation case were added. Existing detail/production/recovery tests remain green. An earlier overlapping four-worker run hit timeouts; the final complete run uses two workers without suppressing tests.
- Typecheck, lint, production build and whitespace checks passed. No dependency or lockfile changes.
- Isolated Chrome fixture harness: **13 checks passed** across 512, 7 and 0 records. Desktop 1440×1000 and mobile 390×844; touch and keyboard exercised. It verifies first-page 40, explicit 80/120 continuation, project 512 found by server search, and project opening/Back with 120 loaded rows and restored scroll. No unexpected API/mutation requests or browser exceptions were recorded.
- [Browser evidence and screenshot index](project-library-review/README.md) contains eight captured views and the machine report. These are synthetic layout/workflow checks; owner visual approval and running-backend activation are separate.
