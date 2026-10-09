import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiJson } from "../lib/apiClient";

export type FlowRun = { run_id: string; status: string; failure?: string; submission_intent: boolean; evidence?: { model?: string; duration?: number; aspect?: string }; history?: { status: string; at: string }[] };
const flowActive = (run?: FlowRun) => ["queued", "opening_provider", "submission_intent", "submitted", "generating", "downloading", "importing"].includes(run?.status ?? "");
const labels: Record<string, string> = { queued: "Queued", opening_provider: "Opening Flow...", submission_intent: "Submitting in Flow...", submitted: "Submitted in Flow", generating: "Generating in Flow...", downloading: "Downloading result...", importing: "Importing result...", completed: "Imported", human_action_required: "Flow needs attention", failed: "Flow generation failed" };

export function FlowGenerationPanel({ jobId, order, runs, hasClip, regenerationInstructions, canGenerate = true, canResume = true, locked = false, onChanged }: { jobId: string; order: number; runs?: FlowRun[]; hasClip: boolean; regenerationInstructions?: string; canGenerate?: boolean; canResume?: boolean; locked?: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [acknowledge, setAcknowledge] = useState(false);
  const [editing, setEditing] = useState(false);
  const [instructions, setInstructions] = useState("");
  const current = runs?.at(-1);
  const active = flowActive(current);
  const readiness = useQuery({ queryKey: ["flowReadiness"], queryFn: () => apiJson<{ status: string; reason?: string }>("/scene-video-providers/flow-web/readiness"), enabled: !active && !hasClip, staleTime: 5000 });
  const needsAttention = current && ["human_action_required", "failed"].includes(current.status);
  async function generate(resume: boolean) {
    setBusy(true); setError("");
    try { await apiJson(`/scene-video-jobs/${encodeURIComponent(jobId)}/scenes/${order}/flow/${resume ? "resume" : "generate"}`, { method: "POST" }); onChanged(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not request Flow generation."); }
    finally { setBusy(false); }
  }
  async function reconcileNoResult() {
    if (!current || !acknowledge) return;
    setBusy(true); setError("");
    try {
      await apiJson(`/scene-video-jobs/${encodeURIComponent(jobId)}/scenes/${order}/flow/reconcile-no-result`, { method: "POST", body: { run_id: current.run_id, acknowledge_possible_charge: true } });
      setAcknowledge(false); onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not reconcile this run."); }
    finally { setBusy(false); }
  }
  async function saveInstructions() {
    setBusy(true); setError("");
    try { await apiJson(`/scene-video-jobs/${encodeURIComponent(jobId)}/scenes/${order}/generation-request/revise`, { method: "POST", body: { instructions } }); setEditing(false); onChanged(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not prepare regeneration."); }
    finally { setBusy(false); }
  }
  return <div className="mt-4 space-y-3 rounded-lg border border-slate-300 bg-slate-50 p-4">
    <h4 className="font-semibold">Flow generation - experimental</h4>
    <p role="status">{current ? (current.status === "completed" && !hasClip ? "Ready for deliberate regeneration" : labels[current.status] ?? current.status.replaceAll("_", " ")) : `Status: ${readiness.data?.status.replaceAll("_", " ") ?? "Checking browser..."}`}</p>
    {current?.evidence?.model && <p className="text-sm">Selected model: {current.evidence.model} - {current.evidence.duration}s - {current.evidence.aspect}</p>}
    {(current?.failure || readiness.data?.reason) && <p className="text-sm">{(current?.failure || readiness.data?.reason)?.replaceAll("_", " ")}</p>}
    {needsAttention && <p className="text-sm">Resolve the normal Flow browser state manually. {current.submission_intent ? "Submission may have consumed credits. Resume only reconciles that result; it never clicks Generate again." : "Resume deliberately retries this failure before submission."} Manual MP4 import remains available below.</p>}
    {!hasClip && !active && (!needsAttention || !current.submission_intent) && regenerationInstructions !== undefined && <div className="space-y-2">
      {!editing ? <button type="button" disabled={busy || locked} className="rounded border px-3 py-2 text-sm" onClick={() => { setInstructions(regenerationInstructions); setEditing(true); }}>Prepare regeneration instructions</button> : <>
        <label className="block text-sm">Regeneration instructions<textarea className="mt-1 w-full rounded border p-2" rows={5} value={instructions} onChange={event => setInstructions(event.target.value)} /></label>
        <p className="text-xs">Save creates a revised request. Generate Again remains a separate credit-consuming action.</p>
        <button type="button" disabled={busy || locked || !instructions.trim()} className="rounded border px-3 py-2 text-sm" onClick={() => void saveInstructions()}>Save regeneration instructions</button>
      </>}
    </div>}
    {!hasClip && !active && <button type="button" disabled={busy || locked || editing || (needsAttention ? !canResume : !canGenerate)} onClick={() => void generate(Boolean(needsAttention))} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">{busy ? "Queueing..." : needsAttention ? "Retry Flow" : (runs?.length ? "Generate Again" : "Generate in Flow")}</button>}
    {current?.status === "human_action_required" && current.submission_intent && !hasClip && <div className="space-y-2 border-t pt-3">
      <label className="block text-sm"><input type="checkbox" checked={acknowledge} onChange={event => setAcknowledge(event.target.checked)} /> I checked the original Flow project: no generation is running and no usable result exists. The earlier click may have consumed credits.</label>
      <button type="button" disabled={busy || !acknowledge} onClick={() => void reconcileNoResult()} className="rounded border px-3 py-2 text-sm disabled:opacity-50">Resolve without result</button>
      <p className="text-xs">This releases the run. A new Generate action is still required for another paid attempt.</p>
    </div>}
    {!active && <button type="button" onClick={() => void readiness.refetch()} className="ml-2 rounded border px-3 py-2 text-sm">Check browser</button>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {current?.history && <details><summary className="cursor-pointer text-sm">Generation history</summary><ul className="text-xs">{current.history.map((event, i) => <li key={i}>{event.status.replaceAll("_", " ")} - {new Date(event.at).toLocaleString()}</li>)}</ul></details>}
  </div>;
}
