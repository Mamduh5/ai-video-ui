import { CREATE_JOB_FORM_DEFAULTS } from "./formDefaults";
import { validateCreateJobForm } from "./validation";

describe("create job validation", () => {
  it("fails when topic is empty", () => {
    const result = validateCreateJobForm({
      ...CREATE_JOB_FORM_DEFAULTS,
      topic: "",
    });

    expect(result.errors.topic).toBe("Topic is required.");
    expect(result.request).toBeUndefined();
  });

  it("fails when topic is too short", () => {
    const result = validateCreateJobForm({
      ...CREATE_JOB_FORM_DEFAULTS,
      topic: "AI",
    });

    expect(result.errors.topic).toBe("Topic must be at least 3 characters.");
  });

  it("fails when slide count is outside bounds", () => {
    const result = validateCreateJobForm({
      ...CREATE_JOB_FORM_DEFAULTS,
      topic: "How photosynthesis works",
      slide_count: 13,
    });

    expect(result.errors.slide_count).toBe("Slide count must be between 4 and 12.");
  });

  it("fails when must-include has too many entries", () => {
    const result = validateCreateJobForm({
      ...CREATE_JOB_FORM_DEFAULTS,
      topic: "How photosynthesis works",
      must_include: Array.from({ length: 13 }, (_, index) => `item ${index}`).join(
        ",",
      ),
    });

    expect(result.errors.must_include).toBe(
      "Must-include can include up to 12 entries.",
    );
  });

  it("passes valid defaulted values and builds request arrays", () => {
    const result = validateCreateJobForm({
      ...CREATE_JOB_FORM_DEFAULTS,
      topic: "How photosynthesis works",
      must_include: "sunlight, leaves\nwater",
      must_avoid: "dense text, watermarks",
    });

    expect(result.errors).toEqual({});
    expect(result.request).toEqual({
      topic: "How photosynthesis works",
      audience: "general viewers",
      language: "en",
      tone: "clear and friendly",
      educational_level: "general",
      visual_style: "clean educational illustration",
      target_duration_seconds: 90,
      slide_count: 8,
      aspect_ratio: "9:16",
      target_platform: "shorts",
      subtitles: true,
      must_include: ["sunlight", "leaves", "water"],
      must_avoid: ["dense text", "watermarks"],
    });
  });
});

