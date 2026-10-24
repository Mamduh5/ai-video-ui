# Reference Image V1 frontend

**Milestone follow-up (2026-10-19):** The final suite passed 401 tests in 48 files, typecheck, lint and production build. Flow now shares this uploader through its supervised/unattended New Video workflows. Two separately authorized Fast/8s/720p Ingredients tests acknowledged the saved Tesla image, imported and played successfully, but failed creative identity/action acceptance. Both explicitly used Standard tempo 1; Dense was not used. Gemini Subject Reference remains unverified and production-disabled. Earlier Gemini-only evidence below retains its original scope.

On 2026-10-19 the provider's subject-reference role is **unverified** in the dedicated Gemini browser workflow. New Video shows this limitation and disables image selection. No image is accepted for silent omission or converted to an opening frame. Text-only video creation remains available subject to existing backend readiness.

Gemini Autopilot's **+ Queue Video** link opens `/videos/new?workflow=gemini_web`, so both entry points use the same form and creation contract.

## User controls and constraints

When the backend reports verified support, choose Gemini Autopilot, select one PNG or JPEG under Reference Image / **Subject Reference**, and inspect its preview. Replace image opens the picker; Remove image returns to text-only creation. Maximum size is 10 MiB, each dimension at most 4096 pixels, and at most 16 million pixels total. Empty, unsupported, undecodable and oversized images block creation until replaced or removed.

The reference guides the subject's appearance across scenes. New backgrounds, lighting, camera angles and opening compositions are allowed. An opening frame defines the initial composition; a continuity frame comes from the previously accepted scene. Those existing Flow concepts retain their separate fields and controls.

Other form edits preserve the selected image. Switching workflows explicitly clears it, so a Gemini image never enters a Flow request. Image validation blocks submission; image persistence disables the form and a synchronous submission lock prevents duplicate clicks. Preview object URLs are revoked on replacement, removal and navigation. Chrome supports the native bitmap decoder; other modern browsers can use the image-element decoder fallback. Mobile layouts retain full-width previews and wrapping controls.

## Creation and failure contract

`GET /gemini-autopilot/subject-reference-capability` supplies `supported`, status/message, `media_types`, `max_bytes`, `max_width`, `max_height` and `max_pixels`. Missing, failed or malformed capability responses disable selection. A support change also blocks creation while a previously selected image remains attached. The user can remove it to continue without an image.

No-image creation keeps the existing JSON `POST /gemini-autopilot/queue` body. Image creation uses the same endpoint with multipart fields `request` (the existing JSON request) and `subject_reference` (image bytes), plus an `Idempotency-Key`. There is no temporary upload token or abandoned browser-side upload. The backend validates actual bytes, persists the immutable image and metadata, and associates it with the project before queue eligibility.

An image persistence failure preserves the selection and displays the backend error. Retrying the same form and file reuses the key. Editing the submitted request or replacing the file generates a new key. The browser retains the file and retry key only while this page stays open; a reload clears the local draft. Existing saved project references remain backend-owned across restart, recovery, archive and restoration. Metadata includes the subject role, validated type, dimensions, timestamp, SHA-256 and project-scoped preview URL under the existing local artifact access boundary; the frontend sends no private filesystem path or provider credentials.

Provider role binding and acknowledgement are backend/browser-adapter responsibilities. A successful multipart response is project persistence evidence only. It does not prove provider attachment, reference use, or visual identity preservation.

## Validation and remaining acceptance

On 2026-10-19, the full frontend suite passed **394 tests in 47 files** with `npm.cmd run test:run -- --maxWorkers=2`. Fixture browser acceptance passed **8 checks** at 1440px and 390px, with zero forwarded backend/provider requests and no browser errors or unexpected traffic. Exact logs and captures are in `docs/reference-image-review/`. Explicit typecheck, lint (zero warnings) and production build passed. Vite reported its non-fatal 500 kB chunk-size warning; the generated JavaScript chunk was 508.27 kB (148.03 kB gzip).

Focused Vitest coverage exercises preview/replace/remove, editable-field preservation, decoded-image validation, async replacement/removal races, persistence locks/errors, stable retry keys, malformed/unavailable capability data, provider support changes, no-image compatibility, and Flow isolation. API-client tests cover multipart boundary/header behavior and structured errors. Existing Dense/Fast settings and no-reference generation contracts remain unchanged.

Fixture browser acceptance is reproducible with `e2e/reference-image.browser.mjs`. Start Vite with `VITE_API_BASE_URL=http://127.0.0.1:18080` on port 5181; set `PLAYWRIGHT_MODULE_PATH` to an existing installed Playwright module, then run the script. All API traffic is intercepted. Its synthetic browser-canvas PNG proves browser decoding and UI behavior only. Captures and exact results are in `docs/reference-image-review/`.

Live upload, provider role verification, a Tesla generation result, and subjective vehicle-identity acceptance are not established by frontend tests. The feature remains gated until the backend can verify the intended Gemini roles without replacing continuity frames.

## Flow Ingredients compatibility

`/scene-video-options` exposes `flow_model`, `flow_ingredients_supported` and `flow_ingredients_capabilities`. The form validates selected duration and resolution against the configured model plus Ingredients mode. Unsupported selections remain visible and block creation; the form does not silently change them. Fast/Lite Ingredients support eight seconds at native 720p; Quality Ingredients is rejected. Omni retains its supported 4/6/8/10-second choices. Selecting an image requires independent continuity and excludes opening/continuity-frame inputs. Exact upload acknowledgement and final subject consistency are separate backend/live acceptance gates.

The comprehensive cross-repository audit is in the backend checkout at `docs/ai-video-pipeline-milestone-2026-10-19.md`. No provider work was performed during that final audit.

## Starting Image update (2026-10-24)

Gemini now offers a separate, explicitly selected **Starting Image (optional)** mode. Native preparation in the dedicated main account acknowledged the image and retained the selected 9:16 and 16:9 ratios after upload, without submitting a video. Subject Reference remains separately unavailable under secondary information; an earlier subject-reference choice is never substituted.

The image opens Scene 1, so its composition/background may appear in the opening. Later scenes use accepted-scene continuity frames. Exact subject identity and generated opening fidelity have not been proven by a new generation. This mode reuses the preview/replace/remove controls, validation, immutable storage and guarded upload, while persisting `starting_image` in a distinct role, project field and multipart field. Failed image storage or acknowledgement cannot silently proceed without it. No-image JSON creation stays unchanged.

The updated existing browser fixture covers unavailable capability, explicit role selection, both aspect choices, retained preview after failed persistence, removal/workflow changes and responsive layout. Its 8 checks pass with zero backend/provider requests. Full frontend validation: 51 files, 449 tests; typecheck/build and lint PASS. Live application controls and native provider preparation were checked separately; no production Resume or test project was submitted.
