import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FlowGenerationPanel } from "./FlowGenerationPanel";
import { shouldPollSceneJob } from "./sceneReviewExecution";
afterEach(() => vi.unstubAllGlobals());
function show(runs?: Parameters<typeof FlowGenerationPanel>[0]["runs"]) { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); const changed = vi.fn(); render(<QueryClientProvider client={client}><FlowGenerationPanel jobId="job" order={1} runs={runs} hasClip={false} onChanged={changed} /></QueryClientProvider>); return changed; }
describe("Flow generation", () => {
 it("requests one durable run from the actual button and polling only reads status", async () => { const calls: string[] = []; vi.stubGlobal("fetch", vi.fn(async (url: string) => { calls.push(url); return new Response(JSON.stringify(url.includes("readiness") ? { status: "ready" } : { job: {} }), { status: 200, headers: { "Content-Type": "application/json" } }); })); const changed = show(); const button = await screen.findByRole("button", { name: "Generate in Flow" }); await waitFor(() => expect(button).toBeEnabled()); await userEvent.click(button); expect(calls.filter(url => url.endsWith("/flow/generate"))).toHaveLength(1); expect(changed).toHaveBeenCalledOnce(); expect(shouldPollSceneJob({ status: "awaiting_external_generation", scenes: [{ flow_runs: [{ status: "generating" }] }] })).toBe(true); expect(shouldPollSceneJob({ status: "awaiting_human_decision", scenes: [{ flow_runs: [{ status: "completed" }] }] })).toBe(false); });
 it("resumes an uncertain run explicitly with reconciliation wording", async () => { const calls: string[] = []; vi.stubGlobal("fetch", vi.fn(async (url: string) => { calls.push(url); return new Response(JSON.stringify({ status: "ready" }), { status: 200, headers: { "Content-Type": "application/json" } }); })); show([{ run_id: "run", status: "human_action_required", submission_intent: true, failure: "generation_submission_uncertain" }]); expect(screen.getByText(/never clicks Generate again/)).toBeInTheDocument(); await userEvent.click(screen.getByRole("button", { name: "Resume" })); expect(calls.some(url => url.endsWith("/flow/resume"))).toBe(true); expect(calls.some(url => url.endsWith("/flow/generate"))).toBe(false); });
});

it("requires possible-charge acknowledgment and resolves without issuing Generate", async () => {
 const requests: {url:string;body?:string}[]=[];
 vi.stubGlobal("fetch",vi.fn(async(url:string,init?:RequestInit)=>{requests.push({url,body:init?.body as string|undefined});return new Response(JSON.stringify({status:"ready"}),{status:200,headers:{"Content-Type":"application/json"}})}));
 const changed=show([{run_id:"uncertain",status:"human_action_required",submission_intent:true}]);
 const resolve=screen.getByRole("button",{name:"Resolve without result"});expect(resolve).toBeDisabled();
 await userEvent.click(screen.getByRole("checkbox"));await userEvent.click(resolve);
 await waitFor(()=>expect(changed).toHaveBeenCalledOnce());
 const request=requests.find(r=>r.url.endsWith("/flow/reconcile-no-result"));
 expect(JSON.parse(request?.body??"null")).toEqual({run_id:"uncertain",acknowledge_possible_charge:true});
 expect(requests.some(r=>r.url.endsWith("/flow/generate"))).toBe(false);
});
