import { useRef, useState } from "react";
import { apiJson } from "../lib/apiClient";

export type SceneProduction = { order: number; status: string; can_generate: boolean; can_resume_flow: boolean; flow_submissions: number; uncertain_submissions: number; attempt_count: number };
export type Production = { continuity_mode?: string; plan_error?: string; mode: string; status: string; started: boolean; paused: boolean; auto_advance_after_accept: boolean; scene_count: number; accepted_count: number; current_scene: number; flow_submissions: number; uncertain_submissions: number; scenes: SceneProduction[] };

const labels: Record<string, string> = { handoff_required: "Select a continuity frame and Continue from the accepted scene", waiting: "Waiting", eligible: "Ready to generate", flow_queued: "Flow queued", flow_generating: "Flow generating", media_attention_required: "Media decision required", ai_review_queued: "AI review queued", ai_review_running: "AI review running", awaiting_acceptance: "Human acceptance required", accepted: "Accepted", regenerate_requested: "Generate again requires your action", failed: "Review failed", attention_required: "Attention required" };

export function ProductionOverview({ jobId, production, settings, onChanged }: { jobId: string; production: Production; settings: { order: number; duration_seconds: number; aspect_ratio: string }[]; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const [autoAdvance, setAutoAdvance] = useState(true);
  async function control(action: "start" | "pause" | "resume") {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const result = await apiJson<{ queue_error?: string }>(`/scene-video-jobs/${encodeURIComponent(jobId)}/production/${action}`, { method: "POST", body: action === "start" ? { auto_advance_after_accept: autoAdvance } : undefined });
      if (result.queue_error) setError(result.queue_error);
      onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update production."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  const complete = production.status === "completed";
  return <section className="space-y-3 rounded-xl border border-slate-300 bg-white p-6" aria-label="Production overview">
    <h3 className="text-xl font-semibold">AI video production</h3>
    <p>{production.accepted_count} / {production.scene_count} scenes accepted</p>
    <p role="status">Production: {production.status.replaceAll("_", " ")}{production.current_scene > 0 && ` · Current scene: ${production.current_scene}`}</p>
    <p className="text-sm">Provider: flow_web · AI assisted review · Human acceptance required for every scene</p>
    <ul className="space-y-2">{production.scenes.map(scene => <li key={scene.order}>
      <a className="text-blue-700 underline" href={`#scene-${scene.order}`}>Scene {scene.order}</a>: {labels[scene.status] ?? scene.status.replaceAll("_", " ")}
      <span className="ml-2 text-xs text-slate-600">{scene.flow_submissions} submissions · {scene.attempt_count} clip attempts{scene.uncertain_submissions > 0 && ` · ${scene.uncertain_submissions} uncertain submissions`}</span>
    </li>)}</ul>
    <p className="text-sm">Flow submissions: {production.flow_submissions}. Actual credits spent are unknown.</p>
    {!production.started && <>
      <ul className="text-sm">{settings.map(scene => <li key={scene.order}>Scene {scene.order}: {scene.duration_seconds} seconds, {scene.aspect_ratio}</li>)}</ul>
      <label className="block text-sm"><input type="checkbox" checked={autoAdvance} disabled={busy} onChange={event => setAutoAdvance(event.target.checked)} /> {production.continuity_mode === "chained_frames" ? "Queue the next scene after I accept and Continue with a handoff frame" : "Automatically queue the next scene after I accept"}</label>
      <p className="text-sm text-amber-800">Start authorizes this sequential session. Flow generation can consume subscription credits. Regeneration always needs another deliberate action.</p>
      <button type="button" disabled={busy || production.scene_count === 0 || production.status !== "ready"} onClick={() => void control("start")} className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50">Start Production</button>
    </>}
    {production.started && !complete && <>
      <button type="button" disabled={busy} onClick={() => void control(production.paused ? "resume" : "pause")} className="rounded-md border px-4 py-2 disabled:opacity-50">{production.paused ? "Resume Production" : "Pause Production"}</button>
      <p className="text-sm">{production.paused ? "Paused: no next Flow submission. An already submitted scene continues safely." : "The next scene will not generate until you accept the current scene. Pause prevents future submissions."}</p>
    </>}
    {production.plan_error && <p role="alert" className="text-red-700">Plan needs correction: {production.plan_error}</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </section>;
}
