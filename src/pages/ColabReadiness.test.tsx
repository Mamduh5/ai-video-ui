import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { apiJson } from "../lib/apiClient";
import { ColabPlanningPanel } from "./ColabPlanningPanel";
import { ColabCreationReadiness } from "./ColabReadiness";
import { describeColabStatus, type ColabStatus } from "./useColabReadiness";
import { CreateSceneVideoPage } from "./NewVideoPage";
import { SceneVideoPage } from "./SceneVideoPage";

vi.mock("../lib/apiClient", async original => ({ ...await original<typeof import("../lib/apiClient")>(), apiJson: vi.fn() }));
beforeEach(() => { vi.mocked(apiJson).mockReset(); });
afterEach(() => vi.useRealTimers());
const now = Date.parse("2026-10-19T03:00:00Z");
const ready: ColabStatus = { mode: "folder", state: "ready", sync_verified: true, gpu_verified: true, model: "Qwen3.5-35B-A3B-Q4_K_M", heartbeat_at: new Date(now).toISOString(), expires_at: new Date(now + 90000).toISOString() };
const waiting = { status: "waiting", auto_exchange: true, request: { request_id: "request-uuid", revision: 2 } };
function freshStatus(): ColabStatus { return { ...ready, heartbeat_at: new Date().toISOString(), expires_at: new Date(Date.now() + 90000).toISOString() }; }

it.each([
  ["unconfigured", "Drive exchange not configured"],
  ["sync_unverified", "Drive synchronization not verified"],
  ["session_stale", "Colab session not responding"],
  ["model_loading", "Qwen model loading"],
  ["ready", "Qwen planner ready"],
  ["processing", "Storyboard processing"],
  ["failed", "Planning failed"],
  ["stopped", "Colab planner stopped"],
])("explains %s from current backend evidence", (state, label) => {
  expect(describeColabStatus({ ...ready, state, next_action: "One next action" }, now)).toMatchObject({ label, nextAction: "One next action" });
});

it.each([
  [{ expires_at: new Date(now - 1).toISOString() }, "session_stale"],
  [{ heartbeat_at: undefined }, "session_stale"],
  [{ expires_at: undefined }, "session_stale"],
  [{ sync_verified: false }, "sync_unverified"],
  [{ gpu_verified: false }, "model_loading"],
])("never reports automatic readiness without live complete evidence", (override, state) => {
  expect(describeColabStatus({ ...ready, ...override }, now)).toMatchObject({ automatic: false, state });
});

it("collapses manual JSON controls only while the exchange is healthy", async () => {
  vi.mocked(apiJson).mockResolvedValue(freshStatus());
  render(<ColabPlanningPanel id="job" planning={waiting} onChanged={vi.fn()}/>);
  expect(await screen.findByText("Qwen planner ready")).toBeVisible();
  const recovery = screen.getByText("Recovery / manual JSON transfer").closest("details");
  expect(recovery).not.toHaveAttribute("open");
  expect(screen.getByLabelText("Completed Colab result JSON")).not.toBeVisible();
  await userEvent.click(screen.getByText("Recovery / manual JSON transfer"));
  expect(screen.getByLabelText("Completed Colab result JSON")).toBeVisible();
  expect(apiJson).toHaveBeenCalledWith("/colab/status");
  expect(vi.mocked(apiJson).mock.calls.every(([, options]) => !options)).toBe(true);
});

it("expires readiness locally when Colab stops responding", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.mocked(apiJson).mockResolvedValue({ ...ready, expires_at: new Date(now + 2000).toISOString() });
  render(<ColabCreationReadiness/>);
  await act(async () => { await Promise.resolve(); });
  expect(screen.getByText("Qwen planner ready")).toBeVisible();
  await act(async () => { await vi.advanceTimersByTimeAsync(2001); });
  expect(screen.getByText("Colab session not responding")).toBeVisible();
  expect(screen.queryByText("Qwen planner ready")).not.toBeInTheDocument();
});

it("invalidates previously healthy evidence after a failed status refresh", async () => {
  vi.useFakeTimers(); vi.setSystemTime(now);
  vi.mocked(apiJson).mockResolvedValueOnce(ready).mockRejectedValue(new Error("Offline"));
  render(<ColabPlanningPanel id="job" planning={waiting} onChanged={vi.fn()}/>);
  await act(async () => { await Promise.resolve(); });
  expect(screen.getByText("Qwen planner ready")).toBeVisible();
  await act(async () => { await vi.advanceTimersByTimeAsync(5001); });
  expect(screen.getByText("Colab readiness unavailable")).toBeVisible();
  expect(screen.getByText("Recovery / manual JSON transfer").closest("details")).toHaveAttribute("open");
});

it("keeps manual recovery available when the readiness endpoint is unavailable", async () => {
  vi.mocked(apiJson).mockRejectedValue(new Error("Endpoint unavailable"));
  render(<ColabPlanningPanel id="job" planning={waiting} onChanged={vi.fn()}/>);
  expect(await screen.findByText("Colab readiness unavailable")).toBeVisible();
  expect(screen.getByLabelText("Completed Colab result JSON")).toBeVisible();
  expect(screen.getByRole("link", { name: "Export request for manual transfer" })).toBeVisible();
});

it("keeps Colab readiness outside Gemini creation", async () => {
  vi.mocked(apiJson).mockResolvedValue({ standard_available: true, gemini_available: true, scene_seconds: 8 });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/?workflow=gemini_web"]}><CreateSceneVideoPage/></MemoryRouter></QueryClientProvider>);
  await screen.findByRole("button", { name: "Add to Gemini Queue" });
  expect(screen.queryByLabelText("Colab readiness")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Storyboard planner")).not.toBeInTheDocument();
  expect(vi.mocked(apiJson).mock.calls.some(([path]) => path === "/colab/status")).toBe(false);
});

it("displays an automatically imported storyboard through read-only project polling", async () => {
  let reads = 0;
  const job = { id: "job", title: "Automatic Qwen plan", status: "awaiting_colab_planning", current_step: "planning", generation_provider: "flow_web", review_policy: "human_only", scene_count: 1, colab_planning: waiting, next_action: { type: "colab_planning", label: "Waiting", message: "Waiting for storyboard" } };
  vi.mocked(apiJson).mockImplementation(async path => {
    if (path === "/colab/status") return freshStatus();
    if (path !== "/scene-video-jobs/job") return {};
    if (++reads === 1) return job;
    return { ...job, status: "awaiting_external_generation", current_step: "awaiting_external_generation", colab_planning: { ...waiting, status: "imported" }, next_action: { type: "start_production", label: "Start Production", message: "Review your storyboard" }, scenes: [{ order: 1, status: "waiting", generation_request: { story_beat: "Qwen opens the workshop", action: "Robot enters the workshop", duration_seconds: 8 } }] };
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
  const view = render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/scene-jobs/job"]}><Routes><Route path="/scene-jobs/:jobId" element={<SceneVideoPage/>}/></Routes></MemoryRouter></QueryClientProvider>);
  await screen.findByText("Qwen planner ready");
  await waitFor(() => expect(screen.getByText("Storyboard imported")).toBeVisible(), { timeout: 4000 });
  expect(screen.getByText("1. Qwen opens the workshop")).toBeVisible();
  expect(screen.getByRole("button", { name: "Start Production" })).toBeVisible();
  expect(vi.mocked(apiJson).mock.calls.every(([, options]) => !options)).toBe(true);
  view.unmount(); client.clear();
});

it("explains that unattended import preserves the separate credit and queue controls", async () => {
  vi.mocked(apiJson).mockResolvedValue(freshStatus());
  render(<ColabPlanningPanel id="job" planning={{ ...waiting, status: "imported" }} unattended onChanged={vi.fn()}/>);
  expect(screen.getByText(/Flow generation still requires batch credit authorization and Resume Flow queue/)).toBeVisible();
  expect(screen.queryByRole("button", { name: /Start Production|Resume Flow queue/ })).not.toBeInTheDocument();
});
it("never shows Ready before the first readiness response arrives", () => {
  vi.mocked(apiJson).mockImplementation(() => new Promise(() => {}));
  render(<ColabCreationReadiness/>);
  expect(screen.getByText("Checking Colab planner")).toBeVisible();
  expect(screen.queryByText("Qwen planner ready")).not.toBeInTheDocument();
  expect(describeColabStatus(null, now)).toMatchObject({ state: "checking", automatic: false });
});

it("shows notebook failure evidence and the backend recovery action", async () => {
  vi.mocked(apiJson).mockResolvedValue({ ...freshStatus(), state: "failed", error: "GPU inference check failed", next_action: "Reconnect a GPU runtime and run Start Flow Planner." });
  render(<ColabPlanningPanel id="job" planning={waiting} onChanged={vi.fn()}/>);
  expect(await screen.findByRole("alert")).toHaveTextContent("GPU inference check failed");
  expect(screen.getByText("Planning failed")).toBeVisible();
  expect(screen.getByText("Reconnect a GPU runtime and run Start Flow Planner.")).toBeVisible();
  expect(screen.getByText("Recovery / manual JSON transfer").closest("details")).toHaveAttribute("open");
  expect(screen.queryByText("Qwen planner ready")).not.toBeInTheDocument();
});
it("preserves a selected recovery file while synchronization becomes healthy", async () => {
  vi.useFakeTimers(); vi.setSystemTime(now);
  vi.mocked(apiJson).mockResolvedValueOnce({ ...ready, state: "sync_unverified", sync_verified: false }).mockResolvedValue(ready);
  render(<ColabPlanningPanel id="job" planning={waiting} onChanged={vi.fn()}/>);
  await act(async () => { await Promise.resolve(); });
  const input = screen.getByLabelText("Completed Colab result JSON") as HTMLInputElement;
  const file = new File(['{"complete":true}'], "result.json", { type: "application/json" });
  fireEvent.change(input, { target: { files: [file] } });
  await act(async () => { await vi.advanceTimersByTimeAsync(5001); });
  expect(screen.getByText("Qwen planner ready")).toBeVisible();
  expect(screen.getByLabelText("Completed Colab result JSON")).toBe(input);
  expect(input.files?.[0]).toBe(file);
});
it("keeps legacy requests manual until an explicit new planning request", async () => {
  vi.mocked(apiJson).mockResolvedValue(freshStatus());
  render(<ColabPlanningPanel id="legacy-job" planning={{ status: "waiting", request: { request_id: "historical-request", revision: 1 } }} onChanged={vi.fn()}/>);
  await screen.findByText("Qwen planner ready");
  expect(screen.getByText(/click Create a new planning request to enable automatic planning/)).toBeVisible();
  expect(screen.getByText(/Existing request history is preserved/)).toBeVisible();
  expect(screen.getByText("Recovery / manual JSON transfer").closest("details")).toHaveAttribute("open");
  expect(screen.getByLabelText("Completed Colab result JSON")).toBeVisible();
  expect(screen.queryByText(/This project's current request is exchanged automatically/)).not.toBeInTheDocument();
  expect(vi.mocked(apiJson).mock.calls.every(([, options]) => !options)).toBe(true);
  await userEvent.click(screen.getByText("Request recovery"));
  expect(screen.getByRole("button", { name: "Create a new planning request" })).toBeVisible();
});