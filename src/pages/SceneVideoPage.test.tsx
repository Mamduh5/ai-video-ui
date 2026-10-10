import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { apiJson } from "../lib/apiClient";
import { CreateSceneVideoPage, SceneVideoPage } from "./SceneVideoPage";

vi.mock("../lib/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/apiClient")>()),
  apiJson: vi.fn(),
}));

describe("manual Flow pages", () => {
  it("creates a Standard Video without opening Advanced", async () => {
    vi.mocked(apiJson).mockImplementation(async path => path === "/scene-video-options" ? {standard_available:true,scene_seconds:8,initial_keyframe_enabled:true} : {job_id:"scene-1"});
    const user=userEvent.setup(); const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/scene-jobs/create"]}><Routes><Route path="/scene-jobs/create" element={<CreateSceneVideoPage/>}/><Route path="/scene-jobs/:jobId" element={<p>Created scene job</p>}/></Routes></MemoryRouter></QueryClientProvider>);
    expect(screen.getByText("Advanced settings").closest("details")).not.toHaveAttribute("open");
    await user.type(screen.getByLabelText(/Video title/),"Crystal Robot");
    await user.type(screen.getByLabelText("Idea / story"),"rain");
    await user.click(await screen.findByRole("button",{name:"Generate Storyboard"}));
    expect(await screen.findByText("Created scene job")).toBeInTheDocument();
    expect(apiJson).toHaveBeenCalledWith("/scene-video-jobs",{method:"POST",body:{preset:"standard_video",title:"Crystal Robot",topic:"rain",character:"",scene_count:2,aspect_ratio:"16:9",scene_seconds:8,audio_policy:"clip_native",reference_mode:"none",review_policy:"ai_assisted",continuity_mode:"chained_frames",opening_image_required:true}});
  });

  it("supports real advanced continuity and reference overrides", async () => {
    vi.mocked(apiJson).mockImplementation(async path => path === "/scene-video-options" ? {standard_available:true,scene_seconds:8,initial_keyframe_enabled:true} : {job_id:"scene-2"});
    const user=userEvent.setup(); const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/scene-jobs/create"]}><Routes><Route path="/scene-jobs/create" element={<CreateSceneVideoPage/>}/><Route path="/scene-jobs/:jobId" element={<p>Created scene job</p>}/></Routes></MemoryRouter></QueryClientProvider>);
    await user.type(screen.getByLabelText("Idea / story"),"rain");
    await user.click(screen.getByText("Advanced settings"));
    await user.selectOptions(screen.getByLabelText("Continuity"),"independent");
    await user.selectOptions(screen.getByLabelText("Reference mode"),"provider_generated");
    await user.click(await screen.findByRole("button",{name:"Generate Storyboard"}));
    expect(await screen.findByText("Created scene job")).toBeInTheDocument();
    expect(apiJson).toHaveBeenCalledWith("/scene-video-jobs",expect.objectContaining({body:expect.objectContaining({reference_mode:"provider_generated",continuity_mode:"independent"})}));
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
    expect(screen.getByRole("button", { name: "Accept Scene" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Regenerate" })).toBeInTheDocument();
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

describe("R3 media conformance workflow", () => {
  const media = { duration_seconds: 8, width: 1920, height: 1080, display_aspect_ratio: "16:9", video_codec: "h264", audio_present: true, audio_codec: "aac", audio_channels: 2 };
  const conformance = { status: "warning", checks: [
    { field: "aspect_ratio", status: "warning", expected: "9:16", actual: "16:9", severity: "high" },
    { field: "duration", status: "warning", expected: "4 sec", actual: "8.000 sec", severity: "high" },
  ] };
  const job = (decision = "pending", reviewPolicy = "ai_assisted") => ({
    id: "r3-job", status: "conformance_attention_required", current_step: "media_conformance", review_policy: reviewPolicy,
    scenes: [{ order: 1, status: "conformance_attention_required", current_attempt: 2, clip_url: "/clip",
      generation_request: { story_beat: "Opening", visual_description: "Robot", motion_prompt: "Move ahead", character_continuity: "same", environment_continuity: "same", aspect_ratio: "9:16", duration_seconds: 4, generation_attempt: 2 },
      attempts: [{ attempt: 2, imported_at: "2026-10-02T00:00:00Z", media, conformance, conformance_decision: decision }],
    }],
  });
  function renderJob() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/scene-jobs/r3-job"]}><Routes><Route path="/scene-jobs/:jobId" element={<SceneVideoPage />} /></Routes></MemoryRouter></QueryClientProvider>);
  }

  it("shows exact mismatch and binds Use Anyway to the current attempt without creative acceptance", async () => {
    const user = userEvent.setup();
    vi.mocked(apiJson).mockResolvedValue(job());
    renderJob();
    await screen.findByRole("button", { name: "Use Anyway" });
    expect(screen.getByText(/It does not accept the scene/)).toBeInTheDocument();
    expect(screen.getAllByText("Expected: 9:16").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Imported: 16:9").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Expected: 4 sec").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Accept Scene" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry AI review" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Import generated MP4")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use Anyway" }));
    expect(apiJson).toHaveBeenCalledWith("/scene-video-jobs/r3-job/scenes/1/attempts/2/conformance/continue", { method: "POST" });
    expect(vi.mocked(apiJson).mock.calls.some(([path]) => path.endsWith("/accept") || path.endsWith("/review"))).toBe(false);
  });

  it("Generate Again preserves history and exposes a fresh MP4 import", async () => {
    const user = userEvent.setup();
    let data = job();
    vi.mocked(apiJson).mockImplementation(async (path) => {
      if (path.endsWith("/conformance/replace")) {
        data = { ...job("replace"), status: "awaiting_external_generation", scenes: [{ ...job("replace").scenes[0], status: "awaiting_external_generation", clip_url: "", current_attempt: 0 }] };
        return { job: data };
      }
      return data;
    });
    renderJob();
    await user.click(await screen.findByRole("button", { name: "Generate Again" }));
    expect(await screen.findByLabelText("Import generated MP4")).toBeInTheDocument();
    expect(screen.getByText(/Attempt 2 clip/)).toBeInTheDocument();
    expect(screen.getByText(/Human media decision: Replace Clip/)).toBeInTheDocument();
    expect(apiJson).toHaveBeenCalledWith("/scene-video-jobs/r3-job/scenes/1/attempts/2/conformance/replace", { method: "POST" });
  });

  it("keeps override distinct from AI review and retains retry feedback", async () => {
    const user = userEvent.setup();
    let data = job();
    vi.mocked(apiJson).mockImplementation(async (path) => {
      if (path.endsWith("/conformance/continue")) {
        data = { ...job("accepted_override"), status: "awaiting_review", scenes: [{ ...job("accepted_override").scenes[0], status: "review_pending" }] };
        return { job: data, review_error: "media override saved; AI review failed, use Retry AI review" };
      }
      return data;
    });
    renderJob();
    await user.click(await screen.findByRole("button", { name: "Use Anyway" }));
    expect(await screen.findByRole("button", { name: "Retry AI review" })).toBeInTheDocument();
    expect(screen.getAllByText(/Media override accepted/).length).toBeGreaterThan(0);
    expect(screen.getByRole("alert")).toHaveTextContent("media override saved");
    expect(screen.queryByRole("button", { name: "Accept Scene" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Use Anyway" })).not.toBeInTheDocument());
  });

  it("renders conforming media with AI review and no override action", async () => {
    const data = job();
    const reviewed = { ...data.scenes[0].attempts[0], conformance: { status: "pass", checks: [] }, conformance_decision: undefined,
      review: { verdict: "pass", summary: "Consistent", issues: [], checks: {}, retry_recommended: false, retry_prompt_delta: [], frames: [] } };
    vi.mocked(apiJson).mockResolvedValue({ ...data, status: "awaiting_human_decision", scenes: [{ ...data.scenes[0], status: "human_decision_required", attempts: [reviewed] }] });
    renderJob();
    expect(await screen.findByRole("button", { name: "Accept Scene" })).toBeInTheDocument();
    expect(screen.getAllByText("Video settings").length).toBeGreaterThan(0);
    expect(screen.getByText(/AI visual review/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use Anyway" })).not.toBeInTheDocument();
  });

  it("shows conformance decisions for review off without offering AI acceptance", async () => {
    vi.mocked(apiJson).mockResolvedValue(job("pending", "off"));
    renderJob();
    expect(await screen.findByRole("button", { name: "Use Anyway" })).toBeInTheDocument();
    expect(screen.getByText("Attempt history")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept Scene" })).not.toBeInTheDocument();
  });
});


describe("R7 accepted scene correction", () => {
 it.each([false, true])("offers replacement only before a dependent run (dependent=%s)", async (dependent) => {
  vi.mocked(apiJson).mockClear();
  const request = { story_beat:"Enter",motion_prompt:"Enter then stop",duration_seconds:8,aspect_ratio:"16:9",generation_attempt:1 };
  const job = {id:"r7-reopen",generation_provider:"flow_web",continuity_mode:"chained_frames",review_policy:"ai_assisted",status:"awaiting_external_generation",current_step:"awaiting_external_generation",scenes:[
   {order:1,status:"accepted",clip_url:"/clip",current_attempt:1,generation_request:request,attempts:[{attempt:1,decision:"accepted",imported_at:"2026-10-09T00:00:00Z",review:{verdict:"warning",summary:"Facing correction",checks:{},issues:[],retry_prompt_delta:["Keep facing inward"],frames:[]},decision_history:[{decision:"accepted",at:"2026-10-09T00:00:00Z"}]}]},
   {order:2,status:"waiting",generation_request:request,flow_runs:dependent?[{run_id:"dependent",status:"queued"}]:[]}
  ]};
  vi.mocked(apiJson).mockResolvedValue(job);
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/scene-jobs/r7-reopen"]}><Routes><Route path="/scene-jobs/:jobId" element={<SceneVideoPage/>}/></Routes></MemoryRouter></QueryClientProvider>);
  await screen.findByText("Human decision: accepted");
  const button=screen.queryByRole("button",{name:"Replace accepted scene with review corrections"});
  if(dependent){expect(button).not.toBeInTheDocument();return;}
  expect(button).toBeInTheDocument();
  expect(screen.getByLabelText("Human decision history")).toHaveTextContent("accepted");
  await userEvent.setup().click(button!);
  expect(apiJson).toHaveBeenCalledWith("/scene-video-jobs/r7-reopen/scenes/1/regenerate",{method:"POST",body:{apply_review_corrections:true}});
  expect(vi.mocked(apiJson).mock.calls.some(([path])=>path.endsWith("/accept")||path.endsWith("/flow/generate"))).toBe(false);
 });
});

it("propagates eight portrait ten-second scenes with an approximate eighty-second preview",async()=>{vi.mocked(apiJson).mockImplementation(async path=>path==="/scene-video-options"?{standard_available:true,scene_seconds:8,initial_keyframe_enabled:true,capabilities:{aspect_ratios:["16:9","9:16"],scene_durations:[4,6,8,10],min_scene_count:1,max_scene_count:8}}:{job_id:"r9"});const user=userEvent.setup();const client=new QueryClient({defaultOptions:{queries:{retry:false}}});render(<QueryClientProvider client={client}><MemoryRouter><CreateSceneVideoPage/></MemoryRouter></QueryClientProvider>);await screen.findByRole('option',{name:'10 seconds'});expect(screen.getByLabelText('Scene length')).toHaveValue('8');await user.selectOptions(screen.getByLabelText('Scene count'),'8');await user.selectOptions(screen.getByLabelText('Scene length'),'10');await user.selectOptions(screen.getByLabelText('Aspect ratio'),'9:16');expect(screen.getByLabelText('Approx. video length')).toHaveTextContent('~80 sec');await user.type(screen.getByLabelText('Idea / story'),'Eight distinct steps');await user.click(screen.getByRole('button',{name:'Generate Storyboard'}));await waitFor(()=>expect(apiJson).toHaveBeenCalledWith('/scene-video-jobs',expect.objectContaining({body:expect.objectContaining({scene_count:8,scene_seconds:10,aspect_ratio:'9:16'})})));});
