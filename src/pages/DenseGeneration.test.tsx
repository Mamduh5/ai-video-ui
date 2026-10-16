import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { apiJson } from "../lib/apiClient";
import { CreateSceneVideoPage } from "./NewVideoPage";
import { SceneVideoPage } from "./SceneVideoPage";
import { GenerationRevisionPanel } from "./GenerationRevisionPanel";
vi.mock("../lib/apiClient", async original => ({...await original<typeof import("../lib/apiClient")>(),apiJson:vi.fn()}));
beforeEach(() => vi.mocked(apiJson).mockReset()); afterEach(cleanup);
const dense = { version: "generation_settings.v1" as const, mode: "dense_performance" as const, performance_tempo: 2 as const, dialogue_language: "Thai" };
const options = { standard_available: true, gemini_available: true, scene_seconds: 8, video_defaults: { preferred_workflow: "flow_web", flow: { scene_count: 2, scene_seconds: 8, aspect_ratio: "16:9", audio_policy: "clip_native" }, gemini: { scene_count: 2, scene_seconds: 10, aspect_ratio: "16:9", audio_policy: "clip_native" } }, gemini_capabilities: { native_seconds: 10, max_scenes: 8, aspect_ratios: ["16:9"] }, capabilities: { scene_durations: [8], aspect_ratios: ["16:9"], min_scene_count: 1, max_scene_count: 8 } };
function mount(node: React.ReactNode) { return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter><Routes><Route path="/" element={node}/><Route path="/scene-jobs/:id" element={<p>Revised project ready</p>}/></Routes></MemoryRouter></QueryClientProvider>); }
it("keeps historical Standard behavior and does not add generation settings until selected", async () => {
  vi.mocked(apiJson).mockImplementation(async path => path === "/scene-video-options" ? options : {job_id:"new"}); mount(<CreateSceneVideoPage/>);
  await screen.findByRole("button", {name:"Generate Storyboard"}); fireEvent.change(screen.getByLabelText("Idea / story"), {target:{value:"A Thai father and son discuss a consequential decision."}});
  fireEvent.click(screen.getByRole("button", {name:"Generate Storyboard"})); await screen.findByText("Revised project ready");
  const body = vi.mocked(apiJson).mock.calls.find(([path]) => path === "/scene-video-jobs")?.[1]?.body; expect(body).not.toHaveProperty("generation_settings"); expect(body).toHaveProperty("scene_seconds",8);
});
it("allocates denser content without changing native duration, preserves Thai and passes Colab snapshot", async () => {
  vi.mocked(apiJson).mockImplementation(async path => path === "/scene-video-options" ? options : {job_id:"new"}); mount(<CreateSceneVideoPage/>); await screen.findByRole("button", {name:"Generate Storyboard"});
  fireEvent.change(screen.getByLabelText("Generation mode"),{target:{value:"dense_performance"}}); fireEvent.change(screen.getByLabelText("Performance tempo requested from the AI"),{target:{value:"2.5"}}); fireEvent.change(screen.getByLabelText("Dialogue language (optional)"),{target:{value:"Thai"}});
  expect(screen.getByText(/Approximate normal-paced content target: 20.0 seconds/)).toBeVisible(); expect(screen.getByLabelText("Scene length")).toHaveValue("8");
  expect(screen.queryByLabelText(/playback speed/i)).toBeNull(); fireEvent.change(screen.getByLabelText("Storyboard planner"),{target:{value:"colab_qwen"}}); fireEvent.change(screen.getByLabelText("Idea / story"),{target:{value:"พ่อ: อธิบายสิ่งที่เกิดขึ้น ลูก: ผมจะบอกความจริงทั้งหมด"}}); fireEvent.click(screen.getByRole("button",{name:"Generate Storyboard"})); await screen.findByText("Revised project ready");
  expect(apiJson).toHaveBeenCalledWith("/scene-video-jobs",expect.objectContaining({method:"POST",body:expect.objectContaining({planning_provider:"colab_qwen",scene_seconds:8,generation_settings:{...dense,performance_tempo:2.5}})}));
});
it("explicit Standard overrides a Dense default and Gemini uses its actual native source duration", async () => {
  vi.mocked(apiJson).mockImplementation(async path => path === "/scene-video-options" ? {...options,video_defaults:{...options.video_defaults,preferred_workflow:"gemini_web",gemini:{...options.video_defaults.gemini,generation_settings:dense}}} : {job_id:"new"}); mount(<CreateSceneVideoPage/>); await screen.findByRole("button",{name:"Add to Gemini Queue"});
  await waitFor(()=>expect(screen.getByText(/Approximate normal-paced content target: 20.0 seconds/)).toBeVisible()); fireEvent.change(screen.getByLabelText("Generation mode"),{target:{value:"standard"}}); fireEvent.change(screen.getByLabelText("Idea / story"),{target:{value:"A substantial explanation and consequential response."}}); fireEvent.click(screen.getByRole("button",{name:"Add to Gemini Queue"})); await screen.findByText("Revised project ready");
  expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/queue",{method:"POST",body:expect.objectContaining({generation_settings:{version:"generation_settings.v1",mode:"standard",performance_tempo:1}})});
});
it("requires an explicit revision click and preserves the old plan while creating a separate project", async () => {
  const original={title:"Argument",topic:"Father explains the consequences; son reveals the truth.",scene_count:1,scene_seconds:8,scenes:[{generation_request:{duration_seconds:8}}],aspect_ratio:"16:9",generation_provider:"flow_web",generation_settings:{version:"generation_settings.v1" as const,mode:"standard" as const,performance_tempo:1 as const}}; const saved=JSON.stringify(original);
  vi.mocked(apiJson).mockResolvedValue({job_id:"revision"}); mount(<GenerationRevisionPanel job={original}/>); expect(apiJson).not.toHaveBeenCalled(); await userEvent.click(screen.getByText("Change generation mode in a new storyboard revision")); fireEvent.change(screen.getByLabelText("Generation mode"),{target:{value:"dense_performance"}}); expect(apiJson).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button",{name:"Create revised storyboard as new project"})); await screen.findByText("Revised project ready"); expect(JSON.stringify(original)).toBe(saved); expect(vi.mocked(apiJson).mock.calls).toHaveLength(1); expect(apiJson).toHaveBeenCalledWith("/scene-video-jobs",expect.objectContaining({body:expect.objectContaining({generation_settings:expect.objectContaining({mode:"dense_performance",performance_tempo:2}),scene_seconds:8})}));
});

it("retries only queue insertion when a revised Flow project was already created", async()=>{
 const job={title:"x".repeat(80),topic:"A substantial story",scene_count:0,scene_seconds:8,scenes:[{generation_request:{duration_seconds:8}}],generation_provider:"flow_web",production:{mode:"flow_unattended"}};
 let queueAttempts=0;vi.mocked(apiJson).mockImplementation(async path=>{if(path==="/flow-autopilot/queue"&&queueAttempts++===0)throw new Error("Queue storage temporarily unavailable");return {job_id:"one-revision"};});mount(<GenerationRevisionPanel job={job}/>);await userEvent.click(screen.getByText("Change generation mode in a new storyboard revision"));await userEvent.click(screen.getByRole("button",{name:"Create revised storyboard as new project"}));expect(await screen.findByRole("alert")).toHaveTextContent("Queue storage temporarily unavailable");expect(screen.getByRole("link",{name:"Open revised project"})).toHaveAttribute("href","/scene-jobs/one-revision");expect(screen.getByLabelText("Generation mode")).toBeDisabled();await userEvent.click(screen.getByRole("button",{name:"Retry adding revised Flow project to queue"}));await screen.findByText("Revised project ready");const creates=vi.mocked(apiJson).mock.calls.filter(([path])=>path==="/scene-video-jobs");expect(creates).toHaveLength(1);const body=creates[0][1]?.body as {title:string;scene_count:number};expect(body.title.length).toBe(80);expect(body.scene_count).toBe(1);expect(vi.mocked(apiJson).mock.calls.filter(([path])=>path==="/flow-autopilot/queue")).toHaveLength(2);
});
it("does not offer a revision before the original plan exists",()=>{
 mount(<GenerationRevisionPanel job={{title:"Pending",topic:"A story awaiting planning",scene_count:0,scene_seconds:8,scenes:[]}}/>);expect(screen.queryByText("Change generation mode in a new storyboard revision")).toBeNull();expect(apiJson).not.toHaveBeenCalled();
});

it("keeps historical Standard settings during the existing Regenerate Storyboard action",async()=>{
 const request={story_beat:"A consequential discussion",motion_prompt:"Preserve the full substantial dialogue",visual_description:"Father and son",character_continuity:"Same people",environment_continuity:"Same room",aspect_ratio:"16:9",duration_seconds:8,generation_attempt:1};
 const job={id:"old",title:"Historical Standard",topic:"A substantial argument",scene_count:1,scene_seconds:8,status:"awaiting_external_generation",current_step:"planning",generation_provider:"flow_web",review_policy:"human_only",next_action:{type:"start_production",message:"Review the storyboard",label:"Start Production"},production:{started:false,paused:false,scene_count:1,current_scene:1,scenes:[{order:1,status:"waiting"}]},scenes:[{order:1,status:"waiting",generation_request:request}]};
 vi.mocked(apiJson).mockImplementation(async(_path,init)=>init?.method==="POST"?{job_id:"revised"}:job);render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter initialEntries={["/scene-jobs/old"]}><Routes><Route path="/scene-jobs/:jobId" element={<SceneVideoPage/>}/></Routes></MemoryRouter></QueryClientProvider>);await userEvent.click(await screen.findByRole("button",{name:"Regenerate Storyboard"}));await waitFor(()=>expect(apiJson).toHaveBeenCalledWith("/scene-video-jobs",expect.objectContaining({body:expect.objectContaining({generation_settings:{version:"generation_settings.v1",mode:"standard",performance_tempo:1}})})));
});
