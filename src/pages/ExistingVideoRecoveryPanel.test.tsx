import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiJson, apiMultipart } from "../lib/apiClient";
import { ExistingVideoRecoveryPanel, type ExistingVideoRecovery } from "./ExistingVideoRecoveryPanel";

vi.mock("../lib/apiClient", () => ({apiJson: vi.fn(), apiMultipart: vi.fn()}));
const run: ExistingVideoRecovery = {run_id:"saved-original",scene_order:2,submitted_at:"2026-10-22T01:00:00Z",prompt:"Original request",aspect_ratio:"9:16",state:"ready_to_download",message:"Original video available",busy:false,can_recover:true,can_upload:true};
function show(value=run) {vi.mocked(apiJson).mockResolvedValue({recoveries:[value]}); const client=new QueryClient({defaultOptions:{queries:{retry:false}}});return render(<QueryClientProvider client={client}><ExistingVideoRecoveryPanel jobId="original-project" title="My project" onChanged={()=>{}}/></QueryClientProvider>);}
beforeEach(()=>{vi.clearAllMocks();Object.defineProperty(URL,"createObjectURL",{configurable:true,value:vi.fn(()=>"blob:original")});Object.defineProperty(URL,"revokeObjectURL",{configurable:true,value:vi.fn()});});
it("downloads only the selected original run and disables repeated clicks",async()=>{
 show();await screen.findByRole("button",{name:"Recover Existing Video"});let release!:()=>void;
 vi.mocked(apiJson).mockImplementation(async(path,options)=>{if(options?.method==="POST"){await new Promise<void>(resolve=>{release=resolve});}return {recoveries:[run]} as never;});
 fireEvent.click(screen.getByRole("button",{name:"Recover Existing Video"}));fireEvent.click(screen.getByRole("button",{name:"Recovering…"}));
 expect(screen.getByRole("button",{name:"Recovering…"})).toBeDisabled();expect(vi.mocked(apiJson).mock.calls.filter(([,o])=>o?.method==="POST")).toEqual([["/gemini-autopilot/projects/original-project/video-recovery/saved-original/recover",{method:"POST"}]]);release();
});
it("offers preview and explicit owner association after download failure, then uploads without generating",async()=>{
 show({...run,state:"download_failed"});const user=userEvent.setup();const input=await screen.findByLabelText("Original Gemini MP4");
 await user.upload(input,new File(["fixture"],"original.mp4",{type:"video/mp4"}));
 const submit=screen.getByRole("button",{name:"Validate and import original MP4"});expect(submit).toBeDisabled();
 fireEvent.loadedData(screen.getByLabelText("Recovered MP4 preview"));expect(submit).toBeDisabled();await user.click(screen.getByRole("checkbox"));expect(submit).toBeEnabled();
 vi.mocked(apiMultipart).mockResolvedValue({recoveries:[{...run,state:"completed"}]});await user.click(submit);
 await waitFor(()=>expect(apiMultipart).toHaveBeenCalledTimes(1));const [path,body]=vi.mocked(apiMultipart).mock.calls[0];expect(path).toContain("saved-original/upload");expect(body.get("confirmed")).toBe("true");expect(body.get("file")).toBeInstanceOf(File);
 expect(vi.mocked(apiJson).mock.calls.some(([path])=>/force-retry|queue|submit|generate/.test(path))).toBe(false);
});
it("shows durable owner attribution after reload without provider-verified claims",async()=>{show({...run,state:"completed",can_recover:false,can_upload:false,provenance:{source:"owner_attributed_original",owner_confirmed:true}});expect(await screen.findByText("Recovery completed")).toBeVisible();expect(screen.getByText(/Provider attribution was not verified/)).toBeVisible();expect(screen.queryByRole("button",{name:"Recover Existing Video"})).not.toBeInTheDocument();});
it("rejects oversized and unplayable files and resets confirmation on replacement",async()=>{show({...run,state:"waiting_owner_mp4"});await screen.findByLabelText("Original Gemini MP4");await userEvent.upload(screen.getByLabelText("Original Gemini MP4"),new File(["bad"],"original.mp4",{type:"video/mp4"}));fireEvent.error(screen.getByLabelText("Recovered MP4 preview"));expect(screen.getByRole("alert")).toHaveTextContent("cannot be previewed");expect(screen.getByRole("button",{name:"Validate and import original MP4"})).toBeDisabled();});
