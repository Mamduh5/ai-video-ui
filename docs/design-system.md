# Design System

## Direction

Use a lightweight internal-tool design. The UI should feel practical, legible, and built for repeated job inspection. Avoid a marketing-style landing page, oversized hero sections, decorative cards, or a full design system that slows v1.

## Layout

- Desktop-first.
- Use a max-width content container for list and create pages.
- Use a two-column detail layout on desktop:
  - Main column: progress or final video.
  - Side column: status, artifact readiness, errors, actions.
- Collapse to one column on mobile.
- Keep fixed-format elements stable with explicit dimensions, aspect ratios, and min/max constraints.

Tailwind-friendly examples:

- Page container: `mx-auto max-w-7xl px-6 py-6`
- Two-column detail grid: `grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]`
- Lower tabs area: `mt-6`

## Spacing

- Base spacing scale should follow Tailwind defaults.
- Use `gap-4` for compact form groups and panels.
- Use `gap-6` for major page regions.
- Use `p-4` for dense panels and `p-6` for primary page sections.
- Avoid deeply nested cards.

## Typography

- Use system font stack through Tailwind defaults.
- Page titles: `text-2xl font-semibold`.
- Section titles: `text-base font-semibold`.
- Panel labels: `text-sm font-medium`.
- Helper and metadata text: `text-sm text-slate-600`.
- Technical details: monospace text with wrapping.
- Do not scale font size with viewport width.
- Keep letter spacing at default.

## Buttons

Button hierarchy:

- Primary: submit job, create new job, download final MP4.
- Secondary: manual refresh, return to recent jobs, reset form.
- Tertiary/ghost: copy technical details, remove local recent entry.

Tailwind-friendly patterns:

- Primary: solid high-contrast background, white text, clear disabled state.
- Secondary: neutral border, white or subtle background.
- Destructive is rarely needed in v1 and should only apply to local recent removal.

Button rules:

- Use concise labels.
- Include loading states for network actions.
- Disable actions that are not currently valid.
- Keep download visually close to the video preview.

## Form Controls

Use standard controls first:

- Text input for topic, audience, tone, educational level, and visual style.
- Select or segmented control for aspect ratio and target platform.
- Number input or stepper for duration and slide count.
- Toggle or checkbox for subtitles.
- Tokenized text input or newline/comma parser for must-include and must-avoid lists.

Validation:

- Required: topic.
- Recommended minimums and maximums:
  - `target_duration_seconds`: 15 to 300.
  - `slide_count`: 1 to 30.
- Show field-level messages and a form-level API error when submission fails.

Do not include controls for providers, models, content mode, browser accounts, or voice provider selection in v1.

## Cards And Panels

Use panels for bounded information groups:

- Job status summary.
- Artifact availability.
- Slide item.
- Error details.
- Video preview.

Rules:

- Border radius should be modest, `rounded-md` or `rounded-lg` at most.
- Use borders and subtle backgrounds instead of heavy shadows.
- Do not place UI cards inside other cards.
- Avoid decorative panels that do not contain actionable or inspectable information.

## Status Badges

Status badge mapping:

- `queued`: neutral gray or amber.
- `running`: blue.
- `completed`: green.
- `failed`: red.
- Unknown: gray with explicit label.

Badges should appear in:

- Recent job rows.
- Job detail header.
- Side column status panel.

## Progress Indicators

Use a step timeline rather than a percentage bar unless the backend later returns measurable progress.

Recommended step display:

- Ordered list of known generation stages.
- Completed steps have checkmark styling.
- Current step has active styling.
- Future steps are muted.
- Failed step is red and visually distinct.

Avoid implying exact progress if the backend only provides `current_step`.

## Artifact Panels

Artifact panel states:

- Ready.
- Loading.
- Not ready yet.
- Failed to load.
- Unavailable.

Display:

- Artifact label.
- Availability status.
- Retry action for fetch failures.
- Short metadata when useful.

`409 Conflict` maps to "Not ready yet" and should not use error styling.

## Video Preview Panel

The final video is the hero output when ready.

Rules:

- Use a native video element with controls.
- Preserve expected aspect ratio with a stable container.
- Provide a clear download button.
- Show a poster-like placeholder only if the video is not ready.
- Surface playback errors in the panel.

Suggested aspect-ratio classes:

- `aspect-[9/16]` for shorts.
- `aspect-video` for 16:9.
- `aspect-square` for 1:1.

## Error, Warning, And Success Styling

Use semantic but restrained states:

- Error: red border/background tint, clear title, actionable message.
- Warning: amber tint for partial availability or backend configuration hints.
- Success: green badge or short confirmation, not a large celebratory panel.
- Info: blue or neutral for polling and not-ready states.

Technical details should be secondary and collapsible.

