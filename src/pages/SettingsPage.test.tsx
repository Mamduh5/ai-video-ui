import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { apiJson } from "../lib/apiClient";
import { SettingsPage } from "./SettingsPage";
import { SectionEditor } from "../features/settings/SectionEditor";
import { StorageSettingsForm } from "../features/settings/StorageSettingsForm";
import { gibToBytes, validateStorage, type VideoSettings } from "../features/settings/contracts";
import { GeminiAutopilotPage } from "./GeminiAutopilotPage";
import { CreateSceneVideoPage } from "./NewVideoPage";
vi.mock("../lib/apiClient", () => ({ apiJson: vi.fn() }));
beforeEach(() => { vi.mocked(apiJson).mockReset(); }); afterEach(() => cleanup());
const defaults: VideoSettings = { version: 0, preferred_workflow: "flow_web", flow: { scene_count: 4, scene_seconds: 6, aspect_ratio: "9:16", audio_policy: "silent" }, gemini: { scene_count: 3, scene_seconds: 10, aspect_ratio: "16:9", audio_policy: "clip_native" } };
const storageSettings = { version: 0, automatic: true, level: "restorable", cleanup: "keep_local", warning_bytes: 5 * 1024 ** 3, critical_bytes: 2 * 1024 ** 3, reserve_bytes: 1024 ** 3 };
const storage = { settings: storageSettings, local: [], drive_status: "connected", queue_count: 0 };
const gemini = { available: true, config: { version: 0, enabled: true, configured_submission_cap: 4, planning_timeout_seconds: 480, planning_max_attempts: 3 }, status: { submissions_this_window: 4, provider_block_reason: "reconciliation_required", eligibility_estimated: true, window_hours: 5, next_eligible_at: "2026-10-12T08:02:22Z" } };
const options = { standard_available: true, gemini_available: true, scene_seconds: 8, video_defaults: defaults, capabilities: { scene_durations: [4, 6, 8, 10], aspect_ratios: ["16:9", "9:16"], min_scene_count: 1, max_scene_count: 8 } };
function mockReads() { vi.mocked(apiJson).mockImplementation(async (path) => ({ "/settings/video": defaults, "/settings/gemini": gemini, "/storage": storage, "/scene-video-options": options, "/settings/system": { planner_model: "fixture", planner_provider: "Configured planner", planner_configured: true, flow_enabled: true, gemini_browser: "configured; not checked", drive: "connected", mongo: "reachable", minio: "configured; not checked", ffmpeg: "available", download_directory: "fixture/downloads", working_directory: "fixture/work", flow_planning_timeout_seconds: 480, configuration_effect: "Startup changes require restart." } }[path])); }
function show(node: React.ReactNode) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, throwOnError: false }, mutations: { retry: false } } })}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>); }
it("loads all sections, persisted 5/2/1 GiB and calculated floor without mutations or readiness", async () => {
 mockReads(); show(<SettingsPage />);
 expect(await screen.findByRole("form", { name: "General / Video Defaults" })).toBeVisible();
 expect(screen.getByRole("form", { name: "Gemini Autopilot" })).toBeVisible(); expect(screen.getByRole("form", { name: "Storage & Google Drive" })).toBeVisible();
 expect(screen.getByLabelText("Warning free space (GiB)")).toHaveValue("5"); expect(screen.getByLabelText("Critical free space (GiB)")).toHaveValue("2"); expect(screen.getByLabelText("Working space reserve (GiB)")).toHaveValue("1"); expect(screen.getByText("3 GiB free")).toBeVisible();
 fireEvent.click(screen.getByText("Advanced Diagnostics & manual reset observations")); expect(screen.getByText(/4 submissions counted \/ 4 application cap/)).toBeVisible(); expect(screen.getByText(/estimated; provider reset not confirmed/)).toBeVisible(); expect(screen.getByText(/requires restart to change/)).toBeVisible();
 expect(vi.mocked(apiJson).mock.calls.every(([path, init]) => !init?.method && !path.includes("readiness"))).toBe(true);
});
it("shows loading and readable fetch failures", async () => { vi.mocked(apiJson).mockRejectedValue(new Error("Settings database unavailable")); show(<SettingsPage />); expect(screen.getByText("Loading video defaults...")).toBeVisible(); await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0)); });
it("retains invalid storage draft and reverts without cleanup", async () => {
 mockReads(); show(<SettingsPage />); const warning = await screen.findByLabelText("Warning free space (GiB)"); fireEvent.change(warning, { target: { value: "2" } });
 expect(screen.getByText(/Warning free space must be greater/)).toBeVisible(); expect(screen.getByRole("button", { name: "Save Storage Settings" })).toBeDisabled();
 const form = screen.getByRole("form", { name: "Storage & Google Drive" }); fireEvent.click(within(form).getByRole("button", { name: "Cancel / Revert" })); expect(warning).toHaveValue("5");
 expect(vi.mocked(apiJson).mock.calls.every(([, init]) => !init?.method)).toBe(true);
});
it("saving unchanged storage sends only the settings section and reports persisted success", async () => {
 mockReads(); const reads = vi.mocked(apiJson).getMockImplementation()!; vi.mocked(apiJson).mockImplementation(async (path, init) => init?.method === "POST" ? { ...storageSettings, version: 1 } : reads(path, init));
 show(<SettingsPage />); fireEvent.click(await screen.findByRole("button", { name: "Save Storage Settings" })); expect(await screen.findByText("Changes saved.")).toBeVisible();
 expect(apiJson).toHaveBeenCalledWith("/storage/settings", { method: "POST", body: storageSettings }); const writes = vi.mocked(apiJson).mock.calls.filter(([, init]) => init?.method); expect(writes).toHaveLength(1);
});
it("preserves unsaved draft on persistence failure and supports retry", async () => {
 let fail = true; const save = vi.fn(async () => { if (fail) throw new Error("Database write failed. Retry your draft."); });
 show(<StorageSettingsForm saved={storageSettings} onSave={save} onReload={async () => undefined} />);
 const input = screen.getByLabelText("Warning free space (GiB)"); fireEvent.change(input, { target: { value: "6" } }); fireEvent.click(screen.getByRole("button", { name: "Save Storage Settings" })); expect(await screen.findByText(/Database write failed/)).toBeVisible(); expect(input).toHaveValue("6"); expect(screen.queryByText("Changes saved.")).not.toBeInTheDocument();
 fail = false; fireEvent.click(screen.getByRole("button", { name: "Save Storage Settings" })); expect(await screen.findByText("Changes saved.")).toBeVisible(); expect(save.mock.calls).toHaveLength(2);
});
it("blocks a stale-tab overwrite and explicitly reloads the newer section", async () => {
 const save = vi.fn(async () => undefined), reload = vi.fn(async () => undefined);
 const element = (version: number, number: number) => <SectionEditor title="Example" saved={{ version, number }} validate={() => ""} onSave={save} onReload={reload}>{(d, edit) => <label>Value<input value={d.number} onChange={e => edit({ ...d, number: Number(e.target.value) })} /></label>}</SectionEditor>;
 const view = render(element(1, 2)); fireEvent.change(screen.getByLabelText("Value"), { target: { value: "3" } }); view.rerender(element(2, 4)); expect(screen.getByLabelText("Value")).toHaveValue("3"); expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled(); fireEvent.click(screen.getByRole("button", { name: "Reload saved values" })); await waitFor(() => expect(screen.getByLabelText("Value")).toHaveValue("4")); expect(save).not.toHaveBeenCalled();
});
it("bounds Gemini timeout and keeps provider-native defaults", async () => {
 mockReads(); show(<SettingsPage />); const timeout = await screen.findByLabelText("Planning timeout (seconds)"); fireEvent.change(timeout, { target: { value: "0" } }); expect(screen.getByText("Planning timeout must be 60-1800 seconds.")).toBeVisible();
 fireEvent.change(screen.getByLabelText("Preferred workflow"), { target: { value: "gemini_web" } }); expect(screen.getByLabelText("Default aspect ratio")).toHaveValue("16:9"); expect(within(screen.getByLabelText("Default aspect ratio")).getAllByRole("option")).toHaveLength(1); expect(within(screen.getByLabelText("Default audio")).getAllByRole("option")).toHaveLength(1); expect(screen.getByLabelText("Default scene duration")).toHaveValue("10");
});
it("initializes New Video from persisted defaults while allowing a project override", async () => {
 mockReads(); show(<CreateSceneVideoPage />); const scenes = await screen.findByLabelText("Scene count"); await waitFor(() => expect(scenes).toHaveValue("4")); expect(screen.getByLabelText("Aspect ratio")).toHaveValue("9:16"); expect(screen.getByLabelText("Scene length")).toHaveValue("6"); expect(screen.getByLabelText("Audio")).toHaveValue("silent");
 fireEvent.change(scenes, { target: { value: "2" } }); expect(scenes).toHaveValue("2"); expect(defaults.flow.scene_count).toBe(4);
 fireEvent.change(screen.getByLabelText("Production workflow"), { target: { value: "gemini_web" } }); expect(scenes).toHaveValue("3"); expect(screen.getByLabelText("Scene length")).toHaveValue("10"); expect(screen.getByLabelText("Aspect ratio")).toHaveValue("16:9"); expect(within(screen.getByLabelText("Audio")).getAllByRole("option")).toHaveLength(1);
 expect(vi.mocked(apiJson).mock.calls.every(([, init]) => !init?.method)).toBe(true);
});
it("parses exact GiB and rejects negatives, overflow, empty and rounded byte inputs", () => {
 expect(gibToBytes("1.5")).toBe(1610612736); for (const value of ["", "-1", "hello", "Infinity", "1.1", "1000000000000000000"]) expect(() => gibToBytes(value)).toThrow(); expect(validateStorage(storageSettings)).toBe(""); expect(validateStorage({ ...storageSettings, reserve_bytes: 3 * 1024 ** 3 })).toMatch(/no larger/);
});

it("each new Gemini queue form reloads saved defaults after a per-video override", async () => {
 const data = { available: true, server_now: "2026-10-12T04:00:00Z", video_defaults: defaults, runtime_notice: "fixture", capabilities: { aspect_ratios: ["16:9"], native_seconds: 10, max_scenes: 8 }, scheduler: { enabled: true, configured_submission_cap: 4, submissions_this_window: 0, queue: [] } };
 vi.mocked(apiJson).mockImplementation(async (_path,init) => init?.method ? {job_id:"fixture"} : data);
 show(<GeminiAutopilotPage />);const queueButton=await screen.findByRole("button",{name:"+ Queue Video"});await waitFor(()=>expect(queueButton).toBeEnabled());fireEvent.click(queueButton);expect(screen.getByLabelText("Scenes")).toHaveValue(3);
 fireEvent.change(screen.getByLabelText("Scenes"),{target:{value:"5"}});fireEvent.change(screen.getByLabelText("Idea"),{target:{value:"Fixture idea"}});fireEvent.click(screen.getByRole("button",{name:"Add to Queue"}));
 await waitFor(()=>expect(screen.queryByRole("button",{name:"Add to Queue"})).not.toBeInTheDocument());await waitFor(()=>expect(screen.getByRole("button",{name:"+ Queue Video"})).toBeEnabled());fireEvent.click(screen.getByRole("button",{name:"+ Queue Video"}));expect(screen.getByLabelText("Scenes")).toHaveValue(3);expect(defaults.gemini.scene_count).toBe(3);
});


it("shows Dense for missing provider defaults and explicitly saves both new-project snapshots", async () => {
 mockReads(); const reads=vi.mocked(apiJson).getMockImplementation()!;
 vi.mocked(apiJson).mockImplementation(async(path,init)=>init?.method === "POST" ? {...init.body as VideoSettings,version:1} : reads(path,init));
 show(<SettingsPage/>); const form=await screen.findByRole("form",{name:"General / Video Defaults"});
 expect(within(form).getByLabelText("Generation mode")).toHaveValue("dense_performance");
 fireEvent.click(within(form).getByRole("button",{name:"Save Changes"})); await screen.findByText("Changes saved.");
 const dense={version:"generation_settings.v1",mode:"dense_performance",performance_tempo:2};
 expect(apiJson).toHaveBeenCalledWith("/settings/video",{method:"POST",body:{...defaults,flow:{...defaults.flow,generation_settings:dense},gemini:{...defaults.gemini,generation_settings:dense}}});
 expect(defaults.flow).not.toHaveProperty("generation_settings"); expect(defaults.gemini).not.toHaveProperty("generation_settings");
});

it("preserves explicit provider defaults and saved Dense tempo when saving unrelated settings", async () => {
 mockReads(); const reads=vi.mocked(apiJson).getMockImplementation()!;
 const saved:VideoSettings={...defaults,flow:{...defaults.flow,generation_settings:{version:"generation_settings.v1",mode:"standard",performance_tempo:1}},gemini:{...defaults.gemini,generation_settings:{version:"generation_settings.v1",mode:"dense_performance",performance_tempo:1.5,dialogue_language:"Thai"}}};
 vi.mocked(apiJson).mockImplementation(async(path,init)=>init?.method === "POST" ? {...init.body as VideoSettings,version:1} : path === "/settings/video" ? saved : reads(path,init));
 show(<SettingsPage/>); const form=await screen.findByRole("form",{name:"General / Video Defaults"});
 expect(within(form).getByLabelText("Generation mode")).toHaveValue("standard");
 fireEvent.change(within(form).getByLabelText("Preferred workflow"),{target:{value:"gemini_web"}});
 expect(within(form).getByText(/Dense content-allocation setting: 1.5x/)).toBeVisible(); expect(within(form).queryByLabelText("Fast creative tempo")).toBeNull();
 fireEvent.click(within(form).getByRole("button",{name:"Save Changes"})); await screen.findByText("Changes saved.");
 expect(apiJson).toHaveBeenCalledWith("/settings/video",{method:"POST",body:{...saved,preferred_workflow:"gemini_web"}});
});

it("Gemini new ideas persist Dense by default and reset an explicit Fast override for the next idea", async () => {
 const data={available:true,server_now:"2026-10-17T04:00:00Z",video_defaults:defaults,runtime_notice:"fixture",capabilities:{aspect_ratios:["16:9"],native_seconds:10,max_scenes:8},scheduler:{enabled:false,configured_submission_cap:4,submissions_this_window:0,queue:[]}};
 vi.mocked(apiJson).mockImplementation(async(_path,init)=>init?.method ? {job_id:"fixture"} : data); show(<GeminiAutopilotPage/>);
 const queue=await screen.findByRole("button",{name:"+ Queue Video"}); await waitFor(()=>expect(queue).toBeEnabled()); fireEvent.click(queue);
 expect(screen.getByLabelText("Generation mode")).toHaveValue("dense_performance"); fireEvent.change(screen.getByLabelText("Idea"),{target:{value:"A complete dramatic explanation."}});
 fireEvent.click(screen.getByRole("button",{name:"Add to Queue"})); await screen.findByText("Idea added to your queue.");
 expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/queue",expect.objectContaining({body:expect.objectContaining({generation_settings:{version:"generation_settings.v1",mode:"dense_performance",performance_tempo:2}})}));
 fireEvent.click(queue); fireEvent.change(screen.getByLabelText("Generation mode"),{target:{value:"fast_performance"}}); fireEvent.change(screen.getByLabelText("Fast creative tempo"),{target:{value:"2.5"}});
 fireEvent.change(screen.getByLabelText("Idea"),{target:{value:"A substantial quick exchange with an immediate consequence."}}); fireEvent.click(screen.getByRole("button",{name:"Add to Queue"}));
 await waitFor(()=>expect(screen.queryByRole("button",{name:"Add to Queue"})).toBeNull());
 expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/queue",expect.objectContaining({body:expect.objectContaining({generation_settings:{version:"generation_settings.v1",mode:"fast_performance",performance_tempo:2.5,fast_version:"fast_performance.v3"}})}));
 fireEvent.click(queue); expect(screen.getByLabelText("Generation mode")).toHaveValue("dense_performance"); expect(screen.queryByLabelText("Fast creative tempo")).toBeNull();
 expect(vi.mocked(apiJson).mock.calls.filter(([,init])=>init?.method)).toHaveLength(2);
});
