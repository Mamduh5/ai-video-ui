import type { ApiClientError, ApiErrorCategory } from "../../lib/apiClient";

export type SlideshowAspectRatio = "9:16" | "16:9";

export type SlideshowTargetPlatform =
  | "shorts"
  | "youtube"
  | "presentation"
  | "generic";

export type SlideshowJobCreateRequest = {
  topic: string;
  audience?: string;
  tone?: string;
  language?: string;
  educational_level?: string;
  visual_style?: string;
  target_duration_seconds?: number;
  slide_count?: number;
  aspect_ratio?: SlideshowAspectRatio;
  target_platform?: SlideshowTargetPlatform;
  subtitles?: boolean;
  must_include?: string[];
  must_avoid?: string[];
};

export type SlideshowJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type SlideshowJobStep =
  | "queued"
  | "normalizing"
  | "planning"
  | "scripting"
  | "image_briefing"
  | "prompt_enhancing"
  | "image_generation"
  | "voice_generation"
  | "render_manifest"
  | "rendering"
  | "completed"
  | "failed";

export interface SlideshowJobCreateResponse {
  id: string;
  status: SlideshowJobStatus;
  current_step?: SlideshowJobStep | string | null;
  created_at?: string;
  job?: SlideshowJobDetail;
}

export interface SlideshowJobDetail {
  id: string;
  status: SlideshowJobStatus;
  current_step?: SlideshowJobStep | string | null;
  progress?: SlideshowJobProgress | null;
  topic?: string;
  audience?: string | null;
  tone?: string | null;
  language?: string | null;
  educational_level?: string | null;
  visual_style?: string | null;
  target_duration_seconds?: number | null;
  slide_count?: number | null;
  aspect_ratio?: SlideshowAspectRatio | string | null;
  target_platform?: SlideshowTargetPlatform | string | null;
  subtitles?: boolean | null;
  request?: SlideshowJobCreateRequest | Record<string, unknown>;
  slides?: SlideshowSlideSummary[];
  artifacts?: SlideshowArtifactAvailability;
  created_at?: string;
  updated_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  failed_at?: string | null;
  error?: SlideshowJobBackendError | null;
}

export interface SlideshowJobProgress {
  step?: SlideshowJobStep | string | null;
  label?: string | null;
  completed_steps?: Array<SlideshowJobStep | string>;
  total_steps?: number | null;
  current_index?: number | null;
  percent?: number | null;
}

export interface SlideshowSlideSummary {
  order: number;
  title?: string | null;
  caption?: string | null;
  narration?: string | null;
  prompt?: string | null;
  image_prompt?: string | null;
  image_url?: string | null;
  artifacts?: {
    image?: boolean;
    prompt?: boolean;
  };
}

export interface SlideshowArtifactAvailability {
  brief?: boolean;
  plan?: boolean;
  script?: boolean;
  slide_prompts?: boolean;
  slide_images?: boolean;
  voice?: boolean;
  render_manifest?: boolean;
  video?: boolean;
}

export type SlideshowArtifactRef =
  | { type: "brief" }
  | { type: "plan" }
  | { type: "script" }
  | { type: "slide_image"; order: number }
  | { type: "slide_prompt"; order: number }
  | { type: "voice" }
  | { type: "render_manifest" }
  | { type: "video" };

export interface SlideshowArtifactUrl {
  jobId: string;
  artifact: SlideshowArtifactRef;
  url: string;
}

export interface SlideshowJobBackendError {
  message: string;
  code?: string;
  step?: SlideshowJobStep | string;
  details?: unknown;
}

export interface SlideshowValidationError {
  message: string;
  fields?: Record<string, string[] | string>;
  details?: unknown;
}

export type SlideshowApiError = ApiClientError & {
  category: ApiErrorCategory;
};

