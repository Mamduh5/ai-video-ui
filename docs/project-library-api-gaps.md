# Library API gaps (outside Projects UI V1 scope)

Verified against local `scene-video-library.v1` on 2026-10-17. These do not block the compact searchable library and do not authorize backend expansion.

- No total count or facet counts. The UI reports loaded project counts and whether another cursor exists.
- No affirmative project-level human creative acceptance field. `accepted_count`, `completed`, nullable `acceptance_type`, or technical conformance cannot establish it. The UI renders returned statuses and explicit technical/autopilot review caveats.
- No archived-only filter. Storage/restoration labels and existing actions remain visible in results; no archive mutation was added.
- No date range, duration order, reverse order, locale-aware title sorting, tags or favorites. Name sorting uses the stored raw title and server binary ordering, which may differ from a legacy display-title fallback.
- Missing unattended thumbnails and unavailable archive bytes can produce no usable preview. The UI uses a fallback rather than detail fan-out or media restoration.
- Substring search may scan many records; no arbitrary-search index or latency guarantee is claimed.
- The additive endpoint needs a separately authorized normal application activation if the running local API predates the cleanup. UI verification uses the real typed transport with isolated fixtures; this task does not restart the API.
