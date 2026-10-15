import { useState, type FormEvent } from "react";
import { apiJson, buildApiUrl } from "../lib/apiClient";

const checks = [
  ["thai_intelligible", "Intelligible spoken Thai is present"],
  ["intended_speaker", "The intended character speaks"],
  ["meaning_preserved", "The dialogue preserves the intended meaning"],
  ["natural_ending", "Speech finishes naturally at every scene boundary"],
  ["voice_consistent", "Character and voice identity are reasonably consistent"],
] as const;

export function FlowSpeechPilotPanel({ jobId, episode, onChanged }: { jobId: string; episode: boolean; onChanged: () => Promise<unknown> }) {
  const [hash, setHash] = useState(""), [evidence, setEvidence] = useState(""), [lipSync, setLipSync] = useState("unreviewed");
  const [findings, setFindings] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function identify(file?: File) {
    setHash(""); setError("");
    if (!file) return;
    try { const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer()); setHash(Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("")); }
    catch { setError("Could not identify the reviewed media file."); }
  }
  async function record(event: FormEvent) {
    event.preventDefault(); if (busy || !hash) return;
    setBusy(true); setError("");
    try {
      await apiJson(`/flow-autopilot/batches/pilot/${encodeURIComponent(jobId)}`, { method: "POST", body: { artifact: episode ? "final_video" : "scene_clip", clip_sha256: hash, method: "listened_audio_and_video", evidence, lip_sync: lipSync, ...Object.fromEntries(checks.map(([key]) => [key, !!findings[key]])) } });
      await onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : "Inspection could not be saved."); }
    finally { setBusy(false); }
  }
  return <form aria-label="Speech pilot inspection" className="space-y-3 rounded-xl border bg-white p-5" onSubmit={event => void record(event)}>
    <h3 className="text-xl font-semibold">Inspect {episode ? "the complete pilot episode" : "the first speaking clip"}</h3>
    <p>Listen to the actual audio and watch the video. A transcript or an audio stream alone cannot establish voice identity or synchronization. Record only checks you performed; incomplete findings keep production on hold.</p>
    <a className="block text-blue-800 underline" href={buildApiUrl(`/scene-video-jobs/${encodeURIComponent(jobId)}/artifacts/${episode ? "video" : "scene-clip/1"}`)} target="_blank" rel="noreferrer">Watch / download pilot media</a>
    <label className="block">Reviewed media file<input className="block" type="file" accept="video/mp4" onChange={e => void identify(e.target.files?.[0])}/></label>
    <p className="text-sm">The file identifies the exact reviewed version; only its checksum is sent.</p>
    {checks.map(([key, label]) => <label className="block" key={key}><input type="checkbox" checked={!!findings[key]} onChange={e => setFindings(v => ({ ...v, [key]: e.target.checked }))}/> {label}</label>)}
    <label className="block">Visible speech synchronization<select className="ml-3 rounded border p-2" value={lipSync} onChange={e => setLipSync(e.target.value)}><option value="unreviewed">Unreviewed</option><option value="reasonable">Reasonably synchronized</option><option value="not_visible">Speaking mouth is not visible</option><option value="failed">Material synchronization failure</option></select></label>
    <label className="block">Inspection evidence and warnings<textarea className="mt-2 block w-full rounded border p-2" value={evidence} onChange={e => setEvidence(e.target.value)} required maxLength={8000} rows={4}/></label>
    <button className="rounded border px-3 py-2" disabled={busy || !hash}>Record speech inspection</button>
    {error && <p role="alert">{error}</p>}
  </form>;
}
