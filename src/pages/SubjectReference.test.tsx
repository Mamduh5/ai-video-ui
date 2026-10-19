import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { apiJson, apiMultipart } from "../lib/apiClient";
import { validateSubjectReference, type SubjectReferenceCapability } from "../features/subjectReference/validation";
import { CreateSceneVideoPage } from "./NewVideoPage";

vi.mock("../lib/apiClient", async original => ({ ...await original<typeof import("../lib/apiClient")>(), apiJson: vi.fn(), apiMultipart: vi.fn() }));
const capability: SubjectReferenceCapability = { supported: true, status: "verified", media_types: ["image/png", "image/jpeg"], max_bytes: 10485760, max_width: 4096, max_height: 4096, max_pixels: 16000000 };
const options = { standard_available: true, gemini_available: true, scene_seconds: 8, gemini_capabilities: { native_seconds: 10, max_scenes: 8, aspect_ratios: ["16:9"] } };
const clients: QueryClient[] = [];

function mountFlowModel(model: string, seconds: number, supported: boolean, ingredientDurations: number[], resolutions: string[] = ["720p"]) {
 vi.mocked(apiJson).mockImplementation(async path => path === "/scene-video-options" ? { ...options, scene_seconds: seconds, flow_model: model, flow_ingredients_supported: supported, flow_ingredients_capabilities: { aspect_ratios: ["16:9", "9:16"], scene_durations: ingredientDurations, generation_resolutions: resolutions }, capabilities: { aspect_ratios: ["16:9", "9:16"], scene_durations: [4, 6, 8, 10], generation_resolutions: resolutions, min_scene_count: 1, max_scene_count: 8 } } : path === "/flow/subject-reference-capability" ? capability : { job_id: "created" });
 vi.mocked(apiMultipart).mockResolvedValue({ job_id: "created" });
 const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); clients.push(client);
 return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/videos/new?workflow=flow_web"]}><Routes><Route path="/videos/new" element={<CreateSceneVideoPage/>}/><Route path="/scene-jobs/:id" element={<p>Project created</p>}/></Routes></MemoryRouter></QueryClientProvider>);
}

it("keeps an incompatible requested duration and requires explicit eight-second selection for Fast Ingredients", async () => {
 mountFlowModel("Veo 3.1 - Fast",4,true,[8]);
 const input=await ready();expect(screen.getByLabelText("Scene length")).toHaveValue("4");choose(input);await screen.findByAltText("Subject reference preview");
 expect(screen.getByLabelText("Scene length")).toHaveValue("4");expect(screen.getByText(/4 seconds is unavailable for Veo 3.1 - Fast Ingredients/)).toBeVisible();expect(screen.getByRole("button",{name:"Generate Storyboard"})).toBeDisabled();
 fireEvent.submit(screen.getByLabelText("Idea / story").closest("form")!);expect(apiMultipart).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText("Scene length"),{target:{value:"8"}});fireEvent.click(screen.getByRole("button",{name:"Generate Storyboard"}));await screen.findByText("Project created");
 const body=vi.mocked(apiMultipart).mock.calls[0][1];expect(JSON.parse(String(body.get("request")))).toMatchObject({scene_seconds:8,generation_resolution:"720p",continuity_mode:"independent"});
});

it("blocks Quality Ingredients before creating a project", async () => {
 mountFlowModel("Veo 3.1 - Quality",8,false,[]);const input=await ready();choose(input);await screen.findByAltText("Subject reference preview");
 expect(screen.getByText(/Flow Ingredients is not supported by Veo 3.1 - Quality/)).toBeVisible();fireEvent.submit(screen.getByLabelText("Idea / story").closest("form")!);expect(apiMultipart).not.toHaveBeenCalled();
});

it("retains supported Omni ten-second Ingredients and Draft resolution", async () => {
 mountFlowModel("Gemini Omni Flash 1.1",10,true,[4,6,8,10],["720p","360p"]);const input=await ready();choose(input);await screen.findByAltText("Subject reference preview");
 fireEvent.change(screen.getByLabelText("Generation quality"),{target:{value:"360p"}});expect(screen.getByLabelText("Scene length")).toHaveValue("10");fireEvent.click(screen.getByRole("button",{name:"Generate Storyboard"}));await screen.findByText("Project created");
 expect(JSON.parse(String(vi.mocked(apiMultipart).mock.calls[0][1].get("request")))).toMatchObject({scene_seconds:10,generation_resolution:"360p"});
});
const bitmap = () => ({ width: 1200, height: 800, close: vi.fn() });
const image = (name = "roadster.png") => new File(["fixture image bytes"], name, { type: "image/png" });
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function mount(cap: unknown = capability) {
 vi.mocked(apiJson).mockImplementation(async path => { if (path === "/scene-video-options") return options; if (path === "/gemini-autopilot/subject-reference-capability") { if (cap instanceof Error) throw cap; return cap; } return { job_id: "created" }; });
 const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); clients.push(client);
 return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/videos/new?workflow=gemini_web"]}><Routes><Route path="/videos/new" element={<CreateSceneVideoPage/>}/><Route path="/scene-jobs/:id" element={<p>Project created</p>}/></Routes></MemoryRouter></QueryClientProvider>);
}
async function ready() { const input = await screen.findByLabelText("Reference image file"); await waitFor(() => expect(input).toBeEnabled()); fireEvent.change(screen.getByLabelText("Idea / story"), { target: { value: "Same Roadster in a new coastal setting" } }); return input; }
function choose(input: HTMLElement, file: File = image()) { fireEvent.change(input, { target: { files: [file] } }); }
beforeEach(() => {
 vi.mocked(apiJson).mockReset(); vi.mocked(apiMultipart).mockReset();
 vi.stubGlobal("createImageBitmap", vi.fn().mockImplementation(async () => bitmap()));
 const OriginalURL = URL;
 vi.stubGlobal("URL", class extends OriginalURL { static createObjectURL = vi.fn(() => `blob:subject-preview-${crypto.randomUUID()}`); static revokeObjectURL = vi.fn(); });
});
afterEach(() => { cleanup(); clients.splice(0).forEach(c => c.clear()); vi.unstubAllGlobals(); });

it("keeps no-image Gemini creation unchanged while an unverified reference role is disabled", async () => {
 mount({ ...capability, supported: false, status: "unverified", message: "Subject-reference roles have not been verified in the dedicated browser." });
 expect(await screen.findByLabelText("Reference image file")).toBeDisabled();
 expect(await screen.findByText(/Subject-reference roles have not been verified/)).toBeVisible();
 fireEvent.change(screen.getByLabelText("Idea / story"), { target: { value: "A Roadster accelerates" } });
 await waitFor(() => expect(screen.getByRole("button", { name: "Add to Gemini Queue" })).toBeEnabled());
 fireEvent.click(screen.getByRole("button", { name: "Add to Gemini Queue" })); await screen.findByText("Project created");
 expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/queue", { method: "POST", body: { title: "", idea: "A Roadster accelerates", scene_count: 2, aspect_ratio: "16:9", generation_settings: { version: "generation_settings.v1", mode: "dense_performance", performance_tempo: 2 } } });
 expect(apiMultipart).not.toHaveBeenCalled();
});
it.each([undefined, {}, { ...capability, max_bytes: 0 }])("fails closed on missing or malformed capability %j", async cap => {
 mount(cap ?? {}); expect(await screen.findByLabelText("Reference image file")).toBeDisabled();
 expect(await screen.findByText(/Subject Reference is unavailable/)).toBeVisible();
 expect(apiMultipart).not.toHaveBeenCalled();
});
it("fails closed when the capability endpoint cannot be read", async () => {
 mount(new Error("Capability check unavailable"));
 expect(await screen.findByLabelText("Reference image file")).toBeDisabled();
 expect(await screen.findByText(/Subject Reference is unavailable/)).toBeVisible();
});
it("previews, preserves across field edits, replaces and removes a reference", async () => {
 mount(); const input = await ready(); choose(input);
 expect(await screen.findByAltText("Subject reference preview")).toBeVisible();
 expect(screen.getByText(/roadster.png - 1200 by 800/)).toBeVisible();
 fireEvent.change(screen.getByLabelText(/Video title/), { target: { value: "Roadster commercial" } });
 fireEvent.change(screen.getByLabelText("Scene count"), { target: { value: "3" } });
 expect(screen.getByAltText("Subject reference preview")).toBeVisible();
 const click = vi.spyOn(input, "click"); fireEvent.click(screen.getByRole("button", { name: "Replace image" })); expect(click).toHaveBeenCalled();
 choose(input, image("replacement.png")); await screen.findByText(/replacement.png - 1200 by 800/);
 expect(URL.revokeObjectURL).toHaveBeenCalled(); fireEvent.click(screen.getByRole("button", { name: "Remove image" }));
 expect(screen.queryByAltText("Subject reference preview")).not.toBeInTheDocument(); expect(apiMultipart).not.toHaveBeenCalled();
});
it("blocks creation during decoding and discards a removed validation result", async () => {
 const pending = deferred<ReturnType<typeof bitmap>>(); vi.mocked(createImageBitmap).mockReturnValue(pending.promise as Promise<ImageBitmap>);
 mount(); const input = await ready(); choose(input);
 expect(screen.getByRole("button", { name: "Add to Gemini Queue" })).toBeDisabled();
 fireEvent.submit(screen.getByLabelText("Idea / story").closest("form")!); expect(apiMultipart).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole("button", { name: "Remove image" }));
 await act(async () => pending.resolve(bitmap()));
 expect(screen.queryByAltText("Subject reference preview")).not.toBeInTheDocument(); expect(screen.getByRole("button", { name: "Add to Gemini Queue" })).toBeEnabled();
});
it("keeps the latest replacement when validations finish out of order", async () => {
 const first = deferred<ReturnType<typeof bitmap>>(), second = deferred<ReturnType<typeof bitmap>>();
 vi.mocked(createImageBitmap).mockReturnValueOnce(first.promise as Promise<ImageBitmap>).mockReturnValueOnce(second.promise as Promise<ImageBitmap>);
 mount(); const input = await ready(); choose(input, image("older.png")); choose(input, image("newer.png"));
 await act(async () => second.resolve(bitmap())); await screen.findByText(/newer.png/);
 await act(async () => first.resolve(bitmap())); expect(screen.queryByText(/older.png/)).not.toBeInTheDocument(); expect(screen.getByText(/newer.png/)).toBeVisible();
});
it("shows decoded-image errors and requires replacement or removal before creation", async () => {
 vi.mocked(createImageBitmap).mockRejectedValueOnce(new Error("corrupt")); mount(); const input = await ready(); choose(input);
 expect(await screen.findByRole("alert")).toHaveTextContent("could not be decoded"); expect(screen.getByRole("button", { name: "Add to Gemini Queue" })).toBeDisabled();
 fireEvent.click(screen.getByRole("button", { name: "Remove image" })); expect(screen.getByRole("button", { name: "Add to Gemini Queue" })).toBeEnabled();
});
it("persists image and request atomically, locks fields and prevents repeated submission", async () => {
 const persist = deferred<{ job_id: string }>(); vi.mocked(apiMultipart).mockReturnValue(persist.promise); mount(); const input = await ready(); const file = image(); choose(input, file); await screen.findByAltText("Subject reference preview");
 const form = screen.getByLabelText("Idea / story").closest("form")!; fireEvent.submit(form); fireEvent.submit(form);
 expect(apiMultipart).toHaveBeenCalledTimes(1); expect(screen.getByLabelText("Production workflow")).toBeDisabled(); expect(screen.getByRole("button", { name: "Remove image" })).toBeDisabled(); expect(screen.queryByText("Project created")).not.toBeInTheDocument();
 const [path, body, requestOptions] = vi.mocked(apiMultipart).mock.calls[0]; expect(path).toBe("/gemini-autopilot/queue"); expect(body.get("subject_reference")).toBe(file); expect(JSON.parse(String(body.get("request")))).toMatchObject({ idea: "Same Roadster in a new coastal setting", generation_settings: { mode: "dense_performance", performance_tempo: 2 } }); expect(requestOptions?.headers).toHaveProperty("Idempotency-Key", expect.any(String));
 await act(async () => persist.resolve({ job_id: "created" })); await screen.findByText("Project created");
});
it("retains the selected image and idempotency key after upload failure, changing the key for edited requests", async () => {
 vi.mocked(apiMultipart).mockRejectedValue(new Error("Object storage unavailable")); mount(); const input = await ready(); choose(input); await screen.findByAltText("Subject reference preview");
 fireEvent.click(screen.getByRole("button", { name: "Add to Gemini Queue" })); expect(await screen.findByRole("alert")).toHaveTextContent("Object storage unavailable"); expect(screen.getByAltText("Subject reference preview")).toBeVisible();
 fireEvent.click(screen.getByRole("button", { name: "Add to Gemini Queue" })); await waitFor(() => expect(apiMultipart).toHaveBeenCalledTimes(2)); await screen.findByRole("alert");
 const key = (index: number) => (vi.mocked(apiMultipart).mock.calls[index][2]?.headers as Record<string, string>)["Idempotency-Key"];
 expect(key(0)).toBe(key(1)); fireEvent.change(screen.getByLabelText(/Video title/), { target: { value: "Revised title" } }); fireEvent.click(screen.getByRole("button", { name: "Add to Gemini Queue" })); await waitFor(() => expect(apiMultipart).toHaveBeenCalledTimes(3)); expect(key(2)).not.toBe(key(1));
});
it("clears the Gemini image on workflow switch and never sends it to Flow", async () => {
 mount(); const input = await ready(); choose(input); await screen.findByAltText("Subject reference preview");
 fireEvent.change(screen.getByLabelText("Production workflow"), { target: { value: "flow_web" } }); expect(screen.queryByAltText("Subject reference preview")).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole("button", { name: "Generate Storyboard" })); await screen.findByText("Project created"); expect(apiMultipart).not.toHaveBeenCalled();
 const request = vi.mocked(apiJson).mock.calls.find(([path]) => path === "/scene-video-jobs")?.[1]?.body; expect(request).not.toHaveProperty("subject_reference"); expect(request).toHaveProperty("reference_mode", "none");
});
it("discards an in-progress Gemini validation after switching to Flow and back", async () => {
 const pending = deferred<ReturnType<typeof bitmap>>(); vi.mocked(createImageBitmap).mockReturnValue(pending.promise as Promise<ImageBitmap>); mount(); const input = await ready(); choose(input);
 fireEvent.change(screen.getByLabelText("Production workflow"), { target: { value: "flow_web" } }); fireEvent.change(screen.getByLabelText("Production workflow"), { target: { value: "gemini_web" } });
 await act(async () => pending.resolve(bitmap())); expect(screen.queryByAltText("Subject reference preview")).not.toBeInTheDocument(); expect(screen.getByRole("button", { name: "Add to Gemini Queue" })).toBeEnabled();
});
it("blocks an already selected reference if provider support becomes unverified", async () => {
 mount(); const input = await ready(); choose(input); await screen.findByAltText("Subject reference preview");
 act(() => clients.at(-1)!.setQueryData(["geminiSubjectReferenceCapability"], { ...capability, supported: false, message: "Subject role needs verification." }));
 await waitFor(() => expect(screen.getByRole("button", { name: "Add to Gemini Queue" })).toBeDisabled()); fireEvent.submit(screen.getByLabelText("Idea / story").closest("form")!); expect(apiMultipart).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole("button", { name: "Remove image" })); expect(screen.getByRole("button", { name: "Add to Gemini Queue" })).toBeEnabled();
});
it.each([
 [new File(["gif"], "bad.gif", { type: "image/gif" }), /PNG or JPEG/],
 [new File([], "empty.png", { type: "image/png" }), /non-empty/],
 [new File([new Uint8Array(10485761)], "large.png", { type: "image/png" }), /10 MiB/],
])("rejects unsupported, empty and oversized files before decoding", async (file, message) => {
 await expect(validateSubjectReference(file, capability)).rejects.toThrow(message); expect(createImageBitmap).not.toHaveBeenCalled();
});
it.each([[4097, 1], [4001, 4000], [0, 10]])("rejects unsafe decoded dimensions %i x %i and releases the bitmap", async (width, height) => {
 const decoded = { width, height, close: vi.fn() }; vi.mocked(createImageBitmap).mockResolvedValue(decoded as unknown as ImageBitmap);
 await expect(validateSubjectReference(image(), capability)).rejects.toThrow(/Image dimensions/); expect(decoded.close).toHaveBeenCalled();
});

it("Flow displays Subject Reference (Flow Ingredients), locks continuity to independent, and submits multipart with idempotency key", async () => {
 const flowCap = { ...capability, supported: true, code: "flow_ingredients_supported" };
 vi.mocked(apiJson).mockImplementation(async path => {
  if (path === "/scene-video-options") return { ...options, flow_subject_reference_capability: flowCap };
  if (path === "/flow/subject-reference-capability") return flowCap;
  return { job_id: "flow-created" };
 });
 vi.mocked(apiMultipart).mockResolvedValue({ job_id: "flow-created" });
 const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); clients.push(client);
 render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/videos/new?workflow=flow_web"]}><Routes><Route path="/videos/new" element={<CreateSceneVideoPage/>}/><Route path="/scene-jobs/:id" element={<p>Project created</p>}/></Routes></MemoryRouter></QueryClientProvider>);

 expect(await screen.findByText("Subject Reference (Flow Ingredients)")).toBeVisible();
 const input = await screen.findByLabelText("Reference image file");
 expect(input).toBeEnabled();

 fireEvent.change(screen.getByLabelText("Idea / story"), { target: { value: "Tesla Roadster cruising along the coast" } });
 choose(input);
 await screen.findByAltText("Subject reference preview");

 // Verify continuity is locked to independent with clear limitation notice
 const advancedSummary = screen.getByText("Advanced settings");
 fireEvent.click(advancedSummary);
 const continuitySelect = screen.getByLabelText("Continuity");
 expect(continuitySelect).toBeDisabled();
 expect(continuitySelect).toHaveValue("independent");
 expect(screen.getByText(/Flow Ingredients guides character appearance across scenes and uses independent scene continuity/)).toBeVisible();

 // Submit form
 fireEvent.click(screen.getByRole("button", { name: "Generate Storyboard" }));
 await screen.findByText("Project created");

 expect(apiMultipart).toHaveBeenCalledWith("/scene-video-jobs", expect.any(FormData), expect.objectContaining({ headers: expect.objectContaining({ "Idempotency-Key": expect.any(String) }) }));
 const formData = vi.mocked(apiMultipart).mock.calls[0][1] as FormData;
 expect(formData.get("subject_reference")).toBeInstanceOf(File);
 const requestPayload = JSON.parse(formData.get("request") as string);
 expect(requestPayload.continuity_mode).toBe("independent");
 expect(requestPayload.reference_mode).toBe("none");
 expect(requestPayload.opening_image_required).toBe(false);
});

it("Flow Autopilot (unattended) submits multipart and enqueues into flow autopilot queue", async () => {
 const flowCap = { ...capability, supported: true, code: "flow_ingredients_supported" };
 vi.mocked(apiJson).mockImplementation(async path => {
  if (path === "/scene-video-options") return { ...options, flow_subject_reference_capability: flowCap };
  if (path === "/flow/subject-reference-capability") return flowCap;
  return { job_id: "unattended-created" };
 });
 vi.mocked(apiMultipart).mockResolvedValue({ job_id: "unattended-created" });
 const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); clients.push(client);
 render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/videos/new?workflow=flow_unattended"]}><Routes><Route path="/videos/new" element={<CreateSceneVideoPage/>}/><Route path="/scene-jobs/:id" element={<p>Project created</p>}/></Routes></MemoryRouter></QueryClientProvider>);

 const input = await screen.findByLabelText("Reference image file");
 await waitFor(() => expect(input).toBeEnabled());

 fireEvent.change(screen.getByLabelText("Idea / story"), { target: { value: "Tesla Roadster desert drift" } });
 choose(input);
 await screen.findByAltText("Subject reference preview");

 fireEvent.click(screen.getByRole("button", { name: "Add to Flow Queue" }));
 await screen.findByText("Project created");

 expect(apiMultipart).toHaveBeenCalledWith("/scene-video-jobs", expect.any(FormData), expect.any(Object));
 expect(apiJson).toHaveBeenCalledWith("/flow-autopilot/queue", { method: "POST", body: { job_id: "unattended-created" } });
});
