import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { apiJson } from "../lib/apiClient";
import { CreateSceneVideoPage } from "./NewVideoPage";
import { SceneVideoPage } from "./SceneVideoPage";

vi.mock("../lib/apiClient", async original => ({ ...await original<typeof import("../lib/apiClient")>(), apiJson: vi.fn() }));
beforeEach(() => vi.mocked(apiJson).mockReset());

const options = { standard_available: true, gemini_available: true, gemini_capabilities:{native_seconds:10,max_scenes:20,aspect_ratios:["9:16","16:9"]}, scene_seconds: 8, capabilities: { aspect_ratios: ["16:9", "9:16"], scene_durations: [4, 6, 8, 10], min_scene_count: 1, max_scene_count: 8 } };
function showCreate() {
 return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter initialEntries={["/new"]}><Routes><Route path="/new" element={<CreateSceneVideoPage/>}/><Route path="/scene-jobs/:jobId" element={<p>Created project</p>}/></Routes></MemoryRouter></QueryClientProvider>);
}

it("keeps the Standard default omitted when the configured Flow model has no quality selector", async () => {
 vi.mocked(apiJson).mockImplementation(async path => path === "/scene-video-options" ? options : {job_id:"standard"});
 const user = userEvent.setup(); showCreate();
 expect(await screen.findByRole("option", {name:"8 seconds"}, {timeout:5000})).toBeInTheDocument();
 expect(screen.getByLabelText("Generation quality")).toHaveValue("720p");
 expect(screen.getByRole("option", {name:/Draft 360p.*unavailable/})).toBeDisabled();
 await user.type(screen.getByLabelText("Idea / story"), "A robot repairs a clock");
 await user.click(screen.getByRole("button", {name:"Generate Storyboard"}));
 await waitFor(() => expect(apiJson).toHaveBeenCalledWith("/scene-video-jobs", expect.objectContaining({body:expect.objectContaining({scene_seconds:8})})));
 const created = vi.mocked(apiJson).mock.calls.find(([path]) => path === "/scene-video-jobs");
 expect(created?.[1]?.body).not.toHaveProperty("generation_resolution");
}, 15000);

it("submits explicit Standard 720p when the configured Flow model supports that choice", async () => {
 vi.mocked(apiJson).mockImplementation(async path => path === "/scene-video-options" ? {...options, capabilities:{...options.capabilities, generation_resolutions:["720p", "360p"]}} : {job_id:"standard"});
 const user = userEvent.setup(); showCreate();
 await screen.findByRole("option", {name:"8 seconds"}, {timeout:5000});
 expect(screen.getByLabelText("Generation quality")).toHaveValue("720p");
 await user.type(screen.getByLabelText("Idea / story"), "A robot repairs a clock");
 await user.click(screen.getByRole("button", {name:"Generate Storyboard"}));
 await waitFor(() => expect(apiJson).toHaveBeenCalledWith("/scene-video-jobs", expect.objectContaining({body:expect.objectContaining({generation_resolution:"720p"})})));
}, 15000);

it.each(["flow_web", "flow_unattended"])("submits native Draft 360p for %s when supported", async workflow => {
 vi.mocked(apiJson).mockImplementation(async path => path === "/scene-video-options" ? {...options, capabilities:{...options.capabilities, generation_resolutions:["720p", "360p"]}} : {job_id:"draft"});
 const user = userEvent.setup(); showCreate();
 await screen.findByRole("option", {name:"8 seconds"}, {timeout:5000});
 await user.selectOptions(screen.getByLabelText("Production workflow"), workflow);
 await user.selectOptions(screen.getByLabelText("Generation quality"), "360p");
 await user.type(screen.getByLabelText("Idea / story"), "A cup dodges a reaching hand");
 await user.click(screen.getByRole("button", {name:workflow === "flow_unattended" ? "Add to Flow Queue" : "Generate Storyboard"}));
 await waitFor(() => expect(apiJson).toHaveBeenCalledWith("/scene-video-jobs", expect.objectContaining({body:expect.objectContaining({generation_resolution:"360p"})})));
 expect(screen.queryByText(/\d+ credits/)).not.toBeInTheDocument();
 if(workflow === "flow_unattended")expect(apiJson).toHaveBeenCalledWith("/flow-autopilot/queue", {method:"POST",body:{job_id:"draft"}});
});

it("keeps Flow quality out of Gemini creation", async () => {
 vi.mocked(apiJson).mockImplementation(async path => path === "/scene-video-options" ? options : {job_id:"gemini"});
 const user = userEvent.setup(); showCreate();
 await screen.findByRole("option", {name:"8 seconds"}, {timeout:5000});
 await user.selectOptions(screen.getByLabelText("Production workflow"), "gemini_web");
 expect(screen.queryByLabelText("Generation quality")).not.toBeInTheDocument();
 await user.type(screen.getByLabelText("Idea / story"), "A quiet garden");
 await user.click(screen.getByRole("button", {name:"Add to Gemini Queue"}));
 await waitFor(() => expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/queue", {method:"POST",body:{title:"",idea:"A quiet garden",scene_count:2,aspect_ratio:"9:16",generation_settings:{version:"generation_settings.v1",mode:"dense_performance",performance_tempo:2}}}));
});

it("displays saved draft quality and preserves it when regenerating the storyboard", async () => {
 const job = {id:"draft",title:"Clock repair",topic:"Fix the clock",generation_provider:"flow_web",status:"awaiting_external_generation",current_step:"awaiting_external_generation",next_action:{type:"start_production",label:"Start Production",message:"Review your storyboard"},scenes:[{order:1,status:"waiting",generation_request:{generation_resolution:"360p",story_beat:"Repair",visual_description:"Robot beside a clock",motion_prompt:"Robot replaces a gear",character_continuity:"Same robot",environment_continuity:"Same workshop",aspect_ratio:"16:9",duration_seconds:8,generation_attempt:1}}]};
 vi.mocked(apiJson).mockImplementation(async (_path, request) => request?.method === "POST" ? {job_id:"revised"} : job);
 const user = userEvent.setup();
 render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter initialEntries={["/scene-jobs/draft"]}><Routes><Route path="/scene-jobs/:jobId" element={<SceneVideoPage/>}/></Routes></MemoryRouter></QueryClientProvider>);
 expect(await screen.findByText("Generation quality: Draft 360p")).toBeVisible();
 await user.click(screen.getByRole("button", {name:"Regenerate Storyboard"}));
 await waitFor(() => expect(apiJson).toHaveBeenCalledWith("/scene-video-jobs", expect.objectContaining({body:expect.objectContaining({generation_resolution:"360p"})})));
});

it("preserves historical omission when regenerating a Flow storyboard without saved quality", async () => {
 const job = {id:"legacy",title:"Clock repair",topic:"Fix the clock",generation_provider:"flow_web",status:"awaiting_external_generation",current_step:"awaiting_external_generation",next_action:{type:"start_production",label:"Start Production",message:"Review your storyboard"},scenes:[{order:1,status:"waiting",generation_request:{story_beat:"Repair",visual_description:"Robot beside a clock",motion_prompt:"Robot replaces a gear",character_continuity:"Same robot",environment_continuity:"Same workshop",aspect_ratio:"16:9",duration_seconds:8,generation_attempt:1}}]};
 vi.mocked(apiJson).mockImplementation(async (_path, request) => request?.method === "POST" ? {job_id:"revised"} : job);
 const user = userEvent.setup();
 render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter initialEntries={["/scene-jobs/legacy"]}><Routes><Route path="/scene-jobs/:jobId" element={<SceneVideoPage/>}/></Routes></MemoryRouter></QueryClientProvider>);
 expect(await screen.findByText("Generation quality: Standard 720p")).toBeVisible();
 await user.click(screen.getByRole("button", {name:"Regenerate Storyboard"}));
 await waitFor(() => expect(apiJson).toHaveBeenCalledWith("/scene-video-jobs", expect.objectContaining({body:expect.objectContaining({topic:"Fix the clock"})})));
 const created = vi.mocked(apiJson).mock.calls.find(([path, request]) => path === "/scene-video-jobs" && request?.method === "POST");
 expect(created?.[1]?.body).not.toHaveProperty("generation_resolution");
});
