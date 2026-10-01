import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiJson, buildApiUrl } from "../lib/apiClient";

type AudioPolicy = "clip_native" | "external_narration" | "silent";
type ReferenceMode = "none" | "provider_generated" | "manually_imported";
type Request = { story_beat: string; visual_description: string; image_prompt?: string; first_frame_prompt?: string; motion_prompt: string; audio_intent?: { mode: AudioPolicy; dialogue?: string; sound_effects?: string[]; ambience?: string }; reference_mode?: ReferenceMode; character_continuity: string; environment_continuity: string; aspect_ratio: string; duration_seconds: number; last_frame_description?: string; generation_attempt: number };
type Scene = { order: number; status: string; generation_request: Request; first_frame_url?: string; clip_url?: string; clip_has_audio?: boolean };
type SceneJob = { id: string; status: string; current_step: string; audio_policy?: AudioPolicy; reference_mode?: ReferenceMode; error?: string; scenes?: Scene[]; video_url?: string; production_plan_url?: string };

export function CreateSceneVideoPage() {
  const navigate = useNavigate();
  const [character, setCharacter] = useState("");
  const [topic, setTopic] = useState("");
  const [sceneCount, setSceneCount] = useState<2 | 4>(4);
  const [audioPolicy, setAudioPolicy] = useState<AudioPolicy>("clip_native");
  const [referenceMode, setReferenceMode] = useState<"none" | "provider_generated">("none");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await apiJson<{ job_id: string }>("/scene-video-jobs", { method: "POST", body: { character, topic, scene_count: sceneCount, audio_policy: audioPolicy, reference_mode: referenceMode } });
      navigate(`/scene-jobs/${result.job_id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create scene-video job."); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-3xl space-y-6">
    <div><h2 className="text-2xl font-semibold">Create scene video</h2><p className="mt-2 text-slate-600">Plan scenes here, generate clips manually in Google Flow, then import the MP4 files.</p></div>
    <form onSubmit={(event) => void create(event)} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <label className="block text-sm font-medium">Character<input className="mt-1 w-full rounded-md border border-slate-300 p-2" value={character} onChange={(event) => setCharacter(event.target.value)} required /></label>
      <label className="block text-sm font-medium">Story topic<textarea className="mt-1 w-full rounded-md border border-slate-300 p-2" value={topic} onChange={(event) => setTopic(event.target.value)} required rows={3} /></label>
      <label className="block text-sm font-medium">Scenes<select className="mt-1 w-full rounded-md border border-slate-300 p-2" value={sceneCount} onChange={(event) => setSceneCount(Number(event.target.value) as 2 | 4)}><option value={2}>2 scenes</option><option value={4}>4 scenes</option></select></label>
      <label className="block text-sm font-medium">Final audio<select className="mt-1 w-full rounded-md border border-slate-300 p-2" value={audioPolicy} onChange={(event) => setAudioPolicy(event.target.value as AudioPolicy)}><option value="clip_native">Use generated clip audio</option><option value="external_narration">Use external narration (configured TTS)</option><option value="silent">Silent final video</option></select></label>
      <label className="block text-sm font-medium">Starting reference images<select className="mt-1 w-full rounded-md border border-slate-300 p-2" value={referenceMode} onChange={(event) => setReferenceMode(event.target.value as "none" | "provider_generated")}><option value="none">Create visuals manually in Flow</option><option value="provider_generated">Generate references with configured image provider</option></select></label>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button type="submit" disabled={busy} className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50">{busy ? "Creating…" : "Create scene-video job"}</button>
    </form>
  </div>;
}

export function SceneVideoPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const query = useQuery({
    queryKey: ["sceneVideoJob", jobId],
    queryFn: () => apiJson<SceneJob>(`/scene-video-jobs/${encodeURIComponent(jobId ?? "")}`),
    enabled: Boolean(jobId),
    refetchInterval: (state) => ["pending", "running"].includes(state.state.data?.status ?? "") ? 2000 : false,
  });
  if (!jobId) return <p>Scene-video job ID is missing.</p>;
  if (query.isLoading) return <p>Loading scene-video job…</p>;
  if (query.isError) return <p role="alert">{query.error instanceof Error ? query.error.message : "Could not load scene-video job."}</p>;
  const job = query.data;
  if (!job) return <p>No scene-video job returned.</p>;
  return <div className="space-y-6">
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-semibold">Scene-video job</h2><p className="mt-1 font-mono text-xs text-slate-500">{job.id}</p></div><button type="button" onClick={() => void query.refetch()} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Refresh</button></div>
      <p className="mt-3">Status: <strong>{job.status.replaceAll("_", " ")}</strong> · Step: {job.current_step.replaceAll("_", " ")}</p>
      {job.status === "awaiting_external_generation" && <p className="mt-2 text-amber-800">Human action required: generate each scene in Google Flow and import its MP4.</p>}
      {job.audio_policy && <p className="mt-1 text-sm text-slate-600">Audio: {job.audio_policy.replaceAll("_", " ")}</p>}
      {job.error && <p role="alert" className="mt-2 text-red-700">{job.error}</p>}
      {job.production_plan_url && <a className="mt-3 inline-block text-blue-700 underline" href={buildApiUrl(job.production_plan_url)} target="_blank" rel="noreferrer">View production plan</a>}
    </div>
    {job.scenes?.map((scene) => <SceneCard key={scene.order} jobId={job.id} scene={scene} onImported={() => void query.refetch()} />)}
    {job.video_url && <section className="rounded-xl border border-slate-200 bg-white p-6"><h3 className="text-lg font-semibold">Final MP4</h3><video controls className="mt-3 w-full max-w-2xl" src={buildApiUrl(job.video_url)} /><a className="mt-3 block text-blue-700 underline" href={buildApiUrl(job.video_url)} download>Download final MP4</a></section>}
    <Link className="text-blue-700 underline" to="/scene-jobs/create">Create another scene video</Link>
  </div>;
}

function SceneCard({ jobId, scene, onImported }: { jobId: string; scene: Scene; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = scene.generation_request;
  async function importClip() {
    if (!file) return;
    setBusy(true); setError("");
    try {
      if (file.size > 100 * 1024 * 1024) throw new Error("MP4 must be 100 MiB or smaller.");
      const form = new FormData(); form.append("file", file);
      const response = await fetch(buildApiUrl(`/scene-video-jobs/${encodeURIComponent(jobId)}/scenes/${scene.order}/import`), { method: "POST", body: form });
      if (!response.ok) { const body = await response.json().catch(() => ({})) as { error?: string }; throw new Error(body.error || `Import failed (${response.status}).`); }
      setFile(null); onImported();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not import MP4."); }
    finally { setBusy(false); }
  }
  async function importReference() {
    if (!referenceFile) return;
    setBusy(true); setError("");
    try {
      if (referenceFile.size > 15 * 1024 * 1024) throw new Error("PNG must be 15 MiB or smaller.");
      const form = new FormData(); form.append("file", referenceFile);
      const response = await fetch(buildApiUrl(`/scene-video-jobs/${encodeURIComponent(jobId)}/scenes/${scene.order}/reference`), { method: "POST", body: form });
      if (!response.ok) { const body = await response.json().catch(() => ({})) as { error?: string }; throw new Error(body.error || `Reference import failed (${response.status}).`); }
      setReferenceFile(null); onImported();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not import PNG."); }
    finally { setBusy(false); }
  }
  return <section className="rounded-xl border border-slate-200 bg-white p-6">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-semibold">Scene {String(scene.order).padStart(2, "0")}</h3><span className="text-sm text-slate-600">{scene.status.replaceAll("_", " ")}</span></div>
    <p className="mt-2 text-slate-700">{request.story_beat || request.visual_description}</p>
    <p className="mt-2 text-sm text-slate-600">{request.visual_description}</p>
    {scene.first_frame_url && <img className="mt-4 max-h-80 rounded-md object-contain" src={buildApiUrl(scene.first_frame_url)} alt={`Scene ${scene.order} first frame`} />}
    <p className="mt-2 text-xs text-slate-500">Reference: {request.reference_mode?.replaceAll("_", " ") ?? (scene.first_frame_url ? "provider generated" : "none")}</p>
    {request.image_prompt && <><h4 className="mt-4 font-medium">Image or reference prompt</h4><pre className="mt-2 whitespace-pre-wrap rounded-md bg-slate-100 p-4 text-sm">{request.image_prompt}</pre></>}
    {request.first_frame_prompt && <p className="mt-2 text-sm text-slate-600">First frame: {request.first_frame_prompt}</p>}
    <h4 className="mt-4 font-medium">Flow motion prompt</h4><pre className="mt-2 whitespace-pre-wrap rounded-md bg-slate-100 p-4 text-sm">{request.motion_prompt}</pre>
    <button type="button" className="mt-2 rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={() => void navigator.clipboard.writeText(request.motion_prompt)}>Copy prompt</button>
    <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><div>Provider: Google Flow (manual)</div><div>Duration: {request.duration_seconds} seconds</div><div>Aspect: {request.aspect_ratio}</div><div>Generation attempt: {request.generation_attempt}</div>{request.character_continuity && <div className="sm:col-span-2">Character continuity: {request.character_continuity}</div>}{request.environment_continuity && <div className="sm:col-span-2">Environment continuity: {request.environment_continuity}</div>}{request.last_frame_description && <div className="sm:col-span-2">Last frame: {request.last_frame_description}</div>}</dl>
    {request.audio_intent && <div className="mt-3 space-y-1 text-sm text-slate-700"><p>Audio intent: {request.audio_intent.mode.replaceAll("_", " ")}</p>{request.audio_intent.dialogue && <p>Dialogue: {request.audio_intent.dialogue}</p>}{request.audio_intent.sound_effects?.length ? <p>Sound effects: {request.audio_intent.sound_effects.join(", ")}</p> : null}{request.audio_intent.ambience && <p>Ambience: {request.audio_intent.ambience}</p>}</div>}
    <a className="mt-4 inline-block text-blue-700 underline" href="https://flow.google.com/" target="_blank" rel="noreferrer">Open Google Flow</a>
    <div className="mt-5 space-y-2 border-t border-slate-200 pt-4"><label className="block text-sm font-medium">{scene.first_frame_url ? "Replace reference PNG" : "Attach reference PNG (optional)"}<input className="mt-2 block w-full text-sm" type="file" accept="image/png,.png" onChange={(event) => setReferenceFile(event.target.files?.[0] ?? null)} /></label><button type="button" disabled={!referenceFile || busy} onClick={() => void importReference()} className="rounded-md border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">{busy ? "Uploading…" : "Upload reference"}</button></div>
    <div className="mt-5 space-y-2 border-t border-slate-200 pt-4"><label className="block text-sm font-medium">{scene.clip_url ? "Replace scene clip" : "Import generated MP4"}<input className="mt-2 block w-full text-sm" type="file" accept="video/mp4,.mp4" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label><button type="button" disabled={!file || busy} onClick={() => void importClip()} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">{busy ? "Importing…" : scene.clip_url ? "Replace clip" : "Import MP4"}</button>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}</div>
    {scene.clip_url && <video controls className="mt-4 w-full max-w-xl" src={buildApiUrl(scene.clip_url)} />}
    {scene.clip_url && scene.clip_has_audio !== undefined && <p className="mt-2 text-sm text-slate-600">Imported clip audio: {scene.clip_has_audio ? "present" : "absent"}</p>}
  </section>;
}
