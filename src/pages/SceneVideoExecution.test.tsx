import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { apiJson } from "../lib/apiClient";
import { SceneVideoPage } from "./SceneVideoPage";
import { shouldPollSceneJob } from "./sceneReviewExecution";

vi.mock("../lib/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/apiClient")>()), apiJson: vi.fn(),
}));

const run = (status: "queued" | "running" | "failed" | "completed", number = 1) => ({ run_id: `run-${number}`, status, queued_at: "2026-10-02T00:00:00Z", retry_count: number - 1, ...(status === "failed" ? { failure: "review provider timed out" } : {}) });
const review = { verdict: "fail" as const, summary: "Creative mismatch", issues: [], checks: {}, retry_recommended: false, retry_prompt_delta: [], frames: [] };
const job = (status: "queued" | "running" | "failed" | "completed") => ({
  id: "r4-job", status: status === "completed" ? "awaiting_human_decision" : "awaiting_review", current_step: "reviewing_scene_clip", review_policy: "ai_assisted" as const,
  scenes: [{ order: 1, status: `review_${status}`, current_attempt: 2, clip_url: "/clip", generation_request: { story_beat: "Robot", visual_description: "Robot", motion_prompt: "Turn", character_continuity: "same", environment_continuity: "same", aspect_ratio: "16:9", duration_seconds: 8, generation_attempt: 2 },
    attempts: [{ attempt: 2, imported_at: "2026-10-02T00:00:00Z", review_runs: [run(status)], ...(status === "completed" ? { review } : {}) }],
  }],
});

function renderJob() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
  const result = render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/scene-jobs/r4-job"]}><Routes><Route path="/scene-jobs/:jobId" element={<SceneVideoPage />} /></Routes></MemoryRouter></QueryClientProvider>);
  return { ...result, client };
}

describe("R4 review execution", () => {
  it.each(["queued", "running"] as const)("shows durable %s state with no retry or Accept", async (status) => {
    vi.mocked(apiJson).mockResolvedValue(job(status));
    const view = renderJob();
    expect(await screen.findByText(status === "queued" ? "Queued…" : "Reviewing scene…")).toBeInTheDocument();
    expect(screen.getByText(/You can leave or reload/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept Scene" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry AI review" })).not.toBeInTheDocument();
    view.unmount(); view.client.clear();
  });

  it("reloads running state from GET and polls completion without a provider action", async () => {
    let data = job("running");
    vi.mocked(apiJson).mockImplementation(async () => data);
    const first = renderJob();
    await screen.findByText("Reviewing scene…");
    first.unmount(); first.client.clear();
    const second = renderJob();
    await screen.findByText("Reviewing scene…");
    data = job("completed");
    expect(await screen.findByRole("button", { name: "Accept Scene" }, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getAllByText("Creative mismatch").length).toBeGreaterThan(0);
    expect(vi.mocked(apiJson).mock.calls.every(([path, options]) => path === "/scene-video-jobs/r4-job" && !options)).toBe(true);
    second.unmount(); second.client.clear();
  });

  it("retries the same attempt, shows queueing feedback and retains failed history", async () => {
    let data = job("failed");
    let resolveRetry: (value: unknown) => void = () => {};
    vi.mocked(apiJson).mockImplementation(async (path) => {
      if (path.endsWith("/retry")) {
        await new Promise((resolve) => { resolveRetry = resolve; });
        data = job("queued");
        data.scenes[0].attempts[0].review_runs = [run("failed"), run("queued", 2)];
        return { job: data };
      }
      return data;
    });
    const view = renderJob(); const user = userEvent.setup();
    expect(await screen.findByText("AI review failed")).toBeInTheDocument();
    expect(screen.getByText(/clip and media checks are unchanged/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept Scene" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry AI review" }));
    expect(await screen.findByRole("button", { name: "Queueing AI review…" })).toBeDisabled();
    expect(apiJson).toHaveBeenCalledWith("/scene-video-jobs/r4-job/scenes/1/attempts/2/review/retry", { method: "POST" });
    resolveRetry({});
    await screen.findByText("Queued…");
    await user.click(screen.getByText("Review runs (2)"));
    expect(screen.getByText(/#1 · failed · review provider timed out/)).toBeInTheDocument();
    expect(screen.getByText(/#2 · queued/)).toBeInTheDocument();
    view.unmount(); view.client.clear();
  });

  it("polls only active executions, preserving legacy completed review behavior", async () => {
    expect(shouldPollSceneJob(job("queued"))).toBe(true);
    expect(shouldPollSceneJob(job("running"))).toBe(true);
    expect(shouldPollSceneJob(job("failed"))).toBe(false);
    expect(shouldPollSceneJob(job("completed"))).toBe(false);
    expect(shouldPollSceneJob()).toBe(false);
    const data = job("completed"); data.scenes[0].attempts[0].review_runs = [];
    vi.mocked(apiJson).mockResolvedValue(data);
    const view = renderJob();
    expect(await screen.findByRole("button", { name: "Accept Scene" })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Retry AI review" })).not.toBeInTheDocument());
    view.unmount(); view.client.clear();
  });

  it("renders a reloaded completed PASS with legacy null arrays without a white page", async () => {
    const data = job("completed");
    Object.assign(data.scenes[0].attempts[0].review!, { verdict: "pass", issues: null, retry_prompt_delta: null, frames: null });
    vi.mocked(apiJson).mockResolvedValue(data);
    const view = renderJob();
    expect(await screen.findByRole("button", { name: "Accept Scene" })).toBeInTheDocument();
    expect(screen.getByText("Looks consistent")).toBeInTheDocument();
    view.unmount(); view.client.clear();
  });
});
