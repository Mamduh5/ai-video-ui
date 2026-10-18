import {render,screen,fireEvent,waitFor,cleanup,within} from "@testing-library/react";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {MemoryRouter} from "react-router-dom";
import {afterEach,describe,it,expect,vi} from "vitest";
import {GeminiAutopilotPage,type AutopilotData} from "./GeminiAutopilotPage";
import {apiJson} from "../lib/apiClient";
vi.mock("../lib/apiClient",()=>({apiJson:vi.fn()}));
afterEach(()=>{cleanup();vi.clearAllMocks()});
const base:AutopilotData={server_now:"2026-10-15T10:00:00Z",available:true,planning_available:true,runtime_notice:"Keep the PC awake and the backend running.",capabilities:{aspect_ratios:["16:9"],native_seconds:10,max_scenes:20},scheduler:{enabled:true,configured_submission_cap:4,submissions_this_window:0,queue:[]}};
const item={job_id:"existing",title:"The Loading Bar Fights Back",status:"ready",scene_count:3,accepted_count:0,started:false,paused:false,scene_seconds:10,runs:[]};
const observation={id:"fresh-check",at:base.server_now,status:"connected",video_tool_enabled:true,reset_observed:false,usage:{fresh:true,current_percent:0,weekly_percent:4,reset_display:"Reset at 22:18"}};
const held:AutopilotData={...base,accounting_review:{can_release:false,reason:"A new allowance window has not been observed yet."},scheduler:{...base.scheduler,enabled:false,recovery_only:true,provider_block_reason:"external_submission_accounting",submissions_this_window:3,window_started_at:"2026-10-14T12:23:00Z",provider_observation:observation,queue:[item]}};
function mount(data=base){vi.mocked(apiJson).mockResolvedValue(data);const client=new QueryClient({defaultOptions:{queries:{retry:false}}});render(<QueryClientProvider client={client}><MemoryRouter><GeminiAutopilotPage/></MemoryRouter></QueryClientProvider>);return client}
describe("Gemini Studio",()=>{
 it("offers Force Retry for an existing failed project despite stale video availability and cooldowns",async()=>{
  mount({...base,force_retry_status:{existing:{job_id:"existing",scene_order:2,available:true}},scheduler:{...base.scheduler,enabled:false,next_eligible_at:"2026-10-18T10:00:00Z",provider_block_reason:"video_tool_disabled",provider_observation:{...observation,at:"2026-10-14T10:00:00Z",status:"video_tool_disabled",video_tool_enabled:false},queue:[{...item,status:"needs_attention",accepted_count:1}]}});
  const button=await screen.findByRole("button",{name:"Force Retry Now"});
  expect(button).toBeEnabled();
  fireEvent.click(button);
  expect(screen.getByRole("dialog",{name:"Confirm Force Retry"})).toBeVisible();
  expect(vi.mocked(apiJson).mock.calls.some(([,options])=>options?.method==="POST")).toBe(false);
 });

 it("offers Resume after a fresh check clears a page error without redoing accounting or starting production",async()=>{
  const failed={...base,scheduler:{...base.scheduler,provider_block_reason:"ui_unavailable",provider_observation:observation,queue:[{...item,diagnostic:{code:"ui_unavailable",stage:"readiness",source:"Gemini",message:"The Gemini interface could not be matched safely."}}]}};
  mount(failed);await screen.findByText("Connected");let checked=false;
  vi.mocked(apiJson).mockImplementation(async(path,options)=>{
   if(path==="/gemini-autopilot/check"){checked=true;return {status:"checked"};}
   if(options?.method==="POST")return {status:"saved"};
   return checked?{...failed,scheduler:{...failed.scheduler,enabled:false,provider_block_reason:undefined}}:failed;
  });
  fireEvent.click(screen.getByRole("button",{name:"Check Gemini & Resume"}));
  const panel=await screen.findByRole("region",{name:"Gemini recovery review"});
  expect(await within(panel).findByRole("button",{name:"Resume Autopilot"})).toBeEnabled();
  expect(screen.queryByText("One-time recovery confirmation")).not.toBeInTheDocument();
  expect(screen.getByText("Gemini check complete. Review the result below; generation has not started.")).toBeVisible();
  expect(within(screen.getByLabelText("Video queue")).queryByText("The Gemini interface could not be matched safely.")).not.toBeInTheDocument();
  expect(within(screen.getByText("Advanced Diagnostics").closest("details")!).getByText("The Gemini interface could not be matched safely.")).toBeInTheDocument();
  expect(vi.mocked(apiJson).mock.calls.some(([path])=>String(path).includes("/control/resume")||String(path).includes("/accounting/release"))).toBe(false);
 });
 it("explains the owner's short note and unchecked confirmation instead of silently disabling recovery",async()=>{
  mount({...held,accounting_review:{can_release:false,can_confirm_observed_reset:true,reason:"Owner review available."}});
  fireEvent.click(await screen.findByRole("button",{name:"Check Gemini & Resume"}));
  const note=await screen.findByLabelText("What did you observe when Gemini usage reset?");
  fireEvent.change(note,{target:{value:"at zero"}});
  const close=screen.getByRole("button",{name:"Close old window"});
  expect(close).toBeDisabled();expect(note).toHaveAttribute("aria-invalid","true");
  expect(note).toHaveAccessibleDescription(/at least 15 characters.*8 more characters needed/);
  expect(screen.getByText("To enable Close old window, add 8 more characters to your observation.")).toBeVisible();
  expect(screen.getByText(/Select the confirmation checkbox to approve/)).toBeVisible();
  fireEvent.change(note,{target:{value:"I observed the usage reset after the earlier submissions."}});
  expect(close).toBeDisabled();expect(note).toHaveAttribute("aria-invalid","false");
  fireEvent.click(screen.getByRole("checkbox"));
  expect(close).toBeEnabled();expect(screen.getByText("Confirmation complete. Close old window is ready.")).toBeVisible();
  expect(vi.mocked(apiJson).mock.calls.some(([path])=>String(path).includes("/accounting/release"))).toBe(false);
 });
 it("requires renewed confirmation when the provider reading changes",async()=>{
  const ready={...held,accounting_review:{can_release:true,reason:"Fresh rollover observed."}};
  const client=mount(ready);
  fireEvent.click(await screen.findByRole("button",{name:"Check Gemini & Resume"}));
  const close=await screen.findByRole("button",{name:"Close old window"});
  fireEvent.click(screen.getByRole("checkbox"));expect(close).toBeEnabled();
  client.setQueryData(["geminiAutopilot"],{...ready,scheduler:{...ready.scheduler,provider_observation:{...observation,id:"new-reading"}}});
  await waitFor(()=>expect(close).toBeDisabled());expect(screen.getByRole("checkbox")).not.toBeChecked();
 });
 it("brings the required confirmation into focus and continues the same review instead of checking repeatedly",async()=>{
  mount(held);
  fireEvent.click(await screen.findByRole("button",{name:"Check Gemini & Resume"}));
  const review=await screen.findByRole("region",{name:"Gemini recovery review"});
  await waitFor(()=>expect(review).toHaveFocus());
  expect(within(review).getByText(/Step 2 of 3/)).toBeVisible();
  expect(review.compareDocumentPosition(screen.getByLabelText("Autopilot status"))&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Continue recovery"}));
  expect(vi.mocked(apiJson).mock.calls.filter(([path])=>path==="/gemini-autopilot/check")).toHaveLength(1);
  expect(vi.mocked(apiJson).mock.calls.some(([path])=>String(path).includes("/control/resume"))).toBe(false);
 });
 it("keeps the final Resume action in the same visible panel after recovery confirmation",async()=>{
  const ready={...held,accounting_review:{can_release:true,reason:"Fresh rollover observed."}};
  mount(ready);await screen.findByText("Connected");
  let released=false;
  vi.mocked(apiJson).mockImplementation(async(path,options)=>{
   if(path==="/gemini-autopilot/accounting/release"){released=true;return {status:"reviewed"};}
   if(options?.method==="POST")return {status:"saved"};
   return released?{...base,scheduler:{...base.scheduler,enabled:false,provider_observation:observation}}:ready;
  });
  fireEvent.click(screen.getByRole("button",{name:"Check Gemini & Resume"}));
  const close=await screen.findByRole("button",{name:"Close old window"});
  fireEvent.click(screen.getByRole("checkbox"));fireEvent.click(close);
  const panel=screen.getByRole("region",{name:"Gemini recovery review"});
  const resume=await within(panel).findByRole("button",{name:"Resume Autopilot"});
  expect(within(panel).getByText(/Step 3 of 3/)).toBeVisible();expect(panel).toHaveFocus();
  expect(vi.mocked(apiJson).mock.calls.some(([path])=>String(path).includes("/control/resume"))).toBe(false);
  fireEvent.click(resume);
  await waitFor(()=>expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/control/resume",{method:"POST",body:undefined}));
 });
 it("requires a separate owner observation when only a fresh zero usage reading exists",async()=>{mount({...held,accounting_review:{can_release:false,can_confirm_observed_reset:true,reason:"No rollover observed automatically."}});fireEvent.click(await screen.findByRole("button",{name:"Check Gemini & Resume"}));const close=await screen.findByRole("button",{name:"Close old window"});fireEvent.click(screen.getByRole("checkbox"));expect(close).toBeDisabled();fireEvent.change(screen.getByLabelText("What did you observe when Gemini usage reset?"),{target:{value:"I saw Gemini usage reset after the earlier submissions."}});expect(close).toBeEnabled();fireEvent.click(close);await waitFor(()=>expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/accounting/release",{method:"POST",body:{observation_id:"fresh-check",owner_confirmed:true,owner_reset_observed:true,owner_reset_note:"I saw Gemini usage reset after the earlier submissions."}}));});
 it("prioritizes browser, planning, video state and the existing queued project",async()=>{mount(held);expect(await screen.findByText("Connected")).toBeInTheDocument();expect(screen.getByText("Can prepare ideas")).toBeInTheDocument();expect(screen.getByText("Review needed")).toBeInTheDocument();expect(screen.getByRole("link",{name:/The Loading Bar Fights Back/})).toHaveAttribute("href","/scene-jobs/existing");expect(screen.getByRole("button",{name:"Check Gemini & Resume"})).toBeEnabled();expect(screen.queryByRole("button",{name:"Resume Autopilot"})).not.toBeInTheDocument()});
 it("checks without resuming or releasing when evidence is insufficient",async()=>{mount(held);fireEvent.click(await screen.findByRole("button",{name:"Check Gemini & Resume"}));expect(await screen.findByText(held.accounting_review!.reason)).toBeVisible();expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/check",{method:"POST",body:undefined});expect(screen.queryByRole("button",{name:"Close old window"})).not.toBeInTheDocument();expect(vi.mocked(apiJson).mock.calls.some(([path])=>String(path).includes("/control/resume"))).toBe(false)});
 it("requires explicit confirmation tied to the observed snapshot and keeps Resume separate",async()=>{mount({...held,accounting_review:{can_release:true,reason:"Fresh rollover observed."}});fireEvent.click(await screen.findByRole("button",{name:"Check Gemini & Resume"}));const close=await screen.findByRole("button",{name:"Close old window"});expect(close).toBeDisabled();fireEvent.click(screen.getByRole("checkbox"));expect(close).toBeEnabled();fireEvent.click(close);await waitFor(()=>expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/accounting/release",{method:"POST",body:{observation_id:"fresh-check",owner_confirmed:true}}));expect(vi.mocked(apiJson).mock.calls.some(([path])=>String(path).includes("/control/resume"))).toBe(false)});
 it("offers ordinary Resume after accounting release",async()=>{mount({...base,scheduler:{...base.scheduler,enabled:false,provider_observation:observation}});fireEvent.click(await screen.findByRole("button",{name:"Resume Autopilot"}));await waitFor(()=>expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/control/resume",{method:"POST",body:undefined}))});
 it("queues ideas while held without invoking generation or release",async()=>{mount(held);await screen.findByText("Connected");fireEvent.click(screen.getByRole("button",{name:"+ Queue Video"}));fireEvent.change(screen.getByLabelText("Idea"),{target:{value:"robot waves"}});fireEvent.click(screen.getByRole("button",{name:"Add to Queue"}));await waitFor(()=>expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/queue",{method:"POST",body:{title:"",idea:"robot waves",scene_count:2,aspect_ratio:"16:9",generation_settings:{version:"generation_settings.v1",mode:"dense_performance",performance_tempo:2}}}));expect(vi.mocked(apiJson).mock.calls.filter(([,options])=>options?.method==="POST")).toHaveLength(1)});
 it("organizes the existing queue using item controls",async()=>{mount({...held,scheduler:{...held.scheduler,queue:[item,{...item,job_id:"second",title:"Second idea"}]}});fireEvent.click(await screen.findByRole("button",{name:"Move Second idea up"}));await waitFor(()=>expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/items/second/up",{method:"POST",body:undefined}))});
 it("keeps accounting, run references and raw state inside closed Advanced Diagnostics",async()=>{mount({...held,scheduler:{...held.scheduler,queue:[{...item,diagnostic:{code:"planner_timeout",stage:"planning",source:"Planner",message:"Planning timed out",diagnostic_reference:"private-run"}}]}});const details=(await screen.findByText("Advanced Diagnostics")).closest("details")!;expect(details).not.toHaveAttribute("open");expect(within(details).getByText(/3 \/ 4 application-counted/)).toBeInTheDocument();expect(within(details).getByText(/Diagnostic reference: private-run/)).toBeInTheDocument();expect(screen.getByLabelText("Autopilot status").textContent).not.toContain("private-run")});
 it("preserves external owner attribution and separates provider counts",async()=>{mount({...held,scheduler:{...held.scheduler,queue:[{...item,status:"completed",external_recoveries:[{status:"completed",provider_submissions:1,application_window_started_at:held.scheduler.window_started_at}]}]}});expect(await screen.findByText("Completed with owner recovery")).toBeInTheDocument();expect(screen.getByText(/4 known provider submissions/)).toBeInTheDocument();expect(screen.queryByText("Completed by Gemini Autopilot")).not.toBeInTheDocument()});
 it.each(["login_required","limit_reached","weekly_limit","reconciliation_required"])("explains %s without surfacing diagnostic codes",async reason=>{mount({...base,scheduler:{...base.scheduler,provider_block_reason:reason}});const status=await screen.findByLabelText("Autopilot status");expect(status.textContent).not.toContain(reason);expect(screen.getByRole("button",{name:"Check Gemini & Resume"})).toBeEnabled()});
 it("shows the next automatic check in Bangkok",async()=>{mount({...held,scheduler:{...held.scheduler,observation_next_at:"2026-10-15T10:30:00Z"}});expect(await screen.findByText(/Next automatic check:/)).toHaveTextContent("15/10/2026, 17:30:00 Bangkok")});
 it("labels shared usage without claiming remaining video requests",async()=>{mount(held);fireEvent.click(await screen.findByRole("button",{name:"Check Gemini & Resume"}));expect(await screen.findByText(/Gemini shared usage:/)).toHaveTextContent("0% used");expect(screen.getByText(/Remaining video requests are unknown/)).toBeVisible();expect(screen.getByText(/Application safety limit:/)).toHaveTextContent("4 submissions per window")});
 it("clears old planning failure after a ready refresh",async()=>{const client=mount({...base,scheduler:{...base.scheduler,queue:[{...item,status:"planning_retry",diagnostic:{code:"planner_timeout",stage:"planning",source:"Planner",message:"Original timeout"}}]}});await screen.findAllByText("Original timeout");client.setQueryData(["geminiAutopilot"],{...base,scheduler:{...base.scheduler,queue:[item]}});await waitFor(()=>expect(screen.queryByText("Original timeout")).not.toBeInTheDocument());expect(screen.getByText("Ready for Gemini")).toBeInTheDocument()});
 it("persists pause",async()=>{mount();fireEvent.click(await screen.findByRole("button",{name:"Pause Autopilot"}));await waitFor(()=>expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/control/pause",{method:"POST",body:undefined}))});
 it("shows an empty queue and no automatic production button",async()=>{mount();expect(await screen.findByText(/Your queue is empty/)).toBeInTheDocument();expect(screen.queryByRole("button",{name:/Start production|Accept scene/i})).not.toBeInTheDocument()});
 it("recovers a confirmed provider failure via Check & Recover and offers Retry Scene without exposing run IDs",async()=>{
  const stuck:AutopilotData={
   ...base,
   worker_enabled:false,
   recovery_status:{
    needs_recovery:true,
    state:"needs_check",
    job_id:"e01f77d0-7a21-4aa6-8fe7-fa9581489855",
    project_title:"Swarm War: Flies vs the Titan Ant",
    scene_order:3,
    scene_count:4,
    scene_title:"THE COUNTERATTACK",
    run_id:"99e2f931-6433-4d6c-8d0e-f41c8024eb70",
    failure_code:"provider_error",
    failure_reason:'Gemini returned an error instead of a video ("I seem to be encountering an error. Can I try something else for you?").',
    outcome_summary:"Click Check & Recover to inspect the previous Gemini request without spending credits.",
    can_check_and_recover:true,
    can_retry_scene:false,
    can_recover_video:false,
    can_wait_and_recheck:false,
    can_edit_prompt:false,
    can_confirm_uncertain:false,
   },
   scheduler:{...base.scheduler,enabled:false,provider_block_reason:"reconciliation_required",submissions_this_window:1,queue:[{...item,job_id:"e01f77d0-7a21-4aa6-8fe7-fa9581489855",title:"Swarm War: Flies vs the Titan Ant",status:"recovering",scene_count:4,accepted_count:2,started:true}]},
  };
  const resolved:AutopilotData={
   ...stuck,
   recovery_status:{
    ...stuck.recovery_status!,
    needs_recovery:false,
    state:"resolved_ready_to_retry",
    outcome_summary:"Confirmed that Gemini produced no video for the failed attempt. The safety reservation was released and this scene is ready for a controlled retry.",
    can_retry_scene:true,
    can_edit_prompt:true,
   },
   scheduler:{...stuck.scheduler,provider_block_reason:undefined,queue:[{...stuck.scheduler.queue[0],status:"ready"}]},
  };
  let checked=false;
  vi.mocked(apiJson).mockImplementation(async(path,options)=>{
   if(path==="/gemini-autopilot/recover"&&options?.method==="POST"){checked=true;return {status:"ok"};}
   return checked?resolved:stuck;
  });
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
  render(<QueryClientProvider client={client}><MemoryRouter><GeminiAutopilotPage/></MemoryRouter></QueryClientProvider>);
  const panel=await screen.findByRole("region",{name:"Scene recovery"});
  expect(within(panel).getByText(/Swarm War: Flies vs the Titan Ant · Scene 3 of 4 — THE COUNTERATTACK/)).toBeVisible();
  expect(within(panel).getByText(/I seem to be encountering an error/)).toBeVisible();
  expect(panel.textContent).not.toContain("99e2f931-6433-4d6c-8d0e-f41c8024eb70");
  expect(screen.getByRole("button",{name:"+ Queue Video"})).toBeEnabled();
  const checkBtn=within(panel).getByRole("button",{name:"Check & Recover"});
  fireEvent.click(checkBtn);
  fireEvent.click(checkBtn);
  await waitFor(()=>expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/recover",{method:"POST",body:{action:"check"}}));
  expect(vi.mocked(apiJson).mock.calls.filter(([path])=>path==="/gemini-autopilot/recover")).toHaveLength(1);
  const retryBtn=await within(panel).findByRole("button",{name:"Retry Scene"});
  expect(retryBtn).toBeEnabled();
  fireEvent.click(retryBtn);
  await waitFor(()=>expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/recover",{method:"POST",body:{action:"retry_scene",job_id:"e01f77d0-7a21-4aa6-8fe7-fa9581489855"}}));
 });
 it("offers Recover Completed Video and Wait & Recheck for discovered video or in-progress turn",async()=>{
  const withVideo:AutopilotData={
   ...base,
   recovery_status:{
    needs_recovery:true,
    state:"video_available",
    job_id:"existing",
    project_title:"The Loading Bar Fights Back",
    scene_order:1,
    scene_count:3,
    outcome_summary:"A completed video for this scene is available and can be recovered into your project without regenerating.",
    can_check_and_recover:true,
    can_retry_scene:false,
    can_recover_video:true,
    can_wait_and_recheck:false,
    can_edit_prompt:false,
    can_confirm_uncertain:false,
   },
   scheduler:{...base.scheduler,provider_block_reason:"result_recovery_pending",queue:[item]},
  };
  const client=mount(withVideo);
  const panel=await screen.findByRole("region",{name:"Scene recovery"});
  fireEvent.click(within(panel).getByRole("button",{name:"Recover Completed Video"}));
  await waitFor(()=>expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/recover",{method:"POST",body:{action:"recover_video"}}));
  client.setQueryData(["geminiAutopilot"],{...withVideo,recovery_status:{...withVideo.recovery_status!,state:"in_progress",can_recover_video:false,can_wait_and_recheck:true,failure_reason:"Gemini is still processing this video request."}});
  const waitBtn=await within(panel).findByRole("button",{name:"Wait & Recheck"});
  fireEvent.click(waitBtn);
  await waitFor(()=>expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/recover",{method:"POST",body:{action:"recheck"}}));
 });
 it("guides the owner through uncertain submission confirmation and prompt editing on repeated failure",async()=>{
  const uncertain:AutopilotData={
   ...base,
   recovery_status:{
    needs_recovery:true,
    state:"uncertain_confirmation_required",
    job_id:"existing",
    run_id:"uncertain-run-1",
    project_title:"The Loading Bar Fights Back",
    scene_order:2,
    scene_count:3,
    current_prompt:"Original camera pan across the loading bar.",
    outcome_summary:"Studio could not verify whether Gemini created a video because the original conversation is no longer visible.",
    can_check_and_recover:true,
    can_retry_scene:false,
    can_recover_video:false,
    can_wait_and_recheck:true,
    can_edit_prompt:false,
    can_confirm_uncertain:true,
   },
   scheduler:{...base.scheduler,provider_block_reason:"reconciliation_required",queue:[item]},
  };
  const client=mount(uncertain);
  const panel=await screen.findByRole("region",{name:"Scene recovery"});
  const confirmBtn=within(panel).getByRole("button",{name:"Confirm No Video & Unlock Retry"});
  expect(confirmBtn).toBeDisabled();
  fireEvent.change(within(panel).getByLabelText("What did you observe in the Gemini browser window?"),{target:{value:"Checked Gemini chat; no video was generated."}});
  fireEvent.click(within(panel).getByRole("checkbox"));
  expect(confirmBtn).toBeEnabled();
  fireEvent.click(confirmBtn);
  await waitFor(()=>expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/recover",{method:"POST",body:{action:"confirm_uncertain",job_id:"existing",run_id:"uncertain-run-1",confirmed:true,note:"Checked Gemini chat; no video was generated."}}));
  client.setQueryData(["geminiAutopilot"],{...uncertain,recovery_status:{...uncertain.recovery_status!,state:"prompt_edit_recommended",can_confirm_uncertain:false,can_edit_prompt:true,can_retry_scene:true}});
  const promptBox=await within(panel).findByLabelText("Revise scene prompt before retrying");
  fireEvent.change(promptBox,{target:{value:"Updated cinematic tracking shot of the glowing loading bar."}});
  fireEvent.click(within(panel).getByRole("button",{name:"Save Prompt & Retry Scene"}));
  await waitFor(()=>expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/recover",{method:"POST",body:{action:"edit_prompt",job_id:"existing",scene_order:2,prompt:"Updated cinematic tracking shot of the glowing loading bar."}}));
 });
 it("refreshes recommended saved prompts while preserving an explicit edit until Cancel",async()=>{
  const recovery:AutopilotData={...base,recovery_status:{needs_recovery:true,state:"prompt_edit_recommended",job_id:"existing",scene_order:2,current_prompt:"Original saved camera movement.",can_check_and_recover:true,can_retry_scene:true,can_recover_video:false,can_wait_and_recheck:true,can_edit_prompt:true,can_confirm_uncertain:false},scheduler:{...base.scheduler,provider_block_reason:"reconciliation_required",queue:[item]}};
  const client=mount(recovery);
  const prompt=await screen.findByLabelText("Revise scene prompt before retrying");
  expect(prompt).toHaveValue("Original saved camera movement.");
  const updated={...recovery,recovery_status:{...recovery.recovery_status!,current_prompt:"Updated saved camera movement."}};
  client.setQueryData(["geminiAutopilot"],updated);
  await waitFor(()=>expect(screen.getByLabelText("Revise scene prompt before retrying")).toHaveValue("Updated saved camera movement."));
  client.setQueryData(["geminiAutopilot"],{...updated,recovery_status:{...updated.recovery_status,state:"resolved_ready_to_retry"}});
  fireEvent.click(await screen.findByRole("button",{name:"Edit Scene Prompt"}));
  fireEvent.change(screen.getByLabelText("Revise scene prompt before retrying"),{target:{value:"Unsaved owner edit must survive polling."}});
  client.setQueryData(["geminiAutopilot"],{...updated,recovery_status:{...updated.recovery_status,current_prompt:"Latest saved camera movement."}});
  await waitFor(()=>expect(screen.getByLabelText("Revise scene prompt before retrying")).toHaveValue("Unsaved owner edit must survive polling."));
  fireEvent.click(screen.getByRole("button",{name:"Cancel"}));
  await waitFor(()=>expect(screen.getByLabelText("Revise scene prompt before retrying")).toHaveValue("Latest saved camera movement."));
  expect(vi.mocked(apiJson).mock.calls.some(([,options])=>options?.method==="POST")).toBe(false);
 });

});

