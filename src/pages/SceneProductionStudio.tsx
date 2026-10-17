import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiJson, buildApiUrl } from "../lib/apiClient";
import { generationSettingsForReplannedProject } from "../features/settings/contracts";
import { bangkokTime } from "../lib/autopilotTime";
import { GenerationRevisionPanel } from "./GenerationRevisionPanel";
import { SlowdownExportPanel } from "./SlowdownExportPanel";
import { ProjectStorage } from "./StoragePage";
import { useProjectStorage } from "./useProjectStorage";
import { AuthoredStoryboardPanel } from "./AuthoredStoryboardPanel";
import { ColabPlanningPanel } from "./ColabPlanningPanel";
import { LongPlanningPanel } from "./LongPlanningPanel";
import { AutopilotFailure } from "./autopilotStatus";
import { OpeningImagePanel, OpeningProviderSettings } from "./OpeningImagePanel";
import { ProductionOverview } from "./ProductionOverview";
import { ScenePromptEditor } from "./ScenePromptEditor";
import { SceneCard } from "./SceneReviewInspector";
import { ProjectDetailHeader, SceneTimelineStrip, StudioStage, type StudioSelection } from "./ProjectStudio";
import type { SceneJob } from "./sceneVideoTypes";

export function SceneProductionStudio({ job, onChanged }: { job: SceneJob; onChanged: () => void }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [dirtyPrompts, setDirtyPrompts] = useState<Record<number, boolean>>({});
  const [diagnostics, setDiagnostics] = useState(false);
  const [chosen, setChosen] = useState<{ target: string; value: StudioSelection }>();
  const action = job.next_action;
  const automatic = Boolean(job.autopilot || job.production?.mode === "flow_unattended");
  const completed = job.status === "completed";
  const storage = useProjectStorage(job.id, completed);
  const artifacts = storage.data?.artifacts ?? [];
  const removedScenes = new Set(artifacts.filter(item => item.role === "scene_clip" && item.local_removed).map(item => item.scene_order));
  const removedReferences = new Set(artifacts.filter(item => item.role === "reference_image" && item.local_removed).map(item => item.scene_order));
  const finalRemoved = artifacts.some(item => item.role === "final_video" && item.local_removed);
  const archived = action?.type === "restore_local" || completed && (!job.video_url || finalRemoved);
  const mediaJob = { ...job, video_url: finalRemoved ? undefined : job.video_url, scenes: job.scenes?.map(scene => ({ ...scene, clip_url: removedScenes.has(scene.order) ? undefined : scene.clip_url, first_frame_url: removedReferences.has(scene.order) ? undefined : scene.first_frame_url })) };
  const target = `${action?.type ?? job.status}:${action?.scene_order ?? job.production?.current_scene ?? ""}`;
  const selection = chosen?.target === target ? chosen.value : completed ? "final" : action?.scene_order ?? job.production?.current_scene ?? job.scenes?.[0]?.order;
  const selected = job.scenes?.find(scene => scene.order === selection);
  const index = selected ? job.scenes!.indexOf(selected) : -1;
  const openingAction = Boolean(action && ["prepare_opening_image", "wait_for_opening_image", "review_opening_image", "recover_opening_image"].includes(action.type));
  const freshDraft = !job.production?.started && !job.scenes?.some(scene => scene.clip_url || scene.flow_runs?.length || scene.attempts?.length);
  const storyReady = !automatic && Boolean(action) && freshDraft && action?.type !== "manual_generation" && !job.video_url && Boolean(job.scenes?.length);
  const savedResolution = job.generation_resolution ?? job.scenes?.[0]?.generation_request.generation_resolution;
  const promptDirty = Object.values(dirtyPrompts).some(Boolean);
  const select = (value: StudioSelection) => setChosen({ target, value });
  // Production mutations retain the existing request bodies and explicit click boundary.
  async function control(kind: string) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await apiJson<{ queue_error?: string }>(`/scene-video-jobs/${encodeURIComponent(job.id)}/production/${kind}`, { method: "POST", body: kind === "start" ? { auto_advance_after_accept: true } : undefined });
      if (response.queue_error) setError(response.queue_error);
      onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update production."); }
    finally { setBusy(false); }
  }
  async function regenerate() {
    if (busy || !freshDraft) return;
    setBusy(true); setError("");
    try {
      if (job.colab_planning) { await apiJson(`/scene-video-jobs/${encodeURIComponent(job.id)}/colab/retry`, { method: "POST" }); setDirtyPrompts({}); onChanged(); return; }
      const response = await apiJson<{ job_id: string }>("/scene-video-jobs", { method: "POST", body: { title: job.title, topic: job.topic, character: job.character, generation_settings: generationSettingsForReplannedProject(job.generation_settings ?? job.scenes?.[0]?.generation_request.generation_settings), scene_count: job.scene_count || job.scenes?.length || 2, aspect_ratio: job.aspect_ratio, ...(job.generation_provider === "flow_web" && savedResolution ? { generation_resolution: savedResolution } : {}), scene_seconds: job.scene_seconds || job.scenes?.[0]?.generation_request.duration_seconds || undefined, preset: job.preset || undefined, audio_policy: job.audio_policy, review_policy: job.review_policy, reference_mode: job.reference_mode, continuity_mode: job.continuity_mode, opening_image_required: job.opening_image?.required } });
      navigate(`/scene-jobs/${response.job_id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not regenerate storyboard."); }
    finally { setBusy(false); }
  }
  return <div className="project-studio">
    <ProjectDetailHeader job={job} onRefresh={onChanged} controls={!automatic && job.production?.started && !completed && !job.production.paused ? <button type="button" disabled={busy} onClick={() => void control("pause")}>Pause</button> : undefined}/>
    <div className="studio-workspace">
      <div className="studio-primary"><StudioStage job={mediaJob} selection={selection} opening={openingAction} sourceRemoved={typeof selection === "number" && removedScenes.has(selection)}/><SceneTimelineStrip job={mediaJob} selection={selection} onSelect={select}/></div>
      <aside className="studio-inspector" aria-label="Action inspector">
        <section className={`studio-action tone-${archived ? "review" : completed ? "complete" : job.production?.paused ? "waiting" : /fail|attention/.test(job.status) ? "attention" : action?.background || automatic ? "active" : "review"}`} aria-label={action?.background ? "App working" : "What needs your attention"}>
          <p className="studio-eyebrow">{completed ? "Production complete" : automatic ? "Production status" : action?.background ? "App working" : "Next required action"}</p>
          <h3>{archived ? "Restore your archived video" : completed ? "Your video is ready" : automatic ? job.production?.mode === "flow_unattended" ? "Flow Unattended Status" : "Gemini Autopilot Status" : action?.type === "start_production" ? "Your storyboard is ready" : action?.background ? "App working" : "What needs your attention"}</h3>
          <p role="status">{action?.message || job.display_status || job.current_step.replaceAll("_", " ")}</p>
          {action && !completed && <strong className="studio-action-label">{action.label}</strong>}
          {automatic ? <AutomaticProductionStatus job={job}/> : <>
            {action?.type === "resume_production" && <><button type="button" disabled={busy} className="studio-primary-button" onClick={() => void control("resume")}>Resume Production</button><p>Paused: no next Flow submission. An already submitted scene continues safely.</p></>}
            {action?.type === "start_production" && job.generation_provider === "flow_web" && storyReady && <button type="button" disabled={busy || promptDirty} className="studio-primary-button" onClick={() => void control("start")}>{busy ? "Starting…" : "Start Production"}</button>}
            {freshDraft && (storyReady || action?.type === "generate_storyboard") && <button type="button" disabled={busy} onClick={() => void regenerate()}>Regenerate Storyboard</button>}
            {action?.scene_order && selection !== action.scene_order ? <button type="button" className="studio-primary-button" onClick={() => select(action.scene_order!)}>Go to Scene {action.scene_order}</button> : null}
            {!action && job.status === "awaiting_external_generation" && job.generation_provider !== "flow_web" && <p>Human action required: generate each scene in Google Flow and import its MP4.</p>}
            {storyReady && <p className="studio-safety">Start authorizes sequential generation. Each scene waits for your approval. Video generation can consume Flow credits.</p>}
          </>}
          {job.video_url && !archived && <a className="studio-primary-button" href={buildApiUrl(job.video_url + "?download=1")} download>Download Video</a>}
          {archived && <p>Media must be restored before playback or slowdown export. Storage below shows verification and restoration requirements.</p>}
          {job.error && <p role="alert">{job.error}</p>}{error && <p role="alert">{error}</p>}
        </section>
        {selected && removedScenes.has(selected.order) && !archived && <section className="studio-scene-details"><h3>Scene {selected.order} source is archived</h3><p>The final video is still available. Restore source media in Storage before reviewing or exporting this scene.</p></section>}
        {!automatic && !archived && openingAction && job.opening_image ? <OpeningImagePanel jobId={job.id} opening={job.opening_image} imageUrl={job.opening_image_url} expected={job.scenes?.[0]?.generation_request.entry_state} action={action!.type} onChanged={onChanged}/> : !automatic && !archived && selected && !removedScenes.has(selected.order) && !storyReady && <SceneCard key={selected.order} studio jobId={job.id} scene={selected} productionScene={job.production?.scenes?.find(scene => scene.order === selected.order)} productionRequired={Boolean(job.production?.started || job.production && job.production.scene_count > 1 && (job.review_policy === "ai_assisted" || job.review_policy === "human_only"))} flowWeb={job.generation_provider === "flow_web"} previousScene={job.scenes?.[index - 1]} nextScene={job.scenes?.[index + 1]} chained={job.continuity_mode === "chained_frames"} paused={job.production?.paused} reviewPolicy={job.review_policy ?? "off"} onImported={onChanged} approvedOpeningUrl={job.approved_opening_url} productMode={Boolean(action)}/>}
        {automatic && selected && <AutomaticSceneDetails job={mediaJob} order={selected.order}/>}
      </aside>
    </div>
    <div className="studio-secondary">
      {job.planner_provenance?.provider === "operator_authored" && !job.production_plan_url && <AuthoredStoryboardPanel id={job.id} onChanged={onChanged}/>}
      {job.colab_planning && <ColabPlanningPanel id={job.id} planning={job.colab_planning} unattended={job.production?.mode === "flow_unattended"} onChanged={onChanged}/>}
      {job.long_planning && <LongPlanningPanel id={job.id} progress={job.long_planning} gemini={Boolean(job.autopilot)} onChanged={onChanged}/>}
      {storyReady && <section aria-label="Storyboard" className="studio-storyboard"><h3>Storyboard</h3><p>Approx. video length: ~{job.scenes?.reduce((total, scene) => total + scene.generation_request.duration_seconds, 0)} sec before transitions/normalization.</p><ol>{job.scenes?.map(scene => <li key={scene.order}><h4>{scene.order}. {scene.generation_request.story_beat || scene.generation_request.scene_goal}</h4><p>{scene.generation_request.action || scene.generation_request.visual_description}</p><details><summary>Scene details</summary><p>Start state: {scene.generation_request.entry_state}</p><p>End state: {scene.generation_request.exit_state}</p><p>Continuity notes: {scene.generation_request.character_continuity}</p><pre>{scene.generation_request.motion_prompt}</pre></details>{job.generation_provider === "flow_web" && <ScenePromptEditor key={`${scene.order}-${scene.generation_request.prompt_control?.revision ?? 0}`} id={job.id} order={scene.order} prompt={scene.effective_prompt ?? scene.generation_request.motion_prompt} control={scene.generation_request.prompt_control} onChanged={onChanged} onDirty={dirty => setDirtyPrompts(old => ({ ...old, [scene.order]: dirty }))}/>}</li>)}</ol><p>{job.scene_count ?? job.scenes?.length} scenes will require up to {job.scene_count ?? job.scenes?.length} initial Flow video generations. Regenerations may use additional generations.</p></section>}
      {!automatic && job.generation_provider === "flow_web" && !job.opening_image && job.production?.started && job.production.current_scene === 1 && !job.scenes?.[0]?.clip_url && <details className="studio-drawer"><summary>Opening image option</summary><p>Verify the initial visual state before another video generation.</p><button type="button" disabled={busy} onClick={() => { if (busy) return; setBusy(true); void apiJson(`/scene-video-jobs/${encodeURIComponent(job.id)}/opening-image/enable`, { method: "POST" }).then(onChanged).catch(cause => setError(cause instanceof Error ? cause.message : "Could not enable opening image review.")).finally(() => setBusy(false)); }}>Review an opening image first</button></details>}
      <SlowdownExportPanel jobId={job.id} completed={completed} available={!archived} sourceScenesAvailable={removedScenes.size === 0} finalUrl={archived ? undefined : job.video_url} scenes={archived ? [] : mediaJob.scenes ?? []}/>
      {completed && <ProjectStorage id={job.id} completed={completed} query={storage} onChanged={onChanged}/>}
      <GenerationRevisionPanel job={job}/>
      <details className="studio-drawer" onToggle={event => setDiagnostics(event.currentTarget.open)}><summary>{completed ? "View production details · " : ""}Advanced / Diagnostics</summary>{diagnostics && <Diagnostics job={job} automatic={automatic} onChanged={onChanged}/>}</details>
    </div>
  </div>;
}

function AutomaticProductionStatus({ job }: { job: SceneJob }) {
  const unattended = job.production?.mode === "flow_unattended";
  return <div className="studio-automatic"><p>{unattended ? "Technical acceptance is automatic. Rendered-frame findings and quality warnings appear below when recorded." : `${job.scenes?.some(scene => scene.attempts?.some(attempt => attempt.external_recovery)) ? "Includes owner-submitted recovery accepted after R3 validation." : job.status === "completed" ? "Accepted by Gemini Autopilot after R3 validation." : "Gemini Autopilot performs technical validation automatically."} Creative quality has not been human reviewed.`}</p>{job.diagnostic && <AutopilotFailure detail={job.diagnostic}/>} {job.blockers?.map((detail, index) => <AutopilotFailure key={`${detail.code}-${index}`} detail={detail}/>)}{job.next_automatic_at && <p>Next automatic action: {job.eligibility_estimated ? "ESTIMATE: " : ""}{bangkokTime(job.next_automatic_at)}</p>}<Link to={unattended ? "/flow-autopilot" : "/gemini-autopilot"}>{unattended ? "View Flow queue" : "View Gemini queue"}</Link></div>;
}
function AutomaticSceneDetails({ job, order }: { job: SceneJob; order: number }) {
  const scene = job.scenes?.find(item => item.order === order);
  const attempt = scene?.attempts?.at(-1);
  return <section className="studio-scene-details"><h3>Scene {order}: {scene?.generation_request.story_beat}</h3>{scene?.clip_url && job.next_action?.type !== "restore_local" && !(job.status === "completed" && !job.video_url) && <a href={buildApiUrl(scene.clip_url)} target="_blank" rel="noreferrer">View scene</a>}<p>{scene?.generation_request.action || scene?.generation_request.visual_description}</p>{attempt?.visual_inspection && <p>{attempt.visual_inspection.findings}</p>}{attempt?.quality_warnings?.map((warning, index) => <p className="text-amber-800" key={index}>{warning}</p>)}<details><summary>Story &amp; Prompt</summary><pre>{scene?.generation_request.motion_prompt}</pre></details><details><summary>Media &amp; Attempts</summary><pre>{JSON.stringify(scene?.attempts ?? [], null, 2)}</pre></details></section>;
}
function Diagnostics({ job, automatic, onChanged }: { job: SceneJob; automatic: boolean; onChanged: () => void }) {
  return <div className="studio-diagnostics"><dl><dt>Job ID</dt><dd>{job.id}</dd><dt>Provider</dt><dd>{job.generation_provider}</dd><dt>Raw status / step</dt><dd>{job.status} / {job.current_step}</dd><dt>Failure</dt><dd>{job.error || job.production?.plan_error || "None recorded"}</dd></dl>{!automatic && job.opening_image && <OpeningProviderSettings jobId={job.id} opening={job.opening_image} onChanged={onChanged}/>} {!automatic && job.production && <ProductionOverview jobId={job.id} production={job.production} settings={job.scenes?.map(scene => ({ order: scene.order, duration_seconds: scene.generation_request.duration_seconds, aspect_ratio: scene.generation_request.aspect_ratio })) ?? []} onChanged={onChanged}/>} {job.production_plan_url && <a href={buildApiUrl(job.production_plan_url)} target="_blank" rel="noreferrer">View production plan</a>}<pre>{JSON.stringify(job, null, 2)}</pre></div>;
}
