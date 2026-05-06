import type { SlideshowJobStep } from "./types";

export const SLIDESHOW_STEP_LABELS: Record<SlideshowJobStep, string> = {
  queued: "Queued",
  normalizing: "Preparing brief",
  planning: "Building outline",
  scripting: "Writing narration",
  image_briefing: "Planning visuals",
  prompt_enhancing: "Preparing image prompts",
  image_generation: "Creating slide images",
  voice_generation: "Creating voiceover",
  render_manifest: "Preparing render plan",
  rendering: "Rendering MP4",
  completed: "Complete",
  failed: "Failed",
};

export const SLIDESHOW_STEP_ORDER: SlideshowJobStep[] = [
  "queued",
  "normalizing",
  "planning",
  "scripting",
  "image_briefing",
  "prompt_enhancing",
  "image_generation",
  "voice_generation",
  "render_manifest",
  "rendering",
  "completed",
];

export function getSlideshowStepLabel(step?: string | null) {
  if (!step) {
    return "Unknown step";
  }

  if (isKnownSlideshowStep(step)) {
    return SLIDESHOW_STEP_LABELS[step];
  }

  return humanizeStep(step);
}

export function isKnownSlideshowStep(
  step: string,
): step is SlideshowJobStep {
  return step in SLIDESHOW_STEP_LABELS;
}

function humanizeStep(step: string) {
  return step
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

