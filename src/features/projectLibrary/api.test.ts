import { getProjectLibrary } from "./api";
import type { LibraryProject, ProjectLibraryResponse } from "./types";

const legacyProject: LibraryProject = {
  id: "historical-project",
  title: "Untitled video",
  status: "pending",
  display_status: "Ready to start",
  provider: "manual",
  workflow: "manual",
  paused: false,
  progress: { scene_count: 0, accepted_count: 0, percent: 0 },
  storage: { state: "local", label: "Local", archive_percent: 0 },
  next_action: { type: "none", label: "View Details", message: "", background: false },
  created_at: null,
  updated_at: null,
  thumbnail_url: null,
  video_url: null,
  duration_seconds: null,
  aspect_ratio: null,
  next_automatic_at: null,
  eligibility_estimated: false,
  acceptance_type: null,
};
const emptyPage: ProjectLibraryResponse = {
  api_version: "scene-video-library.v1",
  projects: [],
  page: { limit: 40, has_more: false, next_cursor: null },
  sort: "recent",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("project library API", () => {
  it("reads the default empty page without production submissions", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(emptyPage));
    await expect(getProjectLibrary(undefined, { baseUrl: "http://api.test", fetchFn: fetchMock })).resolves.toEqual(emptyPage);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/scene-video-library", expect.objectContaining({ method: "GET", body: undefined }));
  });

  it.each([true, false])("encodes combined filters and paused=%s without losing literal search or cursor text", async paused => {
    const fetchMock = vi.fn().mockResolvedValue(response(emptyPage));
    const search = "Title & topic + [literal] / #42";
    const cursor = "opaque/+query=bound";
    await getProjectLibrary({ q: search, status: "awaiting_human_decision", provider: "flow_web", workflow: "flow_supervised", paused, sort: "name", limit: 100, cursor }, { baseUrl: "http://api.test", fetchFn: fetchMock });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/scene-video-library");
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: search, status: "awaiting_human_decision", provider: "flow_web", workflow: "flow_supervised", paused: String(paused), sort: "name", limit: "100", cursor });
  });

  it("preserves nullable historical fields and server-owned status, storage and action fields", async () => {
    const page: ProjectLibraryResponse = { ...emptyPage, projects: [legacyProject, { ...legacyProject, id: "gemini-paused", provider: "gemini_web", workflow: "gemini_autopilot", paused: true, status: "failed", display_status: "Needs attention", storage: { state: "restore_failed", label: "Restore needs attention", archive_percent: 24 }, next_action: { type: "resume_production", label: "Resume Production", message: "Review the saved state", background: false, scene_order: 2, attempt: 1 }, next_automatic_at: "2026-10-17T11:00:00Z", eligibility_estimated: true }] };
    const fetchMock = vi.fn().mockResolvedValue(response(page));
    await expect(getProjectLibrary({}, { fetchFn: fetchMock })).resolves.toEqual(page);
  });

  it("returns opaque next-page metadata for continuation with the same query", async () => {
    const first: ProjectLibraryResponse = { ...emptyPage, sort: "created", page: { limit: 1, has_more: true, next_cursor: "saved.continuation" }, projects: [legacyProject] };
    const fetchMock = vi.fn().mockResolvedValueOnce(response(first)).mockResolvedValueOnce(response({ ...emptyPage, sort: "created", page: { ...emptyPage.page, limit: 1 } }));
    const client = { baseUrl: "http://api.test", fetchFn: fetchMock };
    const page = await getProjectLibrary({ sort: "created", limit: 1 }, client);
    await getProjectLibrary({ sort: "created", limit: 1, cursor: page.page.next_cursor! }, client);
    const continuation = new URL(fetchMock.mock.calls[1][0]);
    expect(continuation.searchParams.get("cursor")).toBe("saved.continuation");
    expect(continuation.searchParams.get("sort")).toBe("created");
    expect(continuation.searchParams.get("limit")).toBe("1");
  });

  it.each([
    [400, "validation", { error: "limit must be 1-100", code: "invalid_library_query", field: "limit" }],
    [503, "server", { error: "Video library is unavailable", code: "library_unavailable" }],
  ] as const)("preserves predictable %s errors without retrying", async (status, category, body) => {
    const fetchMock = vi.fn().mockResolvedValue(response(body, status));
    await expect(getProjectLibrary({ limit: 0 }, { fetchFn: fetchMock })).rejects.toMatchObject({ status, category, code: body.code, message: body.error, details: body });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("forwards cancellation to the read request", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockResolvedValue(response(emptyPage));
    await getProjectLibrary({}, { fetchFn: fetchMock }, controller.signal);
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ signal: controller.signal, method: "GET" }));
  });
});
