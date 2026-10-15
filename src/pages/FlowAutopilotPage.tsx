import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiJson, buildApiUrl } from "../lib/apiClient";
import { primary } from "./videoProduct";
import type { Production } from "./ProductionOverview";
import { FlowSpeechPilotPanel } from "./FlowSpeechPilotPanel";

type Batch = { id: string; name: string; jobs: string[]; account?: string; starting_balance: number; starting_cost: number; starting_model: string; paused: boolean; completed: boolean; speech_pilot?: boolean; pilot_reviewed?: boolean; pilot_episode_reviewed?: boolean };
type Queue = {
  scheduler: { paused: boolean; reservations: string[]; batches?: Batch[]; block_reason?: string };
  credit_totals?: { authorized: number; reserved: number; spent: number; refunded: number; remaining: number } | null;
  projects: { id: string; title: string; status: string; production: Production; video_url: string }[];
};

export function FlowAutopilotPage() {
  const query = useQuery({ queryKey: ["flowAutopilot"], queryFn: () => apiJson<Queue>("/flow-autopilot"), refetchInterval: 3000 });
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [name, setName] = useState(""), [credits, setCredits] = useState(""), [selected, setSelected] = useState<string[]>([]);
  const [speechPilot, setSpeechPilot] = useState(false);
  const state = query.data?.scheduler, batch = state?.batches?.at(-1), totals = query.data?.credit_totals;
  async function control(action: string) {
    if (busy) return;
    setBusy(true); setError("");
    try { await apiJson(`/flow-autopilot/control/${action}`, { method: "POST" }); await query.refetch(); }
    catch (e) { setError(e instanceof Error ? e.message : "Queue control failed"); }
    finally { setBusy(false); }
  }
  async function authorize(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try {
      await apiJson("/flow-autopilot/batches", { method: "POST", body: { name, job_ids: selected, credits: Number(credits), speech_pilot: speechPilot } });
      setSelected([]); await query.refetch();
    } catch (e) { setError(e instanceof Error ? e.message : "Batch authorization failed"); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-4xl space-y-5">
    <header><h2 className="text-3xl font-semibold">Flow Autopilot</h2><p className="mt-2">Authorized projects finish in batch order. Technically valid scenes are accepted, chained and assembled automatically. Creative quality remains unreviewed until rendered footage is inspected.</p></header>
    <div className="flex flex-wrap gap-3"><Link className={primary} to="/videos/new?workflow=flow_unattended">New unattended video</Link>{state && <button className="rounded border px-4" disabled={busy || (state.paused && (!batch || batch.completed))} onClick={() => void control(state.paused ? "resume" : "pause")}>{state.paused ? "Resume Flow queue" : "Pause Flow queue"}</button>}</div>
    {state && <section className="space-y-2 rounded-xl border bg-white p-5">
      <p>{state.paused ? "Queue paused" : "Queue running"}</p>
      <p>{state.reservations.length} historical generation reservations preserved</p>
      {batch && <><h3 className="font-semibold">{batch.name}{batch.completed ? " · Closed" : ""}</h3><p>Starting provider balance: {batch.starting_balance} credits · Selected cost: {batch.starting_cost} · {batch.starting_model}</p></>}
      {batch?.account && <p>Verified Flow account: {batch.account}</p>}
      {batch?.speech_pilot && <p>{batch.pilot_episode_reviewed ? "Complete pilot speech inspection passed" : batch.pilot_reviewed ? "First clip speech inspection passed. Finish and inspect the pilot episode before other projects start." : "Production holds after the first clip until its actual speech and video are inspected."}</p>}
      {totals && <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">{([ ["Authorized", totals.authorized], ["Reserved", totals.reserved], ["Spent", totals.spent], ["Refunded", totals.refunded], ["Remaining", totals.remaining] ] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="text-xl font-semibold">{value} credits</dd></div>)}</dl>}
      <p className="text-sm">Spent credits use the displayed price of acknowledged submissions. Uncertain charges remain reserved. Budgets survive restart and never grow when provider credits refresh. Pause stops future submissions; an already authorized generation may finish.</p>
      {state.paused && batch && !batch.completed && <button className="rounded border px-3 py-2" disabled={busy} onClick={() => void control("close-batch")}>Close this batch</button>}
      {state.block_reason && <p role="status" className="mt-2 text-amber-800">{state.block_reason}</p>}
    </section>}
    {state?.paused && batch?.speech_pilot && !batch.completed && !batch.pilot_episode_reviewed && batch.jobs[0] && (!batch.pilot_reviewed || query.data?.projects.find(p => p.id === batch.jobs[0])?.status === "completed") && <FlowSpeechPilotPanel key={batch.pilot_reviewed ? "episode" : "clip"} jobId={batch.jobs[0]} episode={!!batch.pilot_reviewed} onChanged={() => query.refetch()}/>}
    {state?.paused && (!batch || batch.completed) && <form className="space-y-3 rounded-xl border bg-white p-5" onSubmit={event => void authorize(event)}>
      <h3 className="text-xl font-semibold">Authorize a production batch</h3>
      <p>Select the projects this budget may produce. Flow will verify the existing account, available balance and one-output cost before saving authorization. Resume the batch separately.</p>
      <label className="block">Batch name<input className="ml-3 rounded border p-2" value={name} onChange={e => setName(e.target.value)} required maxLength={160}/></label>
      <label className="block">Credit budget<input className="ml-3 rounded border p-2" type="number" min={1} step={1} value={credits} onChange={e => setCredits(e.target.value)} required/></label>
      <label className="block"><input type="checkbox" checked={speechPilot} onChange={e => setSpeechPilot(e.target.checked)}/> Hold after the first clip for speech inspection</label>
      <fieldset className="space-y-2"><legend>Authorized projects</legend>{query.data?.projects.filter(p => p.status !== "completed" && p.production.flow_submissions === 0 && p.production.uncertain_submissions === 0).map(p => <label className="block" key={p.id}><input type="checkbox" checked={selected.includes(p.id)} onChange={e => setSelected(ids => e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id))}/> {p.title}</label>)}</fieldset>
      <button className={primary} disabled={busy || selected.length === 0}>Verify Flow and authorize batch</button>
    </form>}
    {(error || query.isError) && <p role="alert">{error || query.error?.message}</p>}
    <ol className="space-y-3">{query.data?.projects.map((project, index) => <li key={project.id} className="rounded-xl border bg-white p-5"><h3 className="text-xl font-semibold">{index + 1}. {project.title}</h3><p>{project.production.accepted_count} / {project.production.scene_count} scenes · {project.production.status.replaceAll("_", " ")}</p>{project.status !== "completed" && <p className="text-sm">{batch && !batch.completed && batch.jobs.includes(project.id) ? "Authorized in current batch" : "Waiting for explicit batch authorization"}</p>}<Link className="mr-4 text-blue-800 underline" to={`/scene-jobs/${project.id}`}>View project</Link>{project.status === "completed" && <a className="text-blue-800 underline" href={buildApiUrl(project.video_url)}>Watch final video</a>}</li>)}</ol>
  </div>;
}
