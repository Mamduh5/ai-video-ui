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
    expect(apiJson).toHaveBeenCalledWith("/scene-video-jobs", { method: "POST", body: { character: "guide", topic: "rain", scene_count: 4, audio_policy: "clip_native", reference_mode: "none" } });
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
    expect(apiJson).toHaveBeenCalledWith("/scene-video-jobs", { method: "POST", body: { character: "guide", topic: "rain", scene_count: 2, audio_policy: "external_narration", reference_mode: "provider_generated" } });
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
});
