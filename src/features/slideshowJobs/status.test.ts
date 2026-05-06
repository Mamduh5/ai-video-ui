import { getSlideshowStepLabel } from "./status";

describe("slideshow status helpers", () => {
  it.each([
    ["queued", "Queued"],
    ["normalizing", "Preparing brief"],
    ["planning", "Building outline"],
    ["scripting", "Writing narration"],
    ["image_briefing", "Planning visuals"],
    ["prompt_enhancing", "Preparing image prompts"],
    ["image_generation", "Creating slide images"],
    ["voice_generation", "Creating voiceover"],
    ["render_manifest", "Preparing render plan"],
    ["rendering", "Rendering MP4"],
    ["completed", "Complete"],
    ["failed", "Failed"],
  ])("maps %s to %s", (step, label) => {
    expect(getSlideshowStepLabel(step)).toBe(label);
  });

  it("humanizes unknown steps", () => {
    expect(getSlideshowStepLabel("quality_check")).toBe("Quality Check");
  });

  it("handles missing steps", () => {
    expect(getSlideshowStepLabel(null)).toBe("Unknown step");
  });
});

