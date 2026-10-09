import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { SceneVideoPage } from "./SceneVideoPage";
import { shouldPollSceneJob } from "./sceneReviewExecution";

afterEach(() => vi.unstubAllGlobals());
const snapshot = {
  id: "production", status: "awaiting_human_decision", current_step: "awaiting_human_decision", generation_provider: "flow_web", audio_policy: "clip_native", reference_mode: "none", review_policy: "ai_assisted",
  production: { mode: "sequential", status: "waiting_human_acceptance", started: true, paused: false, auto_advance_after_accept: true, scene_count: 3, accepted_count: 1, current_scene: 2, flow_submissions: 2, uncertain_submissions: 0,
    scenes: [1, 2, 3].map(order => ({ order, status: order === 1 ? "accepted" : order === 2 ? "awaiting_acceptance" : "waiting", can_generate: false, can_resume_flow: false, flow_submissions: order < 3 ? 1 : 0, uncertain_submissions: 0, attempt_count: order < 3 ? 1 : 0 })) },
  scenes: [1, 2, 3].map(order => ({ order, status: order === 1 ? "accepted" : order === 2 ? "human_decision_required" : "awaiting_external_generation", clip_url: order < 3 ? `/clip-${order}` : undefined, current_attempt: order < 3 ? 1 : undefined,
    generation_request: { story_beat: `Beat ${order}`, visual_description: "Robot", motion_prompt: `Prompt ${order}`, character_continuity: "same robot", environment_continuity: "same workshop", duration_seconds: 8, aspect_ratio: "16:9", generation_attempt: 1 },
    attempts: order < 3 ? [{ attempt: 1, review_runs: [], imported_at: "2026-10-09T00:00:00Z", decision: order === 1 ? "accepted" : undefined, review: { verdict: "pass", summary: "Advisory review", issues: [], checks: {}, retry_recommended: false, retry_prompt_delta: [], frames: [] } }] : [] })),
};
function mount() { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/scene-jobs/production"]}><Routes><Route path="/scene-jobs/:jobId" element={<SceneVideoPage />} /></Routes></MemoryRouter></QueryClientProvider>); }

it("reloads the persisted current scene without any provider/review/decision mutation", async () => {
  const calls: { url: string; method?: string }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => { calls.push({ url, method: init?.method }); return new Response(JSON.stringify(url.includes("readiness") ? { status: "ready" } : snapshot), { headers: { "Content-Type": "application/json" } }); }));
  const first = mount(); expect(await screen.findByText("1 / 3 scenes accepted")).toBeInTheDocument(); expect(screen.getByRole("region", { name: "Production overview" })).toHaveTextContent("Current scene: 2");
  first.unmount(); mount(); expect(await screen.findByText("1 / 3 scenes accepted")).toBeInTheDocument();
  const waiting = screen.getByRole("heading", { name: "Scene 03" }).closest("section")!;
  expect(within(waiting).getByRole("button", { name: "Generate in Flow" })).toBeDisabled();
  expect(within(waiting).getByLabelText("Import generated MP4")).toBeInTheDocument();
  await waitFor(() => expect(calls.length).toBeGreaterThan(1)); expect(calls.every(call => !call.method || call.method === "GET")).toBe(true);
});

it("polling reads active production and never treats acceptance as automatic", () => {
  expect(shouldPollSceneJob(snapshot)).toBe(false);
  expect(shouldPollSceneJob({ ...snapshot, production: { ...snapshot.production, status: "generating" } })).toBe(true);
  expect(shouldPollSceneJob({ ...snapshot, production: { ...snapshot.production, status: "paused", paused: true } })).toBe(false);
});
