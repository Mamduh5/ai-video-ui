import { useRef, useState } from "react";
import { apiJson, buildApiUrl } from "../lib/apiClient";
import { flowQualityLabel } from "../features/settings/contracts";
import { MediaConformancePanel } from "./MediaConformancePanel";
import { FlowGenerationPanel } from "./FlowGenerationPanel";
import type { SceneProduction } from "./ProductionOverview";
import { ReviewPlayer } from "./ReviewPlayer";
import { HandoffPanel, TransitionComparison } from "./ContinuityPanel";
import { OpeningComparison } from "./OpeningImagePanel";
import { ScenePromptEditor } from "./ScenePromptEditor";
import type { Attempt, ReviewPolicy, Scene } from "./sceneVideoTypes";
export function SceneCard({ approvedOpeningUrl, jobId, scene, flowWeb, productionScene, productionRequired, previousScene, nextScene, chained, paused, reviewPolicy, onImported, productMode, studio }: { approvedOpeningUrl?: string; jobId: string; scene: Scene; flowWeb?: boolean; productionScene?: SceneProduction; productionRequired?: boolean; previousScene?: Scene; nextScene?: Scene; chained?: boolean; paused?: boolean; productMode?: boolean; studio?: boolean; reviewPolicy: ReviewPolicy; onImported: () => void }) {
  const [promptDirty,setPromptDirty]=useState(false);
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
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {productMode && chained && scene.order === 1 && <p className="mt-1 text-sm text-slate-500">This scene starts a new video. The next scene continues from its accepted ending frame.</p>}
    {!studio && scene.clip_url && <ReviewPlayer src={buildApiUrl(scene.clip_url)} label={`Scene ${scene.order}`} frames={currentAttempt?.review?.frames?.map(frame => ({ ...frame, url: buildApiUrl(`/scene-video-jobs/${encodeURIComponent(jobId)}/scenes/${scene.order}/attempts/${currentAttempt.attempt}/frames/${frame.index}`) }))} />}
    {scene.order === 1 && approvedOpeningUrl && currentAttempt?.review?.frames?.[0] && <OpeningComparison approvedUrl={approvedOpeningUrl} generatedUrl={buildApiUrl(`/scene-video-jobs/${encodeURIComponent(jobId)}/scenes/1/attempts/${currentAttempt.attempt}/frames/${currentAttempt.review.frames[0].index}`)} />}
    {request.start_frame && currentAttempt?.review?.frames?.[0] && <TransitionComparison previousUrl={buildApiUrl(`/scene-video-jobs/${encodeURIComponent(jobId)}/scenes/${request.start_frame.scene_order}/attempts/${request.start_frame.attempt}/handoff/${request.start_frame.index}`)} openingUrl={buildApiUrl(`/scene-video-jobs/${encodeURIComponent(jobId)}/scenes/${scene.order}/attempts/${currentAttempt.attempt}/frames/${currentAttempt.review.frames[0].index}`)} previousExit={previousScene?.generation_request.exit_state} currentEntry={request.entry_state} openingSeconds={currentAttempt.review.frames[0].timestamp_seconds} />}
    {chained && nextScene && currentAttempt?.decision === "accepted" && <HandoffPanel jobId={jobId} order={scene.order} attempt={currentAttempt.attempt} frames={currentAttempt.handoff_frames} selection={currentAttempt.handoff} locked={Boolean(nextScene.flow_runs?.length || nextScene.clip_url)} paused={paused} onChanged={onImported} />}
    {!conformancePending && currentAttempt?.conformance && <details className="mt-3"><summary className="cursor-pointer">Media check</summary><MediaConformancePanel attempt={currentAttempt} /></details>}
    {conformancePending && currentAttempt?.conformance && <MediaConformancePanel attempt={currentAttempt}>{conformancePending && <div className="mt-4 space-y-3">
      <p className="text-sm">{reviewPolicy !== "off" ? "Continue Anyway means: keep this media despite the mismatch and continue to the selected review mode. It does not accept the scene for final assembly." : "Continue Anyway keeps this media despite the mismatch. AI review is off; assembly can proceed when all clips pass or have a media override."}</p>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void actConformance("replace")} className="rounded border border-slate-400 px-4 py-2 text-sm disabled:opacity-50">Generate Again</button><button type="button" disabled={busy} onClick={() => void actConformance("continue")} className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">Use Anyway</button></div>
      {busy && <p role="status" className="text-sm">{reviewPolicy === "ai_assisted" ? "Saving media decision and queueing AI review…" : "Applying media decision; assembly may take a moment…"}</p>}
    </div>}</MediaConformancePanel>}
    {reviewPolicy === "ai_assisted" && currentAttempt && !conformancePending && (!currentAttempt.review || currentAttempt.review_runs?.at(-1)?.status === "failed") && <ReviewExecutionPanel attempt={currentAttempt} busy={busy} onRetry={() => void act(currentAttempt.review_runs?.length ? "retry" : "review")} />}
    {reviewPolicy === "ai_assisted" && currentAttempt?.review && (!currentAttempt.review_runs?.length || currentAttempt.review_runs.at(-1)?.status === "completed") && !conformancePending && <ReviewPanel productMode={productMode} canReopen={Boolean(chained && nextScene && !nextScene.flow_runs?.length && !nextScene.clip_url)} flowWeb={flowWeb} jobId={jobId} scene={scene} previousScene={previousScene} attempt={currentAttempt} busy={busy} onAction={act} />}
    {Boolean(request.fast_plan_diagnostics?.length) && <div className="mt-3 rounded border border-amber-300 p-3" role="status"><p>Fast plan advisories: review speaker ownership, full dialogue, props and timing before generation. If speech cannot fit, revise the plan or speaking allocation; preserve every required line. Manual override remains available.</p><ul>{request.fast_plan_diagnostics?.map(code => <li key={code}>{code.replaceAll("_", " ")}</li>)}</ul></div>}

    {reviewPolicy==='human_only'&&currentAttempt&&!conformancePending&&!currentAttempt.decision&&<div className="mt-3 space-x-3"><p className="mb-2">Watch this scene. Your explicit decision is required; no AI visual review was performed.</p><button disabled={busy} className="rounded border p-3" onClick={()=>void act("accept")}>Accept scene</button><button disabled={busy} className="rounded border p-3" onClick={()=>void act("regenerate")}>Regenerate scene</button></div>}
    {flowWeb && !scene.clip_url && <FlowGenerationPanel jobId={jobId} order={scene.order} runs={scene.flow_runs} hasClip={Boolean(scene.clip_url)} regenerationInstructions={!scene.clip_url && (scene.attempts?.at(-1)?.decision === "regenerate" || scene.attempts?.at(-1)?.conformance_decision === "replace") ? scene.attempts?.at(-1)?.review?.retry_prompt_delta.join("\n") ?? "" : undefined} locked={busy||promptDirty} canGenerate={productionRequired ? productionScene?.can_generate ?? false : undefined} canResume={productionRequired ? productionScene?.can_resume_flow ?? false : undefined} onChanged={onImported} />}
    <details className="studio-prompt-drawer" open={!productMode}><summary>Story &amp; Prompt</summary>
    {flowWeb&&<ScenePromptEditor key={`${scene.order}-${request.prompt_control?.revision??0}`} id={jobId} order={scene.order} prompt={scene.effective_prompt??request.motion_prompt} control={request.prompt_control} locked={Boolean(scene.clip_url||flowRunning||scene.flow_runs?.at(-1)?.submission_intent&&!["completed","resolved_manual","resolved_no_result"].includes(scene.flow_runs?.at(-1)?.status??""))} onChanged={onImported} onDirty={setPromptDirty}/>}
    <p className="mt-2 text-sm">Starts: {request.entry_state}</p><p className="text-sm">Ends: {request.exit_state}</p>
    </details>
    <details open={!productMode} className="mt-4 rounded border p-3"><summary className="cursor-pointer">Advanced / Diagnostics · Manual Flow</summary>
    <p className="mt-2 text-sm text-slate-600">{request.visual_description}</p>
    {scene.first_frame_url && <img className="mt-4 max-h-80 rounded-md object-contain" src={buildApiUrl(scene.first_frame_url)} alt={`Scene ${scene.order} first frame`} />}
    <p className="mt-2 text-xs text-slate-500">Reference: {request.reference_mode?.replaceAll("_", " ") ?? (scene.first_frame_url ? "provider generated" : "none")}</p>
    <details className="mt-4"><summary className="cursor-pointer font-medium">Generation prompt and settings</summary>
    {request.image_prompt && <><h4 className="mt-4 font-medium">Image or reference prompt</h4><pre className="mt-2 whitespace-pre-wrap rounded-md bg-slate-100 p-4 text-sm">{request.image_prompt}</pre></>}
    {request.first_frame_prompt && <p className="mt-2 text-sm text-slate-600">First frame: {request.first_frame_prompt}</p>}
    <h4 className="mt-4 font-medium">Flow motion prompt</h4><pre className="mt-2 whitespace-pre-wrap rounded-md bg-slate-100 p-4 text-sm">{request.motion_prompt}</pre>
    <button type="button" className="mt-2 rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={() => void navigator.clipboard.writeText(request.motion_prompt)}>Copy prompt</button>
    <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><div>Provider: Google Flow ({flowWeb ? "browser experimental" : "manual"})</div><div>Duration: {request.duration_seconds} seconds</div><div>Aspect: {request.aspect_ratio}</div>{flowWeb&&<div>Quality: {flowQualityLabel(request.generation_resolution)}</div>}<div>Generation attempt: {request.generation_attempt}</div>{request.character_continuity && <div className="sm:col-span-2">Character continuity: {request.character_continuity}</div>}{request.environment_continuity && <div className="sm:col-span-2">Environment continuity: {request.environment_continuity}</div>}{request.last_frame_description && <div className="sm:col-span-2">Last frame: {request.last_frame_description}</div>}</dl>
    {request.audio_intent && <div className="mt-3 space-y-1 text-sm text-slate-700"><p>Audio intent: {request.audio_intent.mode.replaceAll("_", " ")}</p>{request.audio_intent.dialogue && <p>Dialogue: {request.audio_intent.dialogue}</p>}{request.audio_intent.sound_effects?.length ? <p>Sound effects: {request.audio_intent.sound_effects.join(", ")}</p> : null}{request.audio_intent.ambience && <p>Ambience: {request.audio_intent.ambience}</p>}</div>}
    </details>
    <a className="mt-4 inline-block text-blue-700 underline" href="https://flow.google.com/" target="_blank" rel="noreferrer">Open Google Flow</a>
    {canAttachReference && (<div className="mt-5 space-y-2 border-t border-slate-200 pt-4"><label className="block text-sm font-medium">{scene.first_frame_url ? "Replace reference PNG" : "Attach reference PNG (optional)"}<input className="mt-2 block w-full text-sm" type="file" accept="image/png,.png" onChange={(event) => setReferenceFile(event.target.files?.[0] ?? null)} /></label><button type="button" disabled={!referenceFile || busy} onClick={() => void importReference()} className="rounded-md border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">{busy ? "Uploading…" : "Upload reference"}</button></div>)}
    <div className="mt-5 space-y-2 border-t border-slate-200 pt-4">{canImport ? <><label className="block text-sm font-medium">{scene.clip_url ? "Replace scene clip" : "Import generated MP4"}<input ref={fileInputRef} className="mt-2 block w-full text-sm" type="file" accept="video/mp4,.mp4" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label><button type="button" disabled={!file || busy} onClick={() => void importClip()} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">{busy ? "Importing…" : scene.clip_url ? "Replace clip" : "Import MP4"}</button></> : <p className="text-sm text-slate-600">{flowRunning ? "Wait for Flow generation to pause before importing manually." : conformancePending ? "Resolve the media check below to continue or replace this clip." : "This scene has a clip pending review or already accepted. Use Regenerate to import another attempt."}</p>}</div>
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
    {productMode && <div className="studio-review-checks" aria-label="Review checks">{Object.entries(review.checks).map(([name, verdict]) => <span key={name}>{name.replaceAll("_", " ")}: {verdict.replaceAll("_", " ")}</span>)}</div>}
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
