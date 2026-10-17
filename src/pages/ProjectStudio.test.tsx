import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { apiJson } from "../lib/apiClient";
import { locationKey } from "../features/projectLibrary/presentation";
import { SceneVideoPage } from "./SceneVideoPage";
import { SceneTimelineStrip } from "./ProjectStudio";
import type { Attempt, Scene, SceneJob } from "./sceneVideoTypes";

vi.mock("../lib/apiClient", async original => ({
  ...await original<typeof import("../lib/apiClient")>(), apiJson: vi.fn(),
}));

const clients: QueryClient[] = [];
beforeEach(() => {
  vi.mocked(apiJson).mockReset();
  sessionStorage.clear();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.clear());
});

const request: Scene["generation_request"] = {
  story_beat: "Enter the workshop", scene_goal: "Find the crystal", action: "Walk into the workshop",
  entry_state: "Outside", exit_state: "Inside", visual_description: "A robot in its workshop",
  motion_prompt: "Keep the robot and full dialogue", character_continuity: "Same robot",
  environment_continuity: "Same workshop", aspect_ratio: "16:9", duration_seconds: 8, generation_attempt: 1,
};
const reviewedAttempt: Attempt = {
  attempt: 1, imported_at: "2026-10-18T00:00:00Z",
  review: { verdict: "warning", summary: "Lighting shifts near the ending", issues: [], checks: { continuity: "warning" },
    retry_recommended: true, retry_prompt_delta: ["Keep the original lighting"], frames: [] },
  review_runs: [{ run_id: "review-1", status: "completed", queued_at: "2026-10-18T00:00:00Z", retry_count: 0 }],
};
function fixture(patch: Partial<SceneJob> = {}): SceneJob {
  return {
    id: "studio", title: "Crystal workshop", status: "awaiting_human_decision", current_step: "review",
    display_status: "Needs review", generation_provider: "flow_web", review_policy: "ai_assisted",
    continuity_mode: "chained_frames", accepted_count: 0, scene_count: 2, aspect_ratio: "16:9",
    next_action: { type: "review_scene", label: "Review Scene 1", message: "Watch scene one before accepting.", scene_order: 1, background: false },
    production: { mode: "flow_supervised", status: "awaiting_acceptance", started: true, paused: false,
      auto_advance_after_accept: true, scene_count: 2, accepted_count: 0, current_scene: 1,
      flow_submissions: 1, uncertain_submissions: 0,
      scenes: [1, 2].map(order => ({ order, status: order === 1 ? "awaiting_acceptance" : "waiting", can_generate: false,
        can_resume_flow: false, flow_submissions: order === 1 ? 1 : 0, uncertain_submissions: 0, attempt_count: order === 1 ? 1 : 0 })) },
    scenes: [
      { order: 1, status: "human_decision_required", clip_url: "/clips/one.mp4", current_attempt: 1,
        generation_request: request, attempts: [reviewedAttempt] },
      { order: 2, status: "waiting", generation_request: { ...request, story_beat: "Activate the crystal", action: "Lift the crystal" } },
    ], ...patch,
  };
}
const localStorageRecord = { state: "not_requested", artifacts: [] };
function serve(job: SceneJob) {
  vi.mocked(apiJson).mockImplementation(async path => {
    if (path.startsWith("/storage/projects/")) return localStorageRecord;
    if (path.endsWith("/slowdown/exports")) return { exports: [] };
    return job;
  });
}
function show(route = "/scene-jobs/studio") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
  clients.push(client);
  return { client, ...render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[route]}><Routes>
    <Route path="/scene-jobs/:jobId" element={<SceneVideoPage/>}/>
    <Route path="/without-id" element={<SceneVideoPage/>}/>
  </Routes></MemoryRouter></QueryClientProvider>) };
}
function expectReadsOnly() {
  expect(vi.mocked(apiJson).mock.calls.every(([, options]) => !options?.method || options.method === "GET")).toBe(true);
}

it("selects another scene without redirecting the required review or authorizing production", async () => {
  serve(fixture()); show();
  expect(await screen.findByLabelText("Scene 1 video")).toBeVisible();
  expect(screen.getByRole("button", { name: "Regenerate with review corrections" })).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Select scene 2" }));
  expect(screen.getByRole("button", { name: "Select scene 2" })).toHaveAttribute("aria-pressed", "true");
  const inspector = screen.getByLabelText("Action inspector");
  expect(inspector).toHaveTextContent("Watch scene one before accepting.");
  expect(screen.queryByLabelText("Scene 1 video")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Accept Scene" })).not.toBeInTheDocument();
  await userEvent.click(within(inspector).getByRole("button", { name: "Go to Scene 1" }));
  expect(screen.getByLabelText("Scene 1 video")).toBeVisible();
  expect(screen.getByRole("button", { name: "Accept Scene" })).toBeVisible();
  expectReadsOnly();
});

it("preserves selected scenes and the single player during a read-only refresh", async () => {
  serve(fixture()); show();
  await userEvent.click(await screen.findByRole("button", { name: "Select scene 2" }));
  await userEvent.click(screen.getByRole("button", { name: "Refresh project" }));
  await waitFor(() => expect(vi.mocked(apiJson).mock.calls.filter(([path]) => path === "/scene-video-jobs/studio").length).toBeGreaterThan(1));
  expect(screen.getByRole("button", { name: "Select scene 2" })).toHaveAttribute("aria-pressed", "true");
  expectReadsOnly();
});

it("keeps a failed scene decision visible while preserving playback and deliberate retry actions", async () => {
  const job = fixture();
  vi.mocked(apiJson).mockImplementation(async path => {
    if (path === "/scene-video-jobs/studio/scenes/1/accept") throw new Error("Decision could not be saved");
    if (path.startsWith("/storage/projects/")) return localStorageRecord;
    if (path.endsWith("/slowdown/exports")) return { exports: [] };
    return job;
  });
  show();
  await userEvent.click(await screen.findByRole("button", { name: "Accept Scene" }));
  expect(await within(screen.getByLabelText("Action inspector")).findByRole("alert")).toBeVisible();
  expect(screen.getByRole("alert")).toHaveTextContent("Decision could not be saved");
  expect(screen.getByLabelText("Scene 1 video")).toBeVisible();
  expect(screen.getByRole("button", { name: "Accept Scene" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Regenerate" })).toBeEnabled();
  expect(vi.mocked(apiJson).mock.calls.filter(([, options]) => options?.method && options.method !== "GET")).toEqual([
    ["/scene-video-jobs/studio/scenes/1/accept", { method: "POST", body: undefined }],
  ]);
});

it.each(["queued", "running", "paused", "failed", "recovering", "completed"])("keeps Gemini Autopilot %s read-only with no manual approval requirement", async state => {
  const completed = state === "completed";
  serve(fixture({ status: completed ? "completed" : state, display_status: `Gemini ${state}`,
    generation_provider: "gemini_web", autopilot: { provider: "gemini_web", review_status: "not_human_reviewed" },
    video_url: completed ? "/final.mp4" : undefined,
    next_action: { type: completed ? "watch_final_video" : "autopilot", label: "View Gemini queue", message: `Gemini ${state}`, background: !completed },
    diagnostic: state === "failed" || state === "recovering" ? { code: "provider_attention", source: "gemini", stage: "generation", message: "Existing provider run needs attention" } : undefined,
  }));
  show();
  expect(await screen.findByRole("link", { name: "View Gemini queue" })).toHaveAttribute("href", "/gemini-autopilot");
  expect(screen.getByText(/Creative quality has not been human reviewed/)).toBeVisible();
  expect(screen.queryByRole("button", { name: /Accept Scene/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Regenerate$/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Generate in Flow" })).not.toBeInTheDocument();
  if (completed) expect(screen.getByLabelText("Final video video")).toBeVisible();
  expectReadsOnly();
});

it.each(["running", "paused", "failed", "completed"])("retains Flow unattended %s warnings and queue navigation without scene approvals", async state => {
  const base = fixture();
  serve(fixture({ status: state, display_status: `Flow ${state}`, production: { ...base.production!, mode: "flow_unattended", paused: state === "paused" },
    video_url: state === "completed" ? "/final.mp4" : undefined,
    next_action: { type: state === "completed" ? "watch_final_video" : "monitor_flow", label: "View Flow Queue", message: `Flow ${state}`, background: state === "running" },
    scenes: [{ ...base.scenes![0], attempts: [{ ...reviewedAttempt, visual_inspection: { findings: "A sampled frame shows the crystal", evidence: "frame-1" }, quality_warnings: ["Dialogue was not human reviewed"] }] }],
  }));
  show();
  expect(await screen.findByRole("link", { name: "View Flow queue" })).toHaveAttribute("href", "/flow-autopilot");
  expect(screen.getByText(/Technical acceptance is automatic/)).toBeVisible();
  if (state === "completed") await userEvent.click(screen.getByRole("button", { name: "Select scene 1" }));
  expect(screen.getByText("A sampled frame shows the crystal")).toBeVisible();
  expect(screen.getByText("Dialogue was not human reviewed")).toBeVisible();
  expect(screen.queryByRole("button", { name: /Accept Scene/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Regenerate$/ })).not.toBeInTheDocument();
  expectReadsOnly();
});

it("keeps media mismatch separate from creative acceptance in the inspector", async () => {
  const base = fixture();
  serve(fixture({ next_action: { type: "resolve_media_mismatch", label: "Resolve media mismatch", message: "Review the imported format.", scene_order: 1, background: false },
    scenes: [{ ...base.scenes![0], status: "conformance_attention_required", attempts: [{ ...reviewedAttempt,
      conformance_decision: "pending", conformance: { status: "warning", checks: [{ field: "aspect_ratio", status: "warning", expected: "16:9", actual: "9:16" }] } }] }, base.scenes![1]],
  }));
  show();
  expect(await screen.findByRole("button", { name: "Use Anyway" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Generate Again" })).toBeVisible();
  expect(screen.getByText(/It does not accept the scene for final assembly/)).toBeVisible();
  expect(screen.queryByRole("button", { name: "Accept Scene" })).not.toBeInTheDocument();
  expect(screen.getByLabelText("Scene 1 video")).toBeVisible();
  expectReadsOnly();
});

it("keeps an accepted-scene handoff available and locks it once the next scene has a run", async () => {
  const base = fixture();
  const handoffJob = fixture({ next_action: { type: "choose_handoff_frame", label: "Choose Continuity Frame", message: "Choose an ending frame.", scene_order: 1, background: false },
    scenes: [{ ...base.scenes![0], status: "accepted", attempts: [{ ...reviewedAttempt, decision: "accepted", handoff: { frame_index: 1, confirmed: false },
      handoff_frames: [{ index: 1, timestamp_seconds: 7.5, object_key: "handoff.png", sha256: "saved-sha" }] }] }, base.scenes![1]],
  });
  serve(handoffJob); const { client } = show();
  expect(await screen.findByRole("button", { name: "Continue with selected frame" })).toBeVisible();
  const locked = { ...handoffJob, scenes: [handoffJob.scenes![0], { ...handoffJob.scenes![1], flow_runs: [{ run_id: "next-run", status: "queued", submission_intent: false }] }] };
  client.setQueryData(["sceneVideoJob", "studio"], locked);
  await waitFor(() => expect(screen.queryByRole("button", { name: "Continue with selected frame" })).not.toBeInTheDocument());
  expect(screen.getByText(/Saved frame is bound to the next scene/)).toBeVisible();
  expectReadsOnly();
});

it("suppresses stale archived clip URLs and slowdown while exposing explicit restoration", async () => {
  const job = fixture({ status: "completed", video_url: undefined,
    next_action: { type: "restore_local", label: "Restore & Watch", message: "Restore the verified archive to watch locally.", background: false } });
  vi.mocked(apiJson).mockImplementation(async path => path.startsWith("/storage/projects/") ? {
    state: "archived", manifest: { verified: true }, artifacts: [{ role: "final_video", local_object_key: "final.mp4", size: 1024, verified: true, local_removed: true }],
  } : job);
  const { container } = show();
  expect(await screen.findByRole("button", { name: "Restore & Watch" })).toBeVisible();
  expect(screen.getAllByText(/Archived to Google Drive/).length).toBeGreaterThan(0);
  expect(container.querySelector("video")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Calculate duration from source media" })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Select scene 1" }));
  expect(container.querySelector("video")).not.toBeInTheDocument();
  expectReadsOnly();
});

it("preserves saved Projects Library filters in its back link", async () => {
  sessionStorage.setItem(locationKey, "/videos?q=crystal&provider=flow_web&sort=name");
  serve(fixture()); show();
  expect(await screen.findByRole("link", { name: /Projects/ })).toHaveAttribute("href", "/videos?q=crystal&provider=flow_web&sort=name");
});

it("renders loading, empty and failed detail responses without authorizing a mutation", async () => {
  let resolve: (value: unknown) => void = () => {};
  vi.mocked(apiJson).mockImplementation(() => new Promise(done => { resolve = done; }));
  const view = show();
  expect(screen.getByText(/Loading scene-video job/)).toBeInTheDocument();
  resolve(null);
  expect(await screen.findByText("No scene-video job returned.")).toBeInTheDocument();
  view.unmount();
  vi.mocked(apiJson).mockRejectedValue(new Error("Project could not be loaded"));
  show();
  expect(await screen.findByRole("alert")).toHaveTextContent("Project could not be loaded");
  expectReadsOnly();
});

it("does not request a job when the route has no identifier", () => {
  show("/without-id");
  expect(screen.getByText("Scene-video job ID is missing.")).toBeInTheDocument();
  expect(apiJson).not.toHaveBeenCalled();
});

it.each([
  ["ai_review_queued", "In progress"],
  ["ai_review_running", "In progress"],
  ["review_pending", "In progress"],
  ["reviewing", "In progress"],
  ["failed", "Failed"],
  ["awaiting_review", "Review required"],
  ["awaiting_acceptance", "Review required"],
  ["human_decision_required", "Review required"],
  ["accepted", "Completed"],
  ["waiting", "Waiting"],
])("labels timeline status %s as %s", (status, label) => {
  const base = fixture();
  const job = fixture({ next_action: undefined, production: { ...base.production!, scenes: [{ ...base.production!.scenes[0], status }] },
    scenes: [{ ...base.scenes![0], status }] });
  render(<SceneTimelineStrip job={job} selection={1} onSelect={vi.fn()}/>);
  expect(within(screen.getByRole("button", { name: "Select scene 1" })).getByText(label)).toBeInTheDocument();
  expect(apiJson).not.toHaveBeenCalled();
});

it("masks removed scene sources while retaining the local final and whole-final export", async () => {
  const base = fixture();
  const job = fixture({ status: "completed", video_url: "/final.mp4",
    next_action: { type: "watch_final_video", label: "Watch Final Video", message: "Your video is ready.", background: false },
    scenes: [{ ...base.scenes![0], first_frame_url: "/removed-reference.png" }, { ...base.scenes![1], clip_url: "/clips/two.mp4" }],
  });
  const record = { state: "archived", manifest: { verified: true }, artifacts: [
    { role: "scene_clip", scene_order: 1, local_object_key: "clips/one.mp4", size: 1024, verified: true, local_removed: true },
    { role: "reference_image", scene_order: 1, local_object_key: "reference/one.png", size: 256, verified: true, local_removed: true },
    { role: "final_video", local_object_key: "final.mp4", size: 2048, verified: true, local_removed: false },
  ] };
  vi.mocked(apiJson).mockImplementation(async path => {
    if (path.startsWith("/storage/projects/")) return record;
    if (path.endsWith("/slowdown/exports")) return { exports: [] };
    return job;
  });
  show();
  expect(await screen.findByRole("button", { name: "Restore & Watch" })).toBeVisible();
  expect(vi.mocked(apiJson).mock.calls.filter(([path]) => path === "/storage/projects/studio")).toHaveLength(1);
  expect(screen.getByLabelText("Final video video")).toBeVisible();
  expect(screen.getByLabelText("Whole final playback/export speed")).toBeEnabled();
  expect(screen.getByRole("button", { name: "Calculate duration from source media" })).toBeEnabled();
  const firstTile = screen.getByRole("button", { name: "Select scene 1" });
  expect(firstTile.querySelector("img")).not.toBeInTheDocument();
  await userEvent.click(firstTile);
  const stage = screen.getByLabelText("Studio stage");
  expect(stage.querySelector("video")).not.toBeInTheDocument();
  expect(stage).toHaveTextContent(/restor/i);
  expect(screen.queryByRole("button", { name: "Accept Scene" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Regenerate" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Generate in Flow" })).not.toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Individual scenes, then assemble" })).toBeDisabled();
  expect(screen.getByText(/Some source scenes are archived/)).toBeVisible();
  expect(screen.queryByLabelText("Scene 1 playback/export speed")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Whole final playback/export speed")).toBeEnabled();
  await userEvent.click(screen.getByRole("button", { name: "Select final video" }));
  expect(screen.getByLabelText("Final video video")).toBeVisible();
  expectReadsOnly();
});

it("keeps current media available when cleanup removed only historical attempts and review frames", async () => {
  const base = fixture();
  const job = fixture({ status: "completed", video_url: "/final.mp4",
    next_action: { type: "watch_final_video", label: "Watch Final Video", message: "Your video is ready.", background: false },
    scenes: [{ ...base.scenes![0], first_frame_url: "/current-reference.png" }, base.scenes![1]],
  });
  vi.mocked(apiJson).mockImplementation(async path => {
    if (path.startsWith("/storage/projects/")) return { state: "archived", artifacts: [
      { role: "scene_attempt", scene_order: 1, attempt: 0, local_object_key: "historical-attempt.mp4", size: 1024, verified: true, local_removed: true },
      { role: "review_frame", scene_order: 1, attempt: 0, local_object_key: "historical-review.png", size: 128, verified: true, local_removed: true },
      { role: "scene_clip", scene_order: 1, local_object_key: "clips/one.mp4", size: 1024, verified: true, local_removed: false },
      { role: "final_video", local_object_key: "final.mp4", size: 2048, verified: true, local_removed: false },
    ] };
    if (path.endsWith("/slowdown/exports")) return { exports: [] };
    return job;
  });
  show();
  await screen.findByRole("button", { name: "Restore & Watch" });
  expect(vi.mocked(apiJson).mock.calls.filter(([path]) => path === "/storage/projects/studio")).toHaveLength(1);
  expect(screen.getByLabelText("Final video video")).toBeVisible();
  expect(screen.getByRole("button", { name: "Select scene 1" }).querySelector("img")).toHaveAttribute("src", expect.stringContaining("/current-reference.png"));
  await userEvent.click(screen.getByRole("button", { name: "Select scene 1" }));
  expect(screen.getByLabelText("Scene 1 video")).toBeVisible();
  await userEvent.click(screen.getByRole("radio", { name: "Individual scenes, then assemble" }));
  expect(screen.getByLabelText("Scene 1 playback/export speed")).toBeEnabled();
  expectReadsOnly();
});
