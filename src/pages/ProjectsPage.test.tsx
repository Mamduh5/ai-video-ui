import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import type { LibraryProject, ProjectLibraryResponse } from "../features/projectLibrary/types";
import { apiJson } from "../lib/apiClient";
import { ProjectsPage } from "./ProjectsPage";

vi.mock("../lib/apiClient", async original => ({
  ...await original<typeof import("../lib/apiClient")>(),
  apiJson: vi.fn(),
}));

// Large fixtures exercise real React Query and DOM rendering, rather than a mocked hook.
vi.setConfig({ testTimeout: 15_000 });
const clients: QueryClient[] = [];

function project(index: number, overrides: Partial<LibraryProject> = {}): LibraryProject {
  return {
    id: `project-${index}`,
    title: `Robot story ${String(index).padStart(3, "0")}`,
    status: "awaiting_human_decision",
    display_status: "Needs review",
    provider: "flow_web",
    workflow: "flow_supervised",
    paused: false,
    progress: { scene_count: 3, accepted_count: 1, percent: 33 },
    storage: { state: "local", label: "Local", archive_percent: 0 },
    next_action: { type: "review_scene", label: "Review Scene 2", message: "Review the saved clip.", scene_order: 2, background: false },
    created_at: "2026-10-01T10:00:00Z",
    updated_at: "2026-10-17T08:00:00Z",
    thumbnail_url: `/scene-video-jobs/project-${index}/artifacts/thumbnail`,
    video_url: null,
    duration_seconds: 24,
    aspect_ratio: "16:9",
    next_automatic_at: null,
    eligibility_estimated: false,
    acceptance_type: "human",
    ...overrides,
  };
}

function page(projects: LibraryProject[], next: string | null = null, sort: ProjectLibraryResponse["sort"] = "recent"): ProjectLibraryResponse {
  return { api_version: "scene-video-library.v1", projects, page: { limit: 40, has_more: next !== null, next_cursor: next }, sort };
}

function libraryServer(records: LibraryProject[]) {
  vi.mocked(apiJson).mockImplementation(async path => {
    const url = new URL(path, "http://library.test");
    if (url.pathname !== "/scene-video-library") throw new Error(`Unexpected request: ${path}`);
    const params = url.searchParams;
    const search = params.get("q")?.toLocaleLowerCase();
    const matching = records.filter(record =>
      (!search || `${record.title} ${record.id}`.toLocaleLowerCase().includes(search)) &&
      (!params.has("provider") || record.provider === params.get("provider")) &&
      (!params.has("status") || record.status === params.get("status")) &&
      (!params.has("paused") || String(record.paused) === params.get("paused")),
    );
    if (params.get("sort") === "name") matching.sort((a, b) => a.title.localeCompare(b.title));
    if (params.get("sort") === "created") matching.reverse();
    const start = Number(params.get("cursor")?.replace("cursor-", "") ?? 0);
    const limit = Number(params.get("limit") ?? 40);
    const end = start + limit;
    return page(matching.slice(start, end), end < matching.length ? `cursor-${end}` : null, params.get("sort") as ProjectLibraryResponse["sort"] || "recent");
  });
}

function NavigationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><span data-testid="library-location">{location.pathname}{location.search}</span><button onClick={() => navigate(-1)}>History back</button></>;
}

function show(route = "/") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
  clients.push(client);
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[route]}><NavigationProbe /><Routes>
    <Route path="/" element={<ProjectsPage />} />
    <Route path="/scene-jobs/:jobId" element={<section><h1>Project detail fixture</h1><button onClick={() => window.scrollTo(0, 0)}>Detail scroll</button><Link to="/">Projects link</Link></section>} />
  </Routes></MemoryRouter></QueryClientProvider>);
  return client;
}

function requests() {
  return vi.mocked(apiJson).mock.calls.map(([path]) => new URL(path, "http://library.test"));
}

beforeEach(() => {
  vi.mocked(apiJson).mockReset();
  vi.mocked(window.scrollTo).mockClear();
  sessionStorage.clear();
  localStorage.clear();
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
});

afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.clear());
});

it("starts with a compact list and uses only bounded library reads for project summaries", async () => {
  libraryServer([project(1), project(2, { provider: "manual", workflow: "manual", thumbnail_url: null, updated_at: null })]);
  show();
  expect(await screen.findByText("Robot story 001")).toBeVisible();
  expect(screen.getByRole("heading", { name: "Projects" })).toBeVisible();
  expect(screen.getByRole("button", { name: "List view" })).toHaveAttribute("aria-pressed", "true");
  const row = screen.getAllByRole("article", { hidden: true })[0];
  expect(within(row).getByText("Needs review")).toBeVisible();
  expect(within(row).getByText(/1 \/ 3 scenes ready/)).toBeVisible();
  expect(within(row).getByAltText("Robot story 001 preview")).toHaveClass("object-contain");
  expect(within(row).getByRole("link", { name: "Review Scene 2" })).toHaveAttribute("href", "/scene-jobs/project-1");
  expect(screen.getAllByRole("article", { hidden: true })).toHaveLength(2);
  expect(apiJson).toHaveBeenCalledTimes(1);
  expect(requests()[0].pathname).toBe("/scene-video-library");
  expect(requests()[0].searchParams.get("limit")).toBe("40");
  expect(requests()[0].searchParams.get("cursor")).toBeNull();
  expect(vi.mocked(apiJson).mock.calls.every(([, options]) => !options?.method || options.method === "GET")).toBe(true);
});

it("loads a 520-project fixture in explicit cursor batches without numbered pagination or detail prefetches", async () => {
  libraryServer(Array.from({ length: 520 }, (_, index) => project(index)));
  show();
  await screen.findByText("Robot story 039");
  expect(screen.getAllByRole("article", { hidden: true })).toHaveLength(40);
  expect(screen.queryByText("Robot story 040")).not.toBeInTheDocument();
  expect(apiJson).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("navigation", { name: /pages/i })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Load more" }));
  await screen.findByText("Robot story 079");
  expect(screen.getAllByRole("article", { hidden: true })).toHaveLength(80);
  expect(screen.getByText("Robot story 000")).toBeVisible();
  expect(apiJson).toHaveBeenCalledTimes(2);
  expect(requests()[1].searchParams.get("cursor")).toBe("cursor-40");
  expect(requests().every(request => request.pathname === "/scene-video-library")).toBe(true);
});

it("debounces server search and finds a matching project beyond every loaded page", async () => {
  const records = Array.from({ length: 520 }, (_, index) => project(index));
  records[499] = project(499, { title: "Distant crystal [literal]" });
  libraryServer(records);
  show();
  await screen.findByText("Robot story 000");
  const search = screen.getByLabelText("Search projects");
  fireEvent.change(search, { target: { value: "crystal" } });
  fireEvent.change(search, { target: { value: "crystal [" } });
  fireEvent.change(search, { target: { value: "crystal [literal]" } });
  expect(apiJson).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("library-location").textContent).toContain("q=crystal");
  expect(await screen.findByText("Distant crystal [literal]", {}, { timeout: 3_000 })).toBeVisible();
  expect(screen.getAllByRole("article", { hidden: true })).toHaveLength(1);
  expect(apiJson).toHaveBeenCalledTimes(2);
  expect(requests()[1].searchParams.get("q")).toBe("crystal [literal]");
  expect(requests()[1].searchParams.has("cursor")).toBe(false);
  expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
});

it("combines verified provider, status, pause and sort filters while discarding the previous cursor", async () => {
  libraryServer(Array.from({ length: 85 }, (_, index) => project(index, index === 70 ? { provider: "gemini_web", workflow: "gemini_autopilot", status: "failed", paused: true, display_status: "Needs attention" } : {})));
  show();
  await screen.findByText("Robot story 000");
  await userEvent.click(screen.getByRole("button", { name: "Load more" }));
  await screen.findByText("Robot story 079");
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Provider" }), "gemini_web");
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Status" }), "failed");
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Pause state" }), "paused");
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Sort by" }), "name");
  await waitFor(() => expect(requests().at(-1)?.searchParams.get("sort")).toBe("name"));
  const params = requests().at(-1)!.searchParams;
  expect(Object.fromEntries(params)).toMatchObject({ provider: "gemini_web", status: "failed", paused: "true", sort: "name", limit: "40" });
  expect(params.has("cursor")).toBe(false);
  expect(await screen.findByText("Robot story 070")).toBeVisible();
  expect(screen.getAllByRole("article", { hidden: true })).toHaveLength(1);
  expect(screen.queryByText("Robot story 000")).not.toBeInTheDocument();
});

it("restores filter and view controls directly from a library URL", async () => {
  libraryServer([project(7, { provider: "gemini_web", workflow: "gemini_autopilot", status: "failed", paused: true })]);
  show("/?q=Robot&provider=gemini_web&status=failed&paused=true&sort=created&view=grid");
  await screen.findByText("Robot story 007");
  expect(screen.getByLabelText("Search projects")).toHaveValue("Robot");
  expect(screen.getByRole("combobox", { name: "Provider" })).toHaveValue("gemini_web");
  expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("failed");
  expect(screen.getByRole("combobox", { name: "Pause state" })).toHaveValue("paused");
  expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveValue("created");
  expect(screen.getByRole("button", { name: "Grid view" })).toHaveAttribute("aria-pressed", "true");
  expect(requests()[0].searchParams.get("q")).toBe("Robot");
});

it("offers only supported provider, machine status and sort options", async () => {
  libraryServer([]);
  show();
  await screen.findByRole("heading", { name: "Create your first AI video" });
  const values = (name: string) => within(screen.getByRole("combobox", { name })).getAllByRole("option").map(option => (option as HTMLOptionElement).value);
  expect(values("Provider")).toEqual(["all", "flow_web", "gemini_web", "manual"]);
  expect(values("Status")).toEqual(expect.arrayContaining(["all", "pending", "running", "completed", "failed", "awaiting_external_generation", "awaiting_review", "awaiting_human_decision", "conformance_attention_required"]));
  expect(values("Status")).toHaveLength(9);
  expect(values("Sort by")).toEqual(["recent", "created", "name"]);
});

it("shows a clear initial loading state until the summary request resolves", async () => {
  let resolve!: (value: ProjectLibraryResponse) => void;
  vi.mocked(apiJson).mockReturnValue(new Promise<ProjectLibraryResponse>(done => { resolve = done; }));
  show();
  expect(screen.getByRole("status")).toHaveTextContent("Loading projects");
  expect(screen.queryAllByRole("article", { hidden: true })).toHaveLength(0);
  await act(async () => resolve(page([project(1)])));
  expect(await screen.findByText("Robot story 001")).toBeVisible();
});

it("recovers an initial library read error with the explicit retry action", async () => {
  vi.mocked(apiJson).mockRejectedValueOnce(new Error("Library unavailable")).mockResolvedValue(page([project(1)]));
  show();
  expect(await screen.findByRole("heading", { name: "Could not load projects" })).toBeVisible();
  expect(screen.getByRole("alert")).toHaveTextContent("Library unavailable");
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Robot story 001")).toBeVisible();
  expect(apiJson).toHaveBeenCalledTimes(2);
});

it("distinguishes an empty library from a filtered search with no results and clears filters", async () => {
  libraryServer([project(1)]);
  show("/?q=missing&provider=gemini_web&status=failed&paused=true&sort=name");
  expect(await screen.findByRole("heading", { name: "No projects found" })).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Create your first AI video" })).not.toBeInTheDocument();
  await userEvent.click(screen.getAllByRole("button", { name: "Clear filters" }).at(-1)!);
  expect(screen.getByLabelText("Search projects")).toHaveValue("");
  expect(screen.getByRole("combobox", { name: "Provider" })).toHaveValue("all");
  expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("all");
  expect(screen.getByRole("combobox", { name: "Pause state" })).toHaveValue("all");
  expect(await screen.findByText("Robot story 001")).toBeVisible();
  expect(requests().at(-1)!.searchParams.has("q")).toBe(false);
});

it("keeps loaded projects visible after a continuation error and retries the same cursor", async () => {
  vi.mocked(apiJson).mockResolvedValueOnce(page([project(1)], "opaque-next")).mockRejectedValueOnce(new Error("Temporary page failure")).mockResolvedValueOnce(page([project(2)]));
  show();
  await screen.findByText("Robot story 001");
  await userEvent.click(screen.getByRole("button", { name: "Load more" }));
  expect(await screen.findByText("Could not load more projects")).toBeVisible();
  expect(screen.getByText("Robot story 001")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Load more" }));
  expect(await screen.findByText("Robot story 002")).toBeVisible();
  expect(screen.getAllByRole("article", { hidden: true })).toHaveLength(2);
  expect(requests().slice(1).map(request => request.searchParams.get("cursor"))).toEqual(["opaque-next", "opaque-next"]);
});

it("refreshes from the first page rather than replaying the whole loaded cursor chain", async () => {
  libraryServer(Array.from({ length: 85 }, (_, index) => project(index)));
  show();
  await screen.findByText("Robot story 000");
  await userEvent.click(screen.getByRole("button", { name: "Load more" }));
  await screen.findByText("Robot story 079");
  await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
  await waitFor(() => expect(apiJson).toHaveBeenCalledTimes(3));
  expect(requests()[2].searchParams.has("cursor")).toBe(false);
  await waitFor(() => expect(screen.getAllByRole("article", { hidden: true })).toHaveLength(40));
});

it("cancels a superseded summary read and never displays its stale results", async () => {
  let initialSignal: AbortSignal | undefined;
  vi.mocked(apiJson).mockImplementation(async (path, options) => {
    const params = new URL(path, "http://library.test").searchParams;
    if (!params.has("q")) {
      initialSignal = options?.signal;
      return new Promise<ProjectLibraryResponse>((_, reject) => options?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))));
    }
    return page([project(90, { title: "New requested result" })]);
  });
  show();
  await waitFor(() => expect(initialSignal).toBeDefined());
  await userEvent.type(screen.getByLabelText("Search projects"), "requested");
  expect(await screen.findByRole("heading", { name: "New requested result" })).toBeVisible();
  expect(initialSignal?.aborted).toBe(true);
  expect(screen.queryByRole("heading", { name: "Could not load projects" })).not.toBeInTheDocument();
});

it("returns from details with filters, grid preference, loaded pages and scroll position intact", async () => {
  libraryServer(Array.from({ length: 85 }, (_, index) => project(index)));
  show("/?q=Robot&provider=flow_web&sort=name&view=grid");
  await screen.findByText("Robot story 000");
  await userEvent.click(screen.getByRole("button", { name: "Load more" }));
  await screen.findByText("Robot story 079");
  Object.defineProperty(window, "scrollY", { configurable: true, value: 640 });
  fireEvent.scroll(window);
  await userEvent.click(within(screen.getAllByRole("article", { hidden: true })[0]).getByRole("link", { name: "Review Scene 2" }));
  expect(await screen.findByRole("heading", { name: "Project detail fixture" })).toBeVisible();
  vi.mocked(window.scrollTo).mockClear();
  await userEvent.click(screen.getByRole("button", { name: "History back" }));
  expect(await screen.findByText("Robot story 079")).toBeVisible();
  expect(screen.getByLabelText("Search projects")).toHaveValue("Robot");
  expect(screen.getByRole("combobox", { name: "Provider" })).toHaveValue("flow_web");
  expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveValue("name");
  expect(screen.getByRole("button", { name: "Grid view" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getAllByRole("article", { hidden: true })).toHaveLength(80);
  expect(apiJson).toHaveBeenCalledTimes(2);
  await waitFor(() => expect(vi.mocked(window.scrollTo).mock.calls.some(call => { const [first, second] = call as unknown as [number | ScrollToOptions, number | undefined]; return (typeof first === "object" ? first.top : second) === 640; })).toBe(true));
});

it("uses browser history for filter changes and supports keyboard view switching without extra reads", async () => {
  libraryServer([project(1), project(2, { provider: "gemini_web", workflow: "gemini_autopilot" })]);
  show();
  await screen.findByText("Robot story 001");
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Provider" }), "gemini_web");
  await screen.findByText("Robot story 002");
  expect(screen.getAllByRole("article", { hidden: true })).toHaveLength(1);
  await userEvent.click(screen.getByRole("button", { name: "History back" }));
  await waitFor(() => expect(screen.getAllByRole("article", { hidden: true })).toHaveLength(2));
  expect(screen.getByRole("combobox", { name: "Provider" })).toHaveValue("all");
  const count = vi.mocked(apiJson).mock.calls.length;
  const grid = screen.getByRole("button", { name: "Grid view" });
  grid.focus();
  await userEvent.keyboard("{Enter}");
  expect(grid).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByTestId("library-location").textContent).toContain("view=grid");
  expect(apiJson).toHaveBeenCalledTimes(count);
  const list = screen.getByRole("button", { name: "List view" });
  list.focus();
  await userEvent.keyboard(" ");
  expect(list).toHaveAttribute("aria-pressed", "true");
});

it("renders server-owned archived and failed recovery actions while keeping creative acceptance explicit", async () => {
  libraryServer([
    project(1, { title: "Archived story", storage: { state: "archived", label: "Archived", archive_percent: 100 }, thumbnail_url: null, next_action: { type: "restore_media", label: "Restore media", message: "Restore before viewing.", background: false } }),
    project(2, { title: "Gemini result", provider: "gemini_web", workflow: "gemini_autopilot", status: "completed", display_status: "Completed by Gemini Autopilot", acceptance_type: "autopilot", progress: { scene_count: 3, accepted_count: 3, percent: 100 }, next_action: { type: "watch_final_video", label: "Watch Final Video", message: "", background: false } }),
    project(3, { title: "Failed project", status: "failed", display_status: "Needs attention", next_action: { type: "resolve_flow_attention", label: "Resolve Flow Attention", message: "Check the previous submission.", background: false } }),
  ]);
  show();
  await screen.findByRole("heading", { name: "Archived story" });
  const rows = screen.getAllByRole("article", { hidden: true });
  expect(within(rows[0]).getByText("Archived")).toBeVisible();
  expect(within(rows[0]).getByRole("link", { name: "Restore media" })).toHaveAttribute("href", "/scene-jobs/project-1");
  expect(within(rows[0]).queryByRole("img")).not.toBeInTheDocument();
  expect(within(rows[1]).getByText(/creative quality not human reviewed/i)).toBeVisible();
  expect(within(rows[1]).getByText("Completed by Gemini Autopilot")).toBeVisible();
  expect(within(rows[2]).getByRole("link", { name: "Resolve Flow Attention" })).toHaveAttribute("href", "/scene-jobs/project-3");
  expect(apiJson).toHaveBeenCalledTimes(1);
});


it("restores an older multi-page cache through filter history without replaying its cursor chain", async () => {
  libraryServer(Array.from({ length: 85 }, (_, index) => project(index)));
  const client = show();
  await screen.findByText("Robot story 000");
  await userEvent.click(screen.getByRole("button", { name: "Load more" }));
  await screen.findByText("Robot story 079");
  const cached = client.getQueryCache().find({ queryKey: ["projectLibrary"], exact: false })!;
  act(() => { client.setQueryData(cached.queryKey, cached.state.data, { updatedAt: Date.now() - 60_000 }); });
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Provider" }), "gemini_web");
  await screen.findByRole("heading", { name: "No projects found" });
  await userEvent.click(screen.getByRole("button", { name: "History back" }));
  await screen.findByText("Robot story 079");
  expect(screen.getAllByRole("article", { hidden: true })).toHaveLength(80);
  expect(screen.getByRole("combobox", { name: "Provider" })).toHaveValue("all");
  expect(apiJson).toHaveBeenCalledTimes(3);
  expect(requests().map(request => request.searchParams.get("cursor"))).toEqual([null, "cursor-40", null]);
});

it("preserves legacy fallbacks, active progress and uploading archive percentages", async () => {
  libraryServer([
    project(1, { title: "Legacy record", thumbnail_url: null, updated_at: null, duration_seconds: null, aspect_ratio: null, progress: { scene_count: 0, accepted_count: 0, percent: 0 }, next_action: { type: "none", label: "", message: "", background: false } }),
    project(2, { title: "Working story", status: "running", display_status: "Generating scene 2", paused: true, storage: { state: "uploading", label: "Archiving", archive_percent: 47 }, next_action: { type: "wait", label: "Generate", message: "Already running.", background: true } }),
  ]);
  show();
  await screen.findByText("Legacy record");
  const rows = screen.getAllByRole("article", { hidden: true });
  expect(within(rows[0]).getByLabelText("Video preview unavailable")).toBeInTheDocument();
  expect(within(rows[0]).getByText("Update unavailable")).toBeVisible();
  expect(within(rows[0]).getByRole("link", { name: "View Details" })).toHaveAttribute("href", "/scene-jobs/project-1");
  expect(within(rows[1]).getByText("Generating scene 2")).toBeVisible();
  expect(within(rows[1]).getByText("Paused")).toBeVisible();
  expect(within(rows[1]).getByText("Archiving 47%")).toBeVisible();
  expect(within(rows[1]).getByRole("link", { name: "View Progress" })).toHaveAttribute("href", "/scene-jobs/project-2");
  fireEvent.error(screen.getByAltText("Working story preview"));
  expect(within(rows[1]).getByLabelText("Video preview unavailable")).toBeInTheDocument();
  expect(apiJson).toHaveBeenCalledTimes(1);
});


it("restores history scroll only after the restored search has finished debouncing", async () => {
  libraryServer([project(1), project(2, { title: "Crystal galaxy", provider: "gemini_web", workflow: "gemini_autopilot" })]);
  show("/?q=Robot");
  await screen.findByText("Robot story 001");
  Object.defineProperty(window, "scrollY", { configurable: true, value: 640 });
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Provider" }), "gemini_web");
  await screen.findByRole("heading", { name: "No projects found" });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  fireEvent.change(screen.getByLabelText("Search projects"), { target: { value: "Crystal" } });
  await screen.findByText("Crystal galaxy");
  vi.mocked(window.scrollTo).mockClear();
  await userEvent.click(screen.getByRole("button", { name: "History back" }));
  expect(screen.getByLabelText("Search projects")).toHaveValue("Robot");
  const restored640 = () => vi.mocked(window.scrollTo).mock.calls.some(call => { const [first, second] = call as unknown as [number | ScrollToOptions, number | undefined]; return (typeof first === "object" ? first.top : second) === 640; });
  expect(restored640()).toBe(false);
  await screen.findByText("Robot story 001");
  await waitFor(() => expect(restored640()).toBe(true));
});
