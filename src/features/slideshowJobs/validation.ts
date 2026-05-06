import type {
  SlideshowAspectRatio,
  SlideshowJobCreateRequest,
  SlideshowTargetPlatform,
} from "./types";

export type CreateJobFormValues = {
  topic: string;
  audience: string;
  language: string;
  tone: string;
  educational_level: string;
  visual_style: string;
  target_duration_seconds: number;
  slide_count: number;
  aspect_ratio: SlideshowAspectRatio;
  target_platform: SlideshowTargetPlatform;
  subtitles: boolean;
  must_include: string;
  must_avoid: string;
};

export type CreateJobFormErrors = Partial<
  Record<keyof CreateJobFormValues, string>
>;

export interface CreateJobValidationResult {
  errors: CreateJobFormErrors;
  request?: SlideshowJobCreateRequest;
}

const ALLOWED_ASPECT_RATIOS = new Set<SlideshowAspectRatio>(["9:16", "16:9"]);
const ALLOWED_TARGET_PLATFORMS = new Set<SlideshowTargetPlatform>([
  "shorts",
  "youtube",
  "presentation",
  "generic",
]);

export function validateCreateJobForm(
  values: CreateJobFormValues,
): CreateJobValidationResult {
  const errors: CreateJobFormErrors = {};
  const topic = values.topic.trim();
  const audience = values.audience.trim();
  const tone = values.tone.trim();
  const educationalLevel = values.educational_level.trim();
  const visualStyle = values.visual_style.trim();
  const language = values.language.trim();
  const mustInclude = parseTagList(values.must_include);
  const mustAvoid = parseTagList(values.must_avoid);

  if (!topic) {
    errors.topic = "Topic is required.";
  } else if (topic.length < 3) {
    errors.topic = "Topic must be at least 3 characters.";
  } else if (topic.length > 200) {
    errors.topic = "Topic must be 200 characters or fewer.";
  }

  if (audience.length > 160) {
    errors.audience = "Audience must be 160 characters or fewer.";
  }

  if (tone.length > 120) {
    errors.tone = "Tone must be 120 characters or fewer.";
  }

  if (educationalLevel.length > 80) {
    errors.educational_level =
      "Educational level must be 80 characters or fewer.";
  }

  if (visualStyle.length > 200) {
    errors.visual_style = "Visual style must be 200 characters or fewer.";
  }

  if (
    !Number.isFinite(values.target_duration_seconds) ||
    values.target_duration_seconds < 45 ||
    values.target_duration_seconds > 150
  ) {
    errors.target_duration_seconds =
      "Duration must be between 45 and 150 seconds.";
  }

  if (
    !Number.isInteger(values.slide_count) ||
    values.slide_count < 4 ||
    values.slide_count > 12
  ) {
    errors.slide_count = "Slide count must be between 4 and 12.";
  }

  if (!ALLOWED_ASPECT_RATIOS.has(values.aspect_ratio)) {
    errors.aspect_ratio = "Choose a supported aspect ratio.";
  }

  if (!ALLOWED_TARGET_PLATFORMS.has(values.target_platform)) {
    errors.target_platform = "Choose a supported target platform.";
  }

  const includeError = validateTags(mustInclude, "Must-include");
  if (includeError) {
    errors.must_include = includeError;
  }

  const avoidError = validateTags(mustAvoid, "Must-avoid");
  if (avoidError) {
    errors.must_avoid = avoidError;
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    errors,
    request: {
      topic,
      audience,
      language: language || "en",
      tone,
      educational_level: educationalLevel,
      visual_style: visualStyle,
      target_duration_seconds: values.target_duration_seconds,
      slide_count: values.slide_count,
      aspect_ratio: values.aspect_ratio,
      target_platform: values.target_platform,
      subtitles: values.subtitles,
      must_include: mustInclude,
      must_avoid: mustAvoid,
    },
  };
}

export function parseTagList(value: string) {
  return value
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function validateTags(tags: string[], label: string) {
  if (tags.length > 12) {
    return `${label} can include up to 12 entries.`;
  }

  const longTag = tags.find((tag) => tag.length > 80);
  if (longTag) {
    return `${label} entries must be 80 characters or fewer.`;
  }

  return undefined;
}

