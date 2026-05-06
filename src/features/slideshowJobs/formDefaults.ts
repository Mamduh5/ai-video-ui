import type { CreateJobFormValues } from "./validation";

export const CREATE_JOB_FORM_DEFAULTS: CreateJobFormValues = {
  topic: "",
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
  must_include: "",
  must_avoid: "",
};

