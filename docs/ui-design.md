# UI Design

## Overall Layout

The app should feel like a focused internal tool for creating and inspecting generated slideshow videos. It should be desktop-first, dense enough for repeated operational use, and clear on status and artifacts.

Recommended app shell:

- Top bar with product name, create action, and API environment hint.
- Main content constrained to a readable width on large screens.
- Desktop two-column job detail layout.
- Single-column responsive layout on narrow screens.

## Recent Jobs

### Purpose

Let the operator reopen locally known slideshow jobs and start a new one.

### Layout

- Header row with "Explainer Slideshow Studio" and primary "New video" action.
- Recent jobs table or list.
- Columns: topic/title, status, current step, created time, last updated time, actions.
- Empty state when no jobs are stored locally.

### Visible Data

- Job ID, shortened for display.
- Topic or generated title when known.
- Status.
- Current step label.
- Created timestamp.
- Last fetched timestamp.

### Actions

- Create new job.
- Open job detail.
- Refresh by opening the job detail page.
- Remove local recent reference, if implemented.

### Loading States

- Skeleton rows for local entries being refreshed, if background refresh is later added.
- Simple page-level loading is enough if recent jobs are only local.

### Empty States

- "No slideshow jobs yet."
- Primary action to create a presentation video.

### Error States

- If local storage is unavailable, show an inline warning and continue with create flow.

## Create Presentation Video

### Purpose

Collect a structured slideshow job request without exposing backend internals.

### Layout

- Page title and compact context line.
- Form organized into sections:
  - Content: topic, audience, educational level, language, tone.
  - Visuals: visual style, aspect ratio, target platform, subtitles.
  - Length: target duration and slide count.
  - Constraints: must include and must avoid.
- Sticky or bottom action row with submit and reset actions.

### Visible Data

- Text inputs for topic, audience, tone, educational level, and visual style.
- Selects or segmented controls for language, aspect ratio, target platform, and subtitles.
- Number inputs or steppers for duration and slide count.
- Token-style list inputs for must-include and must-avoid values.

### Actions

- Submit job.
- Reset form to defaults.
- Return to recent jobs.

### Loading States

- Disable submit while creating.
- Show "Creating job" on the submit button.
- Keep field values visible.

### Empty States

- Default values should make the form usable before customization.
- Must-include and must-avoid lists may be empty.

### Error States

- Inline validation for missing topic, invalid duration, invalid slide count, and unsupported option values.
- API error panel near submit.
- Backend unavailable message with configured base URL.

## Job Detail / Progress

### Purpose

Make generation status visible and provide one place to inspect outputs.

### Recommended Layout

- Header: job title/topic, status, created time, updated time, actions.
- Main column: final video preview when ready; otherwise progress visualization.
- Side column: step status, artifact availability, error details, manual refresh.
- Lower tabs: Slides, Script, Plan, Technical.

### Visible Data

- Job ID.
- Topic.
- Audience.
- Status.
- Current step.
- Created, started, completed, and updated timestamps when available.
- Last poll time.
- Artifact availability.

### Actions

- Manual refresh.
- Download MP4 when ready.
- Open technical details.
- Create another job.
- Return to recent jobs.

### Loading States

- Initial job detail skeleton.
- Polling indicator that does not distract from content.
- Artifact-level placeholders.

### Empty States

- Before artifacts exist, show progress and "Artifacts will appear as generation completes."

### Error States

- Job not found.
- Backend unavailable.
- Artifact failed to load.
- Job failed with last known step and technical details.

## Slide Plan / Artifact Viewer

### Purpose

Show generated slide content and supporting artifacts for inspection.

### Layout

- Lower tab area on job detail.
- Slides tab with ordered grid or list.
- Each slide item shows image, order, title, caption, prompt availability, and artifact status.
- Script and Plan tabs use readable text panels.
- Technical tab shows structured metadata and raw-ish backend detail.

### Visible Data

- Slide order.
- Slide title.
- Slide caption.
- Slide image.
- Slide prompt.
- Script sections or narration text.
- Plan outline.
- Render manifest summary.

### Actions

- Retry artifact fetch.
- Copy text for script, plan, or prompt if useful.
- Download final video from the main video panel, not from every artifact panel.

### Loading States

- Per-artifact loading indicators.
- Image skeletons with fixed aspect ratio.
- "Not ready yet" for `409 Conflict`.

### Empty States

- "No slide artifacts available yet."
- Keep the progress timeline visible so users understand why.

### Error States

- Nonfatal panel-level errors for individual artifacts.
- Failed image loads should not break the full slide grid.

## Final Video Preview / Download

### Purpose

Make the rendered MP4 the primary output when available.

### Layout

- Prominent video panel in the main column.
- Native video controls.
- Metadata row with duration, aspect ratio, and file readiness when available.
- Download button adjacent to the video panel.

### Visible Data

- Video preview.
- Job status.
- Completion timestamp.
- Render manifest link or summary.

### Actions

- Play/pause through native controls.
- Download MP4.
- Refresh artifact if preview fails.

### Loading States

- Video placeholder while fetching blob.
- "Video not ready yet" when route returns `409`.

### Empty States

- If job is completed but video is unavailable, show a specific artifact unavailable state and a retry action.

### Error States

- Browser cannot play video.
- Video artifact fetch failed.
- Object URL creation failed, if detectable.

## Failure / Debug Details

### Purpose

Help the operator understand failures without turning the main UI into a log viewer.

### Layout

- Friendly failure panel in the side column or main column.
- Technical details in a collapsed disclosure.
- Keep generated artifacts visible below when available.

### Visible Data

- Failed status.
- Failed or last known step.
- Friendly error summary.
- Backend technical message.
- Request ID or job ID.
- Raw error payload in Technical tab when useful.

### Actions

- Retry status fetch.
- Create a new job.
- Copy technical details.

### Loading States

- Retry button shows loading state.

### Empty States

- If no backend error is available, show "The backend did not return technical details."

### Error States

- If technical details cannot be parsed, show the raw message as text.

