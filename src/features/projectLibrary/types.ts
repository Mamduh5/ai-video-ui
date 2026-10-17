/** Read-only scene-video-library.v1 contracts. Null represents unavailable data. */
export type ProjectStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "awaiting_external_generation"
  | "awaiting_review"
  | "awaiting_human_decision"
  | "conformance_attention_required";

export type ProjectProvider = "flow_web" | "gemini_web" | "manual";
export type ProjectWorkflow =
  | "flow_unattended"
  | "gemini_autopilot"
  | "flow_supervised"
  | "manual"
  | "colab_planning";
export type ProjectLibrarySort = "recent" | "created" | "name";

export interface NextAction {
  type: string;
  label: string;
  message: string;
  scene_order?: number;
  attempt?: number;
  background: boolean;
}

export interface ProjectLibraryQuery {
  q?: string;
  status?: ProjectStatus;
  provider?: ProjectProvider;
  workflow?: ProjectWorkflow;
  paused?: boolean;
  sort?: ProjectLibrarySort;
  /** Server accepts 1..100 and defaults to 40. */
  limit?: number;
  /** Opaque, query-bound continuation returned by page.next_cursor. */
  cursor?: string;
}

export interface LibraryProject {
  id: string;
  title: string;
  /** Persisted machine status; use display_status only for presentation. */
  status: ProjectStatus;
  display_status: string;
  provider: ProjectProvider;
  workflow: ProjectWorkflow;
  paused: boolean;
  progress: { scene_count: number; accepted_count: number; percent: number };
  /** Extensible archive state; unknown states must not imply a safe mutation. */
  storage: { state: string; label: string; archive_percent: number };
  next_action: NextAction;
  created_at: string | null;
  updated_at: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  duration_seconds: number | null;
  aspect_ratio: string | null;
  next_automatic_at: string | null;
  eligibility_estimated: boolean;
  acceptance_type: string | null;
}

export interface ProjectLibraryResponse {
  api_version: "scene-video-library.v1";
  projects: LibraryProject[];
  page: { limit: number; has_more: boolean; next_cursor: string | null };
  sort: ProjectLibrarySort;
}
