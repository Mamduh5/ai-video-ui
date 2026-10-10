import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { OpeningImagePanel, OpeningComparison, OpeningProviderSettings, type OpeningImage } from "./OpeningImagePanel";
import { primary, type NextAction } from "./videoProduct";
import { apiJson, buildApiUrl } from "../lib/apiClient";
import { MediaConformancePanel, type MediaAttempt } from "./MediaConformancePanel";
import { FlowGenerationPanel, type FlowRun } from "./FlowGenerationPanel";
import { shouldPollSceneJob } from "./sceneReviewExecution";
import { ProductionOverview, type Production, type SceneProduction } from "./ProductionOverview";

import { ReviewPlayer, type SceneBoundary } from "./ReviewPlayer";
import { HandoffPanel, TransitionComparison, type HandoffFrame, type Handoff } from "./ContinuityPanel";

type AudioPolicy = "clip_native" | "external_narration" | "silent";
type ReferenceMode = "none" | "provider_generated" | "manually_imported";
type ReviewPolicy = "off" | "ai_assisted";
type ReviewIssue = { category: string; severity: string; description: string; evidence_frames: number[]; previous_evidence_frames?: number[] };
type ReviewFrame = { index: number; timestamp_seconds: number };
type Review = { verdict: "pass" | "warning" | "fail"; summary: string; issues: ReviewIssue[]; checks: Record<string, string>; retry_recommended: boolean; retry_prompt_delta: string[]; frames: ReviewFrame[]; previous_frames?: ReviewFrame[]; limitations?: string[] };
type ReviewRun = { run_id: string; status: "queued" | "running" | "completed" | "failed"; failure?: string; queued_at: string; started_at?: string; finished_at?: string; retry_count: number };
type Attempt = MediaAttempt & { decision_history?: { decision: string; at: string; apply_review_corrections?: boolean }[]; handoff_frames?: HandoffFrame[]; handoff?: Handoff; review_runs?: ReviewRun[]; attempt: number; decision?: string; imported_at: string; review?: Review };
type Request = { scene_goal?: string; entry_state?: string; action?: string; exit_state?: string; must_not_repeat?: string[]; start_frame?: HandoffFrame & { scene_order: number; attempt: number }; story_beat: string; visual_description: string; image_prompt?: string; first_frame_prompt?: string; motion_prompt: string; audio_intent?: { mode: AudioPolicy; dialogue?: string; sound_effects?: string[]; ambience?: string }; reference_mode?: ReferenceMode; character_continuity: string; environment_continuity: string; aspect_ratio: string; duration_seconds: number; last_frame_description?: string; generation_attempt: number };
type Scene = { flow_runs?: FlowRun[]; order: number; status: string; generation_request: Request; first_frame_url?: string; clip_url?: string; clip_has_audio?: boolean; current_attempt?: number; attempts?: Attempt[] };
type SceneJob = { opening_image?: OpeningImage; opening_image_url?: string; approved_opening_url?: string; title?: string; topic?: string; character?: string; display_status?: string; next_action?: NextAction; accepted_count?: number; scene_count?: number; duration_seconds?: number; aspect_ratio?: string; scene_seconds?: number; preset?: string; continuity_mode?: "independent" | "chained_frames"; scene_boundaries?: SceneBoundary[]; production?: Production; generation_provider?: string; id: string; status: string; current_step: string; audio_policy?: AudioPolicy; reference_mode?: ReferenceMode; review_policy?: ReviewPolicy; error?: string; scenes?: Scene[]; video_url?: string; production_plan_url?: string };

export { CreateSceneVideoPage } from "./NewVideoPage";

export function SceneVideoPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const query = useQuery({
    queryKey: ["sceneVideoJob", jobId],
    queryFn: () => apiJson<SceneJob>(`/scene-video-jobs/${encodeURIComponent(jobId ?? "")}`),
    enabled: Boolean(jobId),
    refetchInterval: (state) => shouldPollSceneJob(state.state.data) ? 2000 : false,
  });
  if (!jobId) return <p>Scene-video job ID is missing.</p>;
  if (query.isLoading) return <p>Loading scene-video job…</p>;
  if (query.isError) return <p role="alert">{query.error instanceof Error ? query.error.message : "Could not load scene-video job."}</p>;
  const job = query.data;
  if (!job) return <p>No scene-video job returned.</p>;
  if (job.next_action) return <VideoWorkflow job={job} onChanged={() => void query.refetch()} />;
  return <div className="space-y-6">
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-semibold">Scene-video job</h2><p className="mt-1 font-mono text-xs text-slate-500">{job.id}</p></div><button type="button" onClick={() => void query.refetch()} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Refresh</button></div>
      <p className="mt-3">Status: <strong>{job.status.replaceAll("_", " ")}</strong> Â· Step: {job.current_step.replaceAll("_", " ")}</p>
      {job.status === "awaiting_external_generation" && job.generation_provider !== "flow_web" && <p className="mt-2 text-amber-800">Human action required: generate each scene in Google Flow and import its MP4.</p>}
      {job.audio_policy && <p className="mt-1 text-sm text-slate-600">Audio: {job.audio_policy.replaceAll("_", " ")}</p>}
      <p className="mt-1 text-sm text-slate-600">Clip review: {job.review_policy === "ai_assisted" ? "AI assisted; you decide which clips enter the final video" : "off"}</p>
      {job.error && <p role="alert" className="mt-2 text-red-700">{job.error}</p>}
      {job.production_plan_url && <a className="mt-3 inline-block text-blue-700 underline" href={buildApiUrl(job.production_plan_url)} target="_blank" rel="noreferrer">View production plan</a>}
    </div>
    <section aria-label="Storyboard" className="space-y-3 rounded-xl border bg-white p-6"><h3 className="text-xl font-semibold">Storyboard</h3><ol className="space-y-4">{job.scenes?.map(scene => <li key={scene.order}><strong>{scene.order}. {scene.generation_request.scene_goal || scene.generation_request.story_beat}</strong>{scene.generation_request.entry_state && <p className="text-sm">Starts: {scene.generation_request.entry_state}</p>}{scene.generation_request.action && <p className="text-sm">Action: {scene.generation_request.action}</p>}{scene.generation_request.exit_state && <p className="text-sm">Ends: {scene.generation_request.exit_state}</p>}{scene.generation_request.must_not_repeat?.length ? <p className="text-xs text-slate-600">Do not repeat: {scene.generation_request.must_not_repeat.join("; ")}</p> : null}</li>)}</ol></section>
    {job.production && job.review_policy === "ai_assisted" && <ProductionOverview jobId={job.id} production={job.production} settings={job.scenes?.map(scene => ({ order: scene.order, duration_seconds: scene.generation_request.duration_seconds, aspect_ratio: scene.generation_request.aspect_ratio })) ?? []} onChanged={() => void query.refetch()} />}
    {job.scenes?.map((scene, index) => <SceneCard key={scene.order} jobId={job.id} scene={scene} productionScene={job.production?.scenes.find(item => item.order === scene.order)} productionRequired={Boolean(job.production && (job.production.started || (job.production.scene_count > 1 && job.review_policy === "ai_assisted")))} flowWeb={job.generation_provider === "flow_web"} previousScene={job.scenes?.[index - 1]} nextScene={job.scenes?.[index + 1]} chained={job.continuity_mode === "chained_frames"} paused={job.production?.paused} reviewPolicy={job.review_policy ?? "off"} onImported={() => void query.refetch()} />)}
    {job.video_url && <section className="rounded-xl border border-slate-200 bg-white p-6"><h3 className="text-lg font-semibold">Final MP4</h3><ReviewPlayer src={buildApiUrl(job.video_url)} label="Final video" boundaries={job.scene_boundaries} /><a className="mt-3 block text-blue-700 underline" href={buildApiUrl(job.video_url)} download>Download final MP4</a></section>}
    <Link className="text-blue-700 underline" to="/scene-jobs/create">Create another scene video</Link>
  </div>;
}

function VideoWorkflow({job,onChanged}:{job:SceneJob;onChanged:()=>void}) {
 const navigate=useNavigate();const [busy,setBusy]=useState(false),[error,setError]=useState(''),[diagnostics,setDiagnostics]=useState(false);
 const action=job.next_action!;
 const current=job.scenes?.find(s=>s.order===action.scene_order);
 const targetOrder=action.scene_order??job.production?.current_scene;
 const selected=job.scenes?.find(s=>s.order===targetOrder);
 const complete=action.type==='watch_final_video';
 const openingAction=['prepare_opening_image','wait_for_opening_image','review_opening_image','recover_opening_image'].includes(action.type);
 const freshDraft=!job.production?.started&&!job.scenes?.some(s=>s.clip_url||s.flow_runs?.length||s.attempts?.length);
 const storyReady=freshDraft&&action.type!=='manual_generation'&&!job.video_url&&Boolean(job.scenes?.length);
 async function control(kind:string){if(busy)return;setBusy(true);setError('');try{const response=await apiJson<{queue_error?:string}>(`/scene-video-jobs/${encodeURIComponent(job.id)}/production/${kind}`,{method:'POST',body:kind==='start'?{auto_advance_after_accept:true}:undefined});if(response.queue_error)setError(response.queue_error);onChanged();}catch(cause){setError(cause instanceof Error?cause.message:'Could not update production.');}finally{setBusy(false);}}
 async function regenerate(){if(busy||!freshDraft)return;setBusy(true);setError('');try{const response=await apiJson<{job_id:string}>('/scene-video-jobs',{method:'POST',body:{title:job.title,topic:job.topic,character:job.character,scene_count:job.scene_count||job.scenes?.length||2,aspect_ratio:job.aspect_ratio,scene_seconds:job.scene_seconds||job.scenes?.[0]?.generation_request.duration_seconds||undefined,preset:job.preset||undefined,audio_policy:job.audio_policy,review_policy:job.review_policy,reference_mode:job.reference_mode,continuity_mode:job.continuity_mode,opening_image_required:job.opening_image?.required}});navigate(`/scene-jobs/${response.job_id}`);}catch(cause){setError(cause instanceof Error?cause.message:'Could not regenerate storyboard.');}finally{setBusy(false);}}
 function card(scene:Scene){const index=job.scenes!.indexOf(scene);return <SceneCard key={scene.order} jobId={job.id} scene={scene} productionScene={job.production?.scenes.find(s=>s.order===scene.order)} productionRequired={Boolean(job.production?.started||(job.production&&job.production.scene_count>1&&job.review_policy==='ai_assisted'))} flowWeb={job.generation_provider==='flow_web'} previousScene={job.scenes?.[index-1]} nextScene={job.scenes?.[index+1]} chained={job.continuity_mode==='chained_frames'} paused={job.production?.paused} reviewPolicy={job.review_policy??'off'} onImported={onChanged} approvedOpeningUrl={job.approved_opening_url} productMode/>;}
 return <div className="space-y-5"><Link to="/" className="text-blue-800 underline">← Projects</Link><header className="rounded-xl border bg-white p-6"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="break-words text-3xl font-semibold">{job.title||'Untitled video'}</h2><p className="mt-2 text-slate-600">{job.display_status} · {job.accepted_count??job.production?.accepted_count??0} / {job.scene_count??job.scenes?.length??0} scenes approved</p></div>{job.production?.started&&!complete&&!job.production.paused&&<button className="self-start rounded border px-4 py-2 disabled:opacity-50" disabled={busy} onClick={()=>void control('pause')}>Pause</button>}</div>{job.production?.started&&!complete&&<ol aria-label="Scene progress" className="mt-4 flex flex-wrap gap-3">{job.production.scenes.map(s=><li className="rounded bg-slate-100 px-3 py-2 text-sm" key={s.order}>Scene {s.order} · {s.status==='accepted'?'✓ Approved':s.order===job.production?.current_scene?job.display_status:'Waiting'}</li>)}</ol>}</header>
 {complete&&job.video_url?<section className="space-y-4 rounded-xl border bg-white p-6"><h3 className="text-2xl font-semibold">Your video is ready</h3><p>{job.duration_seconds?`${job.duration_seconds.toFixed(0)} sec · `:''}{job.aspect_ratio}</p><ReviewPlayer src={buildApiUrl(job.video_url)} label="Final video" boundaries={job.scene_boundaries}/><ol className="space-y-1">{job.scenes?.map(s=><li key={s.order}>{s.order}. {s.generation_request.story_beat||s.generation_request.scene_goal}</li>)}</ol><a className={primary} href={buildApiUrl(job.video_url+'?download=1')} download>Download Video</a></section>:<>
 <section className={`space-y-3 rounded-xl border p-5 ${action.background?'border-blue-200 bg-blue-50':action.type==='start_production'?'bg-white':'border-amber-200 bg-amber-50'}`} aria-label={action.background?'App working':'What needs your attention'}><h3 className="font-semibold">{action.background?'App working':action.type==='start_production'?'Your storyboard is ready':'What needs your attention'}</h3><p role="status">{action.message}</p>{action.background&&<p className="font-medium">{action.label}</p>}{action.type==='resume_production'&&<button disabled={busy} className={primary} onClick={()=>void control('resume')}>Resume Production</button>}{action.type==='generate_storyboard'&&freshDraft&&<button disabled={busy} className={primary} onClick={()=>void regenerate()}>Regenerate Storyboard</button>}{['review_scene','choose_handoff_frame','resolve_media_mismatch','retry_ai_review','resolve_flow_attention','generate_scene','manual_generation'].includes(action.type)&&current&&<a className={primary} href={`#scene-${current.order}`}>{action.label}</a>}</section>
 {storyReady&&<section aria-label="Storyboard" className="space-y-4 rounded-xl border bg-white p-6"><h3 className="text-2xl font-semibold">Storyboard</h3><p>Approx. video length: ~{job.scenes?.reduce((total,s)=>total+s.generation_request.duration_seconds,0)} sec before transitions/normalization.</p><ol className="space-y-5">{job.scenes?.map(s=><li key={s.order}><h4 className="font-semibold">{s.order}. {s.generation_request.story_beat||s.generation_request.scene_goal}</h4><p className="mt-1 text-slate-600">{s.generation_request.action||s.generation_request.visual_description}</p><details className="mt-2 text-sm"><summary className="cursor-pointer text-slate-500">Scene details</summary><p>Start state: {s.generation_request.entry_state}</p><p>End state: {s.generation_request.exit_state}</p><p>Continuity notes: {s.generation_request.character_continuity}</p><pre className="mt-2 whitespace-pre-wrap break-words">{s.generation_request.motion_prompt}</pre></details></li>)}</ol><div className="flex flex-wrap gap-3">{action.type==='start_production'&&job.generation_provider==='flow_web'&&<button disabled={busy} className={primary} onClick={()=>void control('start')}>{busy?'Starting…':'Start Production'}</button>}{freshDraft&&action.type!=='generate_storyboard'&&<button disabled={busy} className="rounded border px-4 py-2" onClick={()=>void regenerate()}>Regenerate Storyboard</button>}</div><p className="text-sm text-slate-600">{job.scene_count??job.scenes?.length} scenes will require up to {job.scene_count??job.scenes?.length} initial Flow video generations. Regenerations may use additional generations.</p><p className="text-xs text-slate-500">Start authorizes sequential generation. Each scene waits for your approval. Video generation can consume Flow credits.</p></section>}
 {openingAction&&job.opening_image?<OpeningImagePanel jobId={job.id} opening={job.opening_image} imageUrl={job.opening_image_url} expected={job.scenes?.[0]?.generation_request.entry_state} action={action.type} onChanged={onChanged}/>:selected&&!storyReady&&card(selected)}
 </>}
 {job.generation_provider==='flow_web'&&!job.opening_image&&job.production?.started&&job.production.current_scene===1&&!job.scenes?.[0]?.clip_url&&<details className="rounded border bg-white p-4"><summary>Opening image option</summary><p className="mt-2">Verify the initial visual state before another video generation.</p><button disabled={busy} className="mt-3 rounded border p-3" onClick={()=>{if(busy)return;setBusy(true);void apiJson(`/scene-video-jobs/${encodeURIComponent(job.id)}/opening-image/enable`,{method:'POST'}).then(onChanged).catch(cause=>setError(cause instanceof Error?cause.message:'Could not enable opening image review.')).finally(()=>setBusy(false));}}>Review an opening image first</button></details>}
 {error&&<p role="alert" className="text-red-700">{error}</p>}
 <details className="rounded-xl border bg-white p-5" onToggle={e=>setDiagnostics(e.currentTarget.open)}><summary className="cursor-pointer font-medium">{complete?'View production details · ':''}Advanced / Diagnostics</summary>{diagnostics&&<div className="mt-5 space-y-5"><dl className="break-all text-sm"><dt>Job ID</dt><dd>{job.id}</dd><dt>Provider</dt><dd>{job.generation_provider}</dd><dt>Opening image provider</dt><dd>{job.opening_image?.provider||"flow_web (legacy)"}</dd><dt>Raw status / step</dt><dd>{job.status} / {job.current_step}</dd><dt>Failure</dt><dd>{job.error||job.production?.plan_error||'None recorded'}</dd></dl>{job.opening_image&&<OpeningProviderSettings jobId={job.id} opening={job.opening_image} onChanged={onChanged}/>} {job.production&&<ProductionOverview jobId={job.id} production={job.production} settings={job.scenes?.map(s=>({order:s.order,duration_seconds:s.generation_request.duration_seconds,aspect_ratio:s.generation_request.aspect_ratio}))??[]} onChanged={onChanged}/>}<pre className="overflow-auto whitespace-pre-wrap break-all rounded bg-slate-100 p-3 text-xs">{JSON.stringify(job,null,2)}</pre>{job.scenes?.filter(s=>complete||s.order!==selected?.order).map(s=><details key={s.order}><summary>Scene {s.order} - {job.production?.scenes.find(p=>p.order===s.order)?.status??s.status}</summary>{card(s)}</details>)}</div>}</details>
 </div>;
}

function SceneCard({ approvedOpeningUrl, jobId, scene, flowWeb, productionScene, productionRequired, previousScene, nextScene, chained, paused, reviewPolicy, onImported, productMode }: { approvedOpeningUrl?: string; jobId: string; scene: Scene; flowWeb?: boolean; productionScene?: SceneProduction; productionRequired?: boolean; previousScene?: Scene; nextScene?: Scene; chained?: boolean; paused?: boolean; productMode?: boolean; reviewPolicy: ReviewPolicy; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = scene.generation_request;
  const currentAttempt = scene.attempts?.find((attempt) => attempt.attempt === scene.current_attempt);
  const conformancePending = scene.status === "conformance_attention_required";
  const flowRunning = ["queued", "opening_provider", "submission_intent", "submitted", "generating", "downloading", "importing"].includes(scene.flow_runs?.at(-1)?.status ?? "");
  const canAttachReference = !productMode || (!scene.clip_url && !flowRunning && !request.start_frame && !productionRequired);
  const canImport = !flowRunning && !conformancePending && (reviewPolicy === "off" || !scene.clip_url);
  async function act(action: "accept" | "regenerate" | "regenerate_corrected" | "review" | "retry") {
    setBusy(true); setError("");
    try {
      const path = action === "retry" ? `attempts/${currentAttempt?.attempt}/review/retry` : action === "regenerate_corrected" ? "regenerate" : action;
      await apiJson(`/scene-video-jobs/${encodeURIComponent(jobId)}/scenes/${scene.order}/${path}`, { method: "POST", body: action === "regenerate_corrected" ? { apply_review_corrections: true } : undefined });
      onImported();
    } catch (cause) { setError(cause instanceof Error ? cause.message : `Could not ${action} scene.`); }
    finally { setBusy(false); }
  }
  async function actConformance(action: "continue" | "replace") {
    if (!currentAttempt) return;
    setBusy(true); setError("");
    try {
      const result = await apiJson<{ review_error?: string }>(`/scene-video-jobs/${encodeURIComponent(jobId)}/scenes/${scene.order}/attempts/${currentAttempt.attempt}/conformance/${action}`, { method: "POST" });
      if (result.review_error) setError(result.review_error);
      onImported();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not apply media decision."); }
    finally { setBusy(false); }
  }
  async function importClip() {
    if (!file) return;
    setBusy(true); setError("");
    try {
      if (file.size > 100 * 1024 * 1024) throw new Error("MP4 must be 100 MiB or smaller.");
      const form = new FormData(); form.append("file", file);
      const response = await fetch(buildApiUrl(`/scene-video-jobs/${encodeURIComponent(jobId)}/scenes/${scene.order}/import`), { method: "POST", body: form });
      if (!response.ok) { const body = await response.json().catch(() => ({})) as { error?: string }; throw new Error(body.error || `Import failed (${response.status}).`); }
      const result = await response.json() as { review_error?: string };
      if (result.review_error) setError(result.review_error);
      setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; onImported();
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
  return <section id={`scene-${scene.order}`} className="rounded-xl border border-slate-200 bg-white p-6">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-semibold">Scene {String(scene.order).padStart(2, "0")}</h3><span className="text-sm text-slate-600">{productMode ? (scene.status === "accepted" ? "Approved" : scene.clip_url ? "Scene review" : "Production") : scene.status.replaceAll("_", " ")}</span></div>
    <p className="mt-2 text-slate-700">Story goal: {request.action || request.scene_goal || request.story_beat || request.visual_description}</p>
    {productMode && chained && scene.order === 1 && <p className="mt-1 text-sm text-slate-500">This scene starts a new video. The next scene continues from its accepted ending frame.</p>}
    {scene.clip_url && <ReviewPlayer src={buildApiUrl(scene.clip_url)} label={`Scene ${scene.order}`} frames={currentAttempt?.review?.frames?.map(frame => ({ ...frame, url: buildApiUrl(`/scene-video-jobs/${encodeURIComponent(jobId)}/scenes/${scene.order}/attempts/${currentAttempt.attempt}/frames/${frame.index}`) }))} />}
    {scene.order === 1 && approvedOpeningUrl && currentAttempt?.review?.frames?.[0] && <OpeningComparison approvedUrl={approvedOpeningUrl} generatedUrl={buildApiUrl(`/scene-video-jobs/${encodeURIComponent(jobId)}/scenes/1/attempts/${currentAttempt.attempt}/frames/${currentAttempt.review.frames[0].index}`)} />}
    {request.start_frame && currentAttempt?.review?.frames?.[0] && <TransitionComparison previousUrl={buildApiUrl(`/scene-video-jobs/${encodeURIComponent(jobId)}/scenes/${request.start_frame.scene_order}/attempts/${request.start_frame.attempt}/handoff/${request.start_frame.index}`)} openingUrl={buildApiUrl(`/scene-video-jobs/${encodeURIComponent(jobId)}/scenes/${scene.order}/attempts/${currentAttempt.attempt}/frames/${currentAttempt.review.frames[0].index}`)} previousExit={previousScene?.generation_request.exit_state} currentEntry={request.entry_state} openingSeconds={currentAttempt.review.frames[0].timestamp_seconds} />}
    {chained && nextScene && currentAttempt?.decision === "accepted" && <HandoffPanel jobId={jobId} order={scene.order} attempt={currentAttempt.attempt} frames={currentAttempt.handoff_frames} selection={currentAttempt.handoff} locked={Boolean(nextScene.flow_runs?.length || nextScene.clip_url)} paused={paused} onChanged={onImported} />}
    {!conformancePending && currentAttempt?.conformance && <details className="mt-3"><summary className="cursor-pointer">Media check</summary><MediaConformancePanel attempt={currentAttempt} /></details>}
    {conformancePending && currentAttempt?.conformance && <MediaConformancePanel attempt={currentAttempt}>{conformancePending && <div className="mt-4 space-y-3">
      <p className="text-sm">{reviewPolicy === "ai_assisted" ? "Continue Anyway means: keep this media despite the mismatch and continue to AI visual review. It does not accept the scene for final assembly." : "Continue Anyway keeps this media despite the mismatch. AI review is off; assembly can proceed when all clips pass or have a media override."}</p>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void actConformance("replace")} className="rounded border border-slate-400 px-4 py-2 text-sm disabled:opacity-50">Generate Again</button><button type="button" disabled={busy} onClick={() => void actConformance("continue")} className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">Use Anyway</button></div>
      {busy && <p role="status" className="text-sm">{reviewPolicy === "ai_assisted" ? "Saving media decision and queueing AI review…" : "Applying media decision; assembly may take a moment…"}</p>}
    </div>}</MediaConformancePanel>}
    {reviewPolicy === "ai_assisted" && currentAttempt && !conformancePending && (!currentAttempt.review || currentAttempt.review_runs?.at(-1)?.status === "failed") && <ReviewExecutionPanel attempt={currentAttempt} busy={busy} onRetry={() => void act(currentAttempt.review_runs?.length ? "retry" : "review")} />}
    {reviewPolicy === "ai_assisted" && currentAttempt?.review && (!currentAttempt.review_runs?.length || currentAttempt.review_runs.at(-1)?.status === "completed") && !conformancePending && <ReviewPanel productMode={productMode} canReopen={Boolean(chained && nextScene && !nextScene.flow_runs?.length && !nextScene.clip_url)} flowWeb={flowWeb} jobId={jobId} scene={scene} previousScene={previousScene} attempt={currentAttempt} busy={busy} onAction={act} />}
    {flowWeb && !scene.clip_url && <FlowGenerationPanel jobId={jobId} order={scene.order} runs={scene.flow_runs} hasClip={Boolean(scene.clip_url)} regenerationInstructions={!scene.clip_url && (scene.attempts?.at(-1)?.decision === "regenerate" || scene.attempts?.at(-1)?.conformance_decision === "replace") ? scene.attempts?.at(-1)?.review?.retry_prompt_delta.join("\n") ?? "" : undefined} locked={busy} canGenerate={productionRequired ? productionScene?.can_generate ?? false : undefined} canResume={productionRequired ? productionScene?.can_resume_flow ?? false : undefined} onChanged={onImported} />}
    <details open={!productMode} className="mt-4 rounded border p-3"><summary className="cursor-pointer">Advanced / Diagnostics · Manual Flow</summary>
    <p className="mt-2 text-sm text-slate-600">{request.visual_description}</p>
    {scene.first_frame_url && <img className="mt-4 max-h-80 rounded-md object-contain" src={buildApiUrl(scene.first_frame_url)} alt={`Scene ${scene.order} first frame`} />}
    <p className="mt-2 text-xs text-slate-500">Reference: {request.reference_mode?.replaceAll("_", " ") ?? (scene.first_frame_url ? "provider generated" : "none")}</p>
    <details className="mt-4"><summary className="cursor-pointer font-medium">Generation prompt and settings</summary>
    {request.image_prompt && <><h4 className="mt-4 font-medium">Image or reference prompt</h4><pre className="mt-2 whitespace-pre-wrap rounded-md bg-slate-100 p-4 text-sm">{request.image_prompt}</pre></>}
    {request.first_frame_prompt && <p className="mt-2 text-sm text-slate-600">First frame: {request.first_frame_prompt}</p>}
    <h4 className="mt-4 font-medium">Flow motion prompt</h4><pre className="mt-2 whitespace-pre-wrap rounded-md bg-slate-100 p-4 text-sm">{request.motion_prompt}</pre>
    <button type="button" className="mt-2 rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={() => void navigator.clipboard.writeText(request.motion_prompt)}>Copy prompt</button>
    <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><div>Provider: Google Flow ({flowWeb ? "browser experimental" : "manual"})</div><div>Duration: {request.duration_seconds} seconds</div><div>Aspect: {request.aspect_ratio}</div><div>Generation attempt: {request.generation_attempt}</div>{request.character_continuity && <div className="sm:col-span-2">Character continuity: {request.character_continuity}</div>}{request.environment_continuity && <div className="sm:col-span-2">Environment continuity: {request.environment_continuity}</div>}{request.last_frame_description && <div className="sm:col-span-2">Last frame: {request.last_frame_description}</div>}</dl>
    {request.audio_intent && <div className="mt-3 space-y-1 text-sm text-slate-700"><p>Audio intent: {request.audio_intent.mode.replaceAll("_", " ")}</p>{request.audio_intent.dialogue && <p>Dialogue: {request.audio_intent.dialogue}</p>}{request.audio_intent.sound_effects?.length ? <p>Sound effects: {request.audio_intent.sound_effects.join(", ")}</p> : null}{request.audio_intent.ambience && <p>Ambience: {request.audio_intent.ambience}</p>}</div>}
    </details>
    <a className="mt-4 inline-block text-blue-700 underline" href="https://flow.google.com/" target="_blank" rel="noreferrer">Open Google Flow</a>
    {canAttachReference && (<div className="mt-5 space-y-2 border-t border-slate-200 pt-4"><label className="block text-sm font-medium">{scene.first_frame_url ? "Replace reference PNG" : "Attach reference PNG (optional)"}<input className="mt-2 block w-full text-sm" type="file" accept="image/png,.png" onChange={(event) => setReferenceFile(event.target.files?.[0] ?? null)} /></label><button type="button" disabled={!referenceFile || busy} onClick={() => void importReference()} className="rounded-md border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">{busy ? "Uploading…" : "Upload reference"}</button></div>)}
    <div className="mt-5 space-y-2 border-t border-slate-200 pt-4">{canImport ? <><label className="block text-sm font-medium">{scene.clip_url ? "Replace scene clip" : "Import generated MP4"}<input ref={fileInputRef} className="mt-2 block w-full text-sm" type="file" accept="video/mp4,.mp4" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label><button type="button" disabled={!file || busy} onClick={() => void importClip()} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">{busy ? "Importing…" : scene.clip_url ? "Replace clip" : "Import MP4"}</button></> : <p className="text-sm text-slate-600">{flowRunning ? "Wait for Flow generation to pause before importing manually." : conformancePending ? "Resolve the media check below to continue or replace this clip." : "This scene has a clip pending review or already accepted. Use Regenerate to import another attempt."}</p>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}</div>
    {scene.clip_url && scene.clip_has_audio !== undefined && <p className="mt-2 text-sm text-slate-600">Imported clip audio: {scene.clip_has_audio ? "present" : "absent"}</p>}
    {(scene.attempts?.length ?? 0) > 0 && <div className="mt-6 border-t pt-4"><h4 className="font-semibold">Attempt history</h4><ul className="mt-2 space-y-2">{scene.attempts?.map((attempt) => <li key={attempt.attempt} className="text-sm"><details><summary className="cursor-pointer">Attempt {attempt.attempt} · Media: {attempt.conformance?.status.toUpperCase() ?? "historical / not recorded"} · AI: {attempt.review?.verdict?.toUpperCase() ?? (reviewPolicy === "off" ? "off" : "not reviewed")} · Scene: {attempt.decision ?? "no creative decision"}</summary><a className="mt-2 block text-blue-700 underline" href={buildApiUrl(`/scene-video-jobs/${encodeURIComponent(jobId)}/scenes/${scene.order}/attempts/${attempt.attempt}/clip`)} target="_blank" rel="noreferrer">Attempt {attempt.attempt} clip</a><MediaConformancePanel attempt={attempt} />{attempt.decision_history?.length ? <ul aria-label="Human decision history">{attempt.decision_history.map((item,index) => <li key={index}>{item.decision} · {item.at}{item.apply_review_corrections ? " · review corrections requested" : ""}</li>)}</ul> : null}{attempt.review && <><p className="mt-2">{attempt.review.summary}</p><ul>{(attempt.review.issues ?? []).map((issue, index) => <li key={index}>{issue.description}</li>)}</ul>{(attempt.review.frames ?? []).map((frame) => <a key={frame.index} className="mr-3 text-blue-700 underline" href={buildApiUrl(`/scene-video-jobs/${encodeURIComponent(jobId)}/scenes/${scene.order}/attempts/${attempt.attempt}/frames/${frame.index}`)} target="_blank" rel="noreferrer">Frame {frame.index}</a>)}{(attempt.review.retry_prompt_delta?.length ?? 0) > 0 && <div className="mt-2"><pre className="whitespace-pre-wrap bg-white p-2">{attempt.review.retry_prompt_delta.join("\n")}</pre><button type="button" className="mt-2 rounded border px-2 py-1" onClick={() => void navigator.clipboard.writeText(attempt.review?.retry_prompt_delta?.join("\n") ?? "")}>Copy retry suggestions</button></div>}</>}</details></li>)}</ul></div>}
    </details>
  </section>;
}

function ReviewPanel({ productMode, canReopen, jobId, scene, flowWeb, previousScene, attempt, busy, onAction }: { productMode?: boolean; canReopen?: boolean; flowWeb?: boolean; jobId: string; scene: Scene; previousScene?: Scene; attempt: Attempt; busy: boolean; onAction: (action: "accept" | "regenerate" | "regenerate_corrected" | "review") => Promise<void> }) {
  const review = attempt.review ? { ...attempt.review, issues: attempt.review.issues ?? [], retry_prompt_delta: attempt.review.retry_prompt_delta ?? [], frames: attempt.review.frames ?? [], checks: attempt.review.checks ?? {} } : undefined;
  if (!review) return null;
  const frameUrl = (index: number) => buildApiUrl(`/scene-video-jobs/${encodeURIComponent(jobId)}/scenes/${scene.order}/attempts/${attempt.attempt}/frames/${index}`);
  const previousAccepted = previousScene?.attempts?.find((item) => item.decision === "accepted");
  const previousFrameUrl = (index: number) => {
    const original = review.previous_frames?.[index - 1]?.index;
    if (scene.generation_request.start_frame && original) { const f = scene.generation_request.start_frame; return buildApiUrl(`/scene-video-jobs/${encodeURIComponent(jobId)}/scenes/${f.scene_order}/attempts/${f.attempt}/handoff/${f.index}`); }
    return previousScene && previousAccepted && original ? buildApiUrl(`/scene-video-jobs/${encodeURIComponent(jobId)}/scenes/${previousScene.order}/attempts/${previousAccepted.attempt}/frames/${original}`) : undefined;
  };
  return <div className="mt-5 rounded-lg border border-slate-300 bg-slate-50 p-4">
    <h4 className="font-semibold">AI visual review · <span className={review.verdict === "fail" ? "text-red-700" : review.verdict === "warning" ? "text-amber-700" : "text-green-700"}>{review.verdict === "pass" ? "Looks consistent" : review.verdict === "warning" ? "Minor continuity concerns" : "Significant differences found"}</span></h4>
    <p className="mt-1 text-xs text-slate-600">Advisory result. Your Accept or Regenerate decision controls assembly.</p>
    <p className="mt-2 text-sm">{review.issues[0]?.description || (review.verdict === "pass" ? "The sampled frames look consistent with the story." : "Review the video and decide whether the differences are intentional.")}</p>
    {review.verdict === "fail" && <p className="mt-2 text-sm">You can still accept the scene if these differences are intentional.</p>}
    <details open={!productMode} className="mt-3"><summary className="cursor-pointer">Full AI details</summary><p className="mt-2">{review.summary}</p>
    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">{Object.entries(review.checks).map(([name, verdict]) => <div key={name}><dt className="inline font-medium">{name.replaceAll("_", " ")}: </dt><dd className="inline">{verdict.replaceAll("_", " ")}</dd></div>)}</dl>
    {review.issues.length > 0 && <div className="mt-4"><h5 className="font-medium">Issues</h5><ul className="mt-2 space-y-3">{review.issues.map((issue, index) => <li key={index} className="text-sm"><strong>{issue.category.replaceAll("_", " ")} · {issue.severity}</strong><p>{issue.description}</p><div className="mt-2 flex flex-wrap gap-2">{issue.previous_evidence_frames?.map((frame) => { const url = previousFrameUrl(frame); return url ? <a key={`previous-${frame}`} href={url} target="_blank" rel="noreferrer" className="block"><img className="h-24 max-w-36 rounded object-contain" src={url} alt={`Previous accepted scene evidence frame ${frame}`} /><span className="text-xs text-blue-700 underline">Previous frame {frame}</span></a> : null; })}{(issue.evidence_frames ?? []).map((frame) => <a key={frame} href={frameUrl(frame)} target="_blank" rel="noreferrer" className="block"><img className="h-24 max-w-36 rounded object-contain" src={frameUrl(frame)} alt={`Scene ${scene.order} evidence frame ${frame}`} /><span className="text-xs text-blue-700 underline">Current frame {frame} · {review.frames.find((item) => item.index === frame)?.timestamp_seconds.toFixed(2)}s</span></a>)}</div></li>)}</ul></div>}
    {review.retry_prompt_delta.length > 0 && <div className="mt-4"><h5 className="font-medium">Suggested Flow prompt additions</h5><pre className="mt-2 whitespace-pre-wrap rounded bg-white p-3 text-sm">{review.retry_prompt_delta.join("\n")}</pre><button type="button" onClick={() => void navigator.clipboard.writeText(review.retry_prompt_delta.join("\n"))} className="mt-2 rounded border px-3 py-2 text-sm">Copy suggestions</button></div>}
    <p className="mt-3 text-xs text-slate-600">Sampled still frames cannot establish audio quality, dialogue, smooth motion, full action, or lip sync.</p>
    </details>
    {!attempt.decision && <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void onAction("accept")} className="rounded bg-green-800 px-4 py-2 text-sm text-white">Accept Scene</button><button type="button" disabled={busy} onClick={() => void onAction("regenerate")} className="rounded border border-slate-400 px-4 py-2 text-sm">Regenerate</button>{flowWeb && attempt.review?.retry_prompt_delta?.length ? <button type="button" disabled={busy} onClick={() => void onAction("regenerate_corrected")} className="rounded border px-4 py-2 text-sm">Regenerate with review corrections</button> : null}</div>}
    {attempt.decision && <p className="mt-4 text-sm font-medium">Human decision: {attempt.decision}</p>}
    {canReopen && attempt.decision === "accepted" && flowWeb && attempt.review?.retry_prompt_delta?.length ? <button type="button" disabled={busy} onClick={() => void onAction("regenerate_corrected")} className="mt-3 rounded border px-4 py-2 text-sm">Replace accepted scene with review corrections</button> : null}
  </div>;
}


function ReviewExecutionPanel({ attempt, busy, onRetry }: { attempt: Attempt; busy: boolean; onRetry: () => void }) {
  const run = attempt.review_runs?.at(-1);
  const status = run?.status ?? (attempt.review ? "completed" : "not_requested");
  return <div className="mt-5 rounded-lg border border-slate-300 bg-slate-50 p-4">
    <h4 className="font-semibold">AI review</h4>
    {status === "queued" && <p role="status" className="mt-2">Queued…</p>}
    {status === "running" && <p role="status" className="mt-2">Reviewing scene…</p>}
    {["queued", "running"].includes(status) && <p className="mt-2 text-sm text-slate-600">The clip is stored safely. You can leave or reload this page.</p>}
    {status === "failed" && <><p className="mt-2 font-medium text-red-700">AI review failed</p><p className="mt-2 text-sm">{run?.failure}</p><p className="mt-2 text-sm text-slate-600">Your clip and media checks are unchanged. Assembly requires a completed review and your acceptance.</p></>}
    {["failed", "not_requested"].includes(status) && <button type="button" disabled={busy} onClick={onRetry} className="mt-3 rounded border px-3 py-2 text-sm disabled:opacity-50">{busy ? "Queueing AI review…" : "Retry AI review"}</button>}
    {status === "completed" && <p className="mt-2 text-sm">Review completed. Your creative decision remains separate.</p>}
    {attempt.review_runs?.length ? <details className="mt-3 text-sm"><summary>Review runs ({attempt.review_runs.length})</summary><ol className="mt-2 space-y-2">{attempt.review_runs.map((item, index) => <li key={item.run_id}>#{index + 1} · {item.status}{item.failure ? ` · ${item.failure}` : ""}{item.started_at && item.finished_at ? ` · ${Math.max(0, Math.round((Date.parse(item.finished_at) - Date.parse(item.started_at)) / 1000))}s` : ""}</li>)}</ol></details> : null}
  </div>;
}
