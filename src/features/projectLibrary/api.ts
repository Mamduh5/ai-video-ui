import { apiJson, type ApiClientOptions } from "../../lib/apiClient";
import type { ProjectLibraryQuery, ProjectLibraryResponse } from "./types";

/** Reads the additive library API. This function never submits production work. */
export function getProjectLibrary(
  query: ProjectLibraryQuery = {},
  clientOptions?: ApiClientOptions,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  for (const key of ["q", "status", "provider", "workflow", "paused", "sort", "limit", "cursor"] as const) {
    const value = query[key];
    if (value !== undefined) params.set(key, String(value));
  }
  const search = params.toString();
  return apiJson<ProjectLibraryResponse>(
    `/scene-video-library${search ? `?${search}` : ""}`,
    { signal },
    clientOptions,
  );
}
