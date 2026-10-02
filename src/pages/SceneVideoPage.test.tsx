import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { apiJson } from "../lib/apiClient";
import { CreateSceneVideoPage, SceneVideoPage } from "./SceneVideoPage";

vi.mock("../lib/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/apiClient")>()),
  apiJson: vi.fn(),
}));

describe("manual Flow pages", () => {
  it("creates a separate scene-video job", async () => {
    vi.mocked(apiJson).mockResolvedValueOnce({ job_id: "scene-1" });
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/scene-jobs/create"]}><Routes>
      <Route path="/scene-jobs/create" element={<CreateSceneVideoPage />} />
      <Route path="/scene-jobs/:jobId" element={<p>Created scene job</p>} />
    </Routes></MemoryRouter>);
    await user.type(screen.getByLabelText("Character"), "guide");
    await user.type(screen.getByLabelText("Story topic"), "rain");
    await user.click(screen.getByRole("button", { name: "Create scene-video job" }));
    expect(await screen.findByText("Created scene job")).toBeInTheDocument();
    expect(apiJson).toHaveBeenCalledWith("/scene-video-jobs", { method: "POST", body: { character: "guide", topic: "rain", scene_count: 4, audio_policy: "clip_native", reference_mode: "none", review_policy: "off" } });
  });

  it("submits optional narration and generated-reference choices", async () => {
    vi.mocked(apiJson).mockResolvedValueOnce({ job_id: "scene-2" });
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/scene-jobs/create"]}><Routes>
      <Route path="/scene-jobs/create" element={<CreateSceneVideoPage />} />
      <Route path="/scene-jobs/:jobId" element={<p>Created scene job</p>} />
    </Routes></MemoryRouter>);
    await user.type(screen.getByLabelText("Character"), "guide");
    await user.type(screen.getByLabelText("Story topic"), "rain");
    await user.selectOptions(screen.getByLabelText("Final audio"), "external_narration");
    await user.selectOptions(screen.getByLabelText("Scenes"), "2");
    await user.selectOptions(screen.getByLabelText("Starting reference images"), "provider_generated");
    await user.click(screen.getByRole("button", { name: "Create scene-video job" }));
    expect(await screen.findByText("Created scene job")).toBeInTheDocument();
    expect(apiJson).toHaveBeenCalledWith("/scene-video-jobs", { method: "POST", body: { character: "guide", topic: "rain", scene_count: 2, audio_policy: "external_narration", reference_mode: "provider_generated", review_policy: "off" } });
  });

  it("shows the waiting handoff and scene prompt", async () => {
    vi.mocked(apiJson).mockResolvedValueOnce({
      id: "scene-1", status: "awaiting_external_generation", current_step: "awaiting_external_generation",
      scenes: [{ order: 1, status: "awaiting_external_generation", generation_request: {
        story_beat: "Opening", visual_description: "A rainy hill", image_prompt: "Create a rainy hill", motion_prompt: "Camera pans across the hill", audio_intent: { mode: "clip_native", dialogue: "Look at the rain" }, reference_mode: "none",
        character_continuity: "same guide", environment_continuity: "same hill", aspect_ratio: "9:16",
        duration_seconds: 8, generation_attempt: 1,
      } }],
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/scene-jobs/scene-1"]}><Routes>
      <Route path="/scene-jobs/:jobId" element={<SceneVideoPage />} />
    </Routes></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText(/human action required/i)).toBeInTheDocument();
    expect(screen.getByText("Camera pans across the hill")).toBeInTheDocument();
    expect(screen.getByText("Create a rainy hill")).toBeInTheDocument();
    expect(screen.getByText("Dialogue: Look at the rain")).toBeInTheDocument();
    expect(screen.getByLabelText("Attach reference PNG (optional)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy prompt" })).toBeInTheDocument();
    expect(screen.getByLabelText("Import generated MP4")).toBeInTheDocument();
  });

  it("shows an advisory review, evidence, decision actions, and attempt history", async () => {
    vi.mocked(apiJson).mockResolvedValueOnce({
      id: "scene-r2", status: "awaiting_human_decision", current_step: "awaiting_human_decision", review_policy: "ai_assisted",
      scenes: [{ order: 2, status: "human_decision_required", current_attempt: 2, clip_url: "/clip", generation_request: {
        story_beat: "Crystal", visual_description: "Robot with crystal", motion_prompt: "Keep crystal centered", character_continuity: "same robot", environment_continuity: "same workshop", aspect_ratio: "9:16", duration_seconds: 8, generation_attempt: 2,
      }, attempts: [{ attempt: 1, decision: "regenerate", imported_at: "2026-10-02T00:00:00Z", review: { verdict: "warning", summary: "Prior shift", issues: [], checks: {}, retry_recommended: false, retry_prompt_delta: [], frames: [] } }, { attempt: 2, imported_at: "2026-10-02T00:01:00Z", review: {
        verdict: "warning", summary: "Crystal shifts", issues: [{ category: "prop_continuity", severity: "medium", description: "Crystal moves off pedestal", evidence_frames: [2] }], checks: { character_consistency: "pass", important_prop_consistency: "warning" }, retry_recommended: false, retry_prompt_delta: ["Keep crystal centered"], frames: [{ index: 2, timestamp_seconds: 4 }],
      } }]}],
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/scene-jobs/scene-r2"]}><Routes><Route path="/scene-jobs/:jobId" element={<SceneVideoPage />} /></Routes></MemoryRouter></QueryClientProvider>);
    expect((await screen.findAllByText("Crystal moves off pedestal")).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Accept scene" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Regenerate in Flow" })).toBeInTheDocument();
    expect(screen.getByAltText("Scene 2 evidence frame 2")).toBeInTheDocument();
    expect(screen.getByText(/Attempt 1 clip/)).toBeInTheDocument();
  });

  it("clears the native MP4 selection after import so the same clip can be selected again", async () => {
    vi.mocked(apiJson).mockResolvedValue({
      id: "scene-repeat", status: "awaiting_external_generation", current_step: "awaiting_external_generation", review_policy: "ai_assisted",
      scenes: [{ order: 1, status: "awaiting_external_generation", generation_request: {
        story_beat: "Opening", visual_description: "Opening clip", motion_prompt: "Move ahead", character_continuity: "same", environment_continuity: "same", aspect_ratio: "16:9", duration_seconds: 8, generation_attempt: 1,
      } }],
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    try {
      const user = userEvent.setup();
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/scene-jobs/scene-repeat"]}><Routes><Route path="/scene-jobs/:jobId" element={<SceneVideoPage />} /></Routes></MemoryRouter></QueryClientProvider>);
      const input = await screen.findByLabelText("Import generated MP4") as HTMLInputElement;
      await user.upload(input, new File(["clip"], "scene.mp4", { type: "video/mp4" }));
      await user.click(screen.getByRole("button", { name: "Import MP4" }));
      expect(await screen.findByRole("button", { name: "Import MP4" })).toBeDisabled();
      expect(input.value).toBe("");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally { vi.unstubAllGlobals(); }
  });
});
