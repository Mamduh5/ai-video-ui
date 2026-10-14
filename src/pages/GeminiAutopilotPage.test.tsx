import {render,screen,fireEvent,waitFor,cleanup} from "@testing-library/react";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {MemoryRouter} from "react-router-dom";
import {afterEach,describe,it,expect,vi} from "vitest";
import {GeminiAutopilotPage,type AutopilotData} from "./GeminiAutopilotPage";
import {apiJson} from "../lib/apiClient";
vi.mock("../lib/apiClient",()=>({apiJson:vi.fn()}));
afterEach(()=>{cleanup();vi.clearAllMocks()});
const base:AutopilotData={server_now:"2026-10-10T08:00:00Z",available:true,runtime_notice:"Autopilot runs while this PC is awake and the backend is running. Creative quality has not been human reviewed.",capabilities:{aspect_ratios:["16:9"],native_seconds:10,max_scenes:8},scheduler:{enabled:true,configured_submission_cap:4,submissions_this_window:0,queue:[]}};
function mount(data=base){vi.mocked(apiJson).mockResolvedValue(data);render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter><GeminiAutopilotPage/></MemoryRouter></QueryClientProvider>)}
describe("Gemini Autopilot",()=>{
 it("shows provider waiting as a read-only check rather than another video attempt",async()=>{
  mount({...base,scheduler:{...base.scheduler,submissions_this_window:2,queue:[{job_id:"existing",title:"Existing project",status:"waiting_provider",scene_count:3,accepted_count:2,started:true,paused:false,scene_seconds:10,runs:[],diagnostic:{code:"video_tool_disabled",stage:"availability",source:"Gemini",message:"Create Video is disabled. No request sent.",retryable:true,next_retry_at:"2026-10-14T16:00:00Z"}}]}});
  expect(await screen.findByText("Waiting for Gemini video availability")).toBeInTheDocument();
  expect(screen.getByText(/Next read-only availability check:/)).toHaveTextContent("14/10/2026, 23:00:00 Bangkok");
  expect(screen.queryByText(/Automatic retry:/)).not.toBeInTheDocument();
  expect(screen.getByText(/2 \/ 4 submissions/)).toBeInTheDocument();
 });
 it("shows truthful planning failure and Bangkok automatic retry",async()=>{
  mount({...base,scheduler:{...base.scheduler,queue:[{job_id:"same",title:"Original video",status:"planning_retry",scene_count:4,accepted_count:0,started:false,paused:false,scene_seconds:10,runs:[],failure:"planner_timeout",diagnostic:{code:"planner_timeout",stage:"planning",source:"OpenCode Zen",message:"Storyboard planning timed out at OpenCode Zen. No Gemini video was submitted.",retryable:true,next_retry_at:"2026-10-11T01:30:00Z",diagnostic_reference:"original-run"}}]}});
  expect(await screen.findByText(/Storyboard planning timed out at OpenCode Zen/,{selector:"p"})).toBeInTheDocument();
  expect(screen.getByText(/Automatic retry/)).toHaveTextContent("11/10/2026, 08:30:00 Bangkok");
  expect(screen.getByText(/Diagnostic reference: original-run/)).toBeInTheDocument();
  expect(screen.queryByRole("button",{name:/Retry|Start|Accept/})).not.toBeInTheDocument();
 });
 it("shows separate storage, quota and application cap blockers with estimated reset",async()=>{
  mount({...base,scheduler:{...base.scheduler,submissions_this_window:4,provider_block_reason:"limit_reached",eligibility_estimated:true,quota_evidence_source:"User report",next_eligible_at:"2026-10-11T01:30:00Z",safety_eligible_at:"2026-10-10T20:45:00Z",storage_block:{code:"local_storage_critical",stage:"submission",source:"disk monitor",message:"Low local storage on C: measured reserve shortfall.",retryable:true}}});
  expect(await screen.findByText(/Low local storage on C:/,{selector:"p"})).toBeInTheDocument();
  expect(screen.getByText("Gemini usage limit reached")).toBeInTheDocument();
  expect(screen.getByText(/Application safety cap reached/)).toBeInTheDocument();
  expect(screen.getByText(/Next eligibility:/)).toHaveTextContent("ESTIMATE");
  expect(screen.getByText(/provider has not confirmed an exact reset/)).toBeInTheDocument();
 });
 it("clears the previous planning error when refreshed data reports readiness",async()=>{
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
  const item={job_id:"same",title:"Original video",status:"planning_retry",scene_count:4,accepted_count:0,started:false,paused:false,scene_seconds:10,runs:[],diagnostic:{code:"planner_timeout",stage:"planning",source:"OpenCode Zen",message:"Original timeout",retryable:true}};
  vi.mocked(apiJson).mockResolvedValue({...base,scheduler:{...base.scheduler,queue:[item]}});
  render(<QueryClientProvider client={client}><MemoryRouter><GeminiAutopilotPage/></MemoryRouter></QueryClientProvider>);
  expect(await screen.findByText("Original timeout")).toBeInTheDocument();
  client.setQueryData(["geminiAutopilot"],{...base,scheduler:{...base.scheduler,queue:[{...item,status:"ready",diagnostic:undefined}]}});
  await waitFor(()=>expect(screen.queryByText("Original timeout")).not.toBeInTheDocument());
  expect(screen.getByText("Ready for Gemini")).toBeInTheDocument();
 });
 it("shows empty queue and keeps diagnostics collapsed",async()=>{mount();expect(await screen.findByText(/Your queue is empty/)).toBeInTheDocument();expect(screen.getByText(/0 \/ 4 submissions/)).toBeInTheDocument();expect(screen.getByText("Diagnostics").closest("details")).not.toHaveAttribute("open")});
 it("queues an idea without storyboard or Start production",async()=>{mount();await screen.findByText(/Your queue is empty/);fireEvent.click(screen.getByRole("button",{name:"+ Queue Video"}));fireEvent.change(screen.getByLabelText("Idea"),{target:{value:"robot waves"}});fireEvent.click(screen.getByRole("button",{name:"Add to Queue"}));await waitFor(()=>expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/queue",{method:"POST",body:{title:"",idea:"robot waves",scene_count:2,aspect_ratio:"16:9"}}));expect(screen.queryByRole("button",{name:/Start production|Accept Scene/})).not.toBeInTheDocument()});
 it.each(["login_required","limit_reached","weekly_limit","reconciliation_required"])("displays provider block %s",async reason=>{mount({...base,scheduler:{...base.scheduler,provider_block_reason:reason,next_eligible_at:"2026-10-10T13:00:00Z"}});expect(await screen.findByText("Next eligibility:",{exact:false})).toBeInTheDocument();expect(screen.getByLabelText("Autopilot status").textContent).not.toContain(reason)});
 it("shows FIFO project progress, planning, attention and autopilot completion",async()=>{mount({...base,scheduler:{...base.scheduler,queue:["planning","generating","needs_attention","completed"].map((status,i)=>({job_id:`id${i}`,title:`Video ${i}`,status,scene_count:2,accepted_count:status==="completed"?2:0,started:status!=="planning",paused:false,scene_seconds:10,runs:[{scene_order:1,status:"generating"}]}))}});expect(await screen.findByText("Planning")).toBeInTheDocument();expect(screen.getByText("Needs attention")).toBeInTheDocument();expect(screen.getByText("Completed by Gemini Autopilot")).toBeInTheDocument();expect(screen.getAllByRole("link").filter(link=>link.getAttribute("href")?.startsWith("/scene-jobs/")).map(x=>x.textContent)).toEqual(["1. Video 0","2. Video 1","3. Video 2","4. Video 3"]);expect(screen.queryByText("scenes approved")).not.toBeInTheDocument()});
 it("persists pause and exposes resume",async()=>{mount();fireEvent.click(await screen.findByRole("button",{name:"Pause Autopilot"}));await waitFor(()=>expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/control/pause",{method:"POST",body:undefined}))});
 it("displays waiting eligibility and configured cap",async()=>{mount({...base,scheduler:{...base.scheduler,submissions_this_window:4,next_eligible_at:"2026-10-10T13:00:00Z"}});expect(await screen.findByText("Waiting for next window")).toBeInTheDocument();expect(screen.getByText(/4 \/ 4 submissions/)).toBeInTheDocument()});
});
