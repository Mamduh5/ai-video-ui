import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { libraryHref } from "../features/projectLibrary/presentation";
import { buildApiUrl } from "../lib/apiClient";
import { flowQualityLabel } from "../features/settings/contracts";
import { GenerationSnapshot } from "./GenerationSettingsFields";
import { ReviewPlayer } from "./ReviewPlayer";
import type { Scene, SceneJob } from "./sceneVideoTypes";

export type StudioSelection = number | "final";
function sceneState(scene: Scene, job: SceneJob) {
  const status = job.production?.scenes?.find(item => item.order === scene.order)?.status ?? scene.status;
  if (status === "accepted" || scene.status === "accepted") return { label: "Completed", tone: "complete" };
  if (/fail/.test(status)) return { label: "Failed", tone: "attention" };
  if (/attention|mismatch/.test(status)) return { label: "Needs attention", tone: "attention" };
  if (/decision|acceptance|handoff/.test(status)) return { label: "Review required", tone: "review" };
  if (/generating|queued|running|importing|submitted|review_pending|reviewing/.test(status) || job.next_action?.scene_order === scene.order && job.next_action.background) return { label: "In progress", tone: "active" };
  if (/review/.test(status)) return { label: "Review required", tone: "review" };
  return { label: "Waiting", tone: "waiting" };
}

export function ProjectDetailHeader({ job, controls, onRefresh }: { job: SceneJob; controls?: ReactNode; onRefresh: () => void }) {
  const total = job.scene_count ?? job.production?.scene_count ?? job.scenes?.length ?? 0;
  const accepted = job.accepted_count ?? job.production?.accepted_count ?? job.scenes?.filter(scene => scene.status === "accepted").length ?? 0;
  const automatic = Boolean(job.autopilot || job.production?.mode === "flow_unattended");
  const tone = job.status === "completed" ? "complete" : job.production?.paused ? "waiting" : /fail|attention/.test(job.status) ? "attention" : /review|decision/.test(job.status) ? "review" : "active";
  const provider = job.autopilot ? "Gemini" : job.generation_provider === "flow_web" || job.production?.mode === "flow_unattended" ? "Flow" : "Manual";
  return <><div className="studio-breadcrumb"><Link to={libraryHref()}>← Projects</Link><button type="button" aria-label="Refresh project" onClick={onRefresh}>↻ Refresh</button></div>
    <header className="studio-header">
      <div className="studio-identity"><div className="studio-badges"><span className={`studio-status tone-${tone}`}>{job.display_status || job.status.replaceAll("_", " ")}</span><span className="studio-provider">{provider === "Gemini" ? "✦" : provider === "Flow" ? "◈" : "◇"} {provider}</span><span className="studio-mode">{job.autopilot ? "Gemini Autopilot" : job.production?.mode === "flow_unattended" ? "Flow unattended" : provider === "Flow" ? "Supervised production" : "Manual production"}</span></div>
        <h2>{job.title || "Untitled video"}</h2>
        <div className="studio-metadata"><span>{job.aspect_ratio ?? job.scenes?.[0]?.generation_request.aspect_ratio ?? "Aspect not recorded"}</span>{job.duration_seconds ? <span>{job.duration_seconds.toFixed(0)} sec</span> : null}{provider === "Flow" && <span>Generation quality: {flowQualityLabel(job.generation_resolution ?? job.scenes?.[0]?.generation_request.generation_resolution)}</span>}{job.audio_policy && <span>{job.audio_policy.replaceAll("_", " ")}</span>}</div>
        <details className="studio-snapshot"><summary>Saved generation settings</summary><GenerationSnapshot value={job.generation_settings ?? job.scenes?.[0]?.generation_request.generation_settings} sourceSeconds={job.scene_seconds ?? job.scenes?.[0]?.generation_request.duration_seconds ?? 0}/></details>
      </div>
      <div className="studio-header-controls"><div className="studio-progress"><strong>{accepted} / {total} scenes {automatic ? "produced" : "approved"}</strong><span>{automatic ? "Technical production progress" : "Your story, scene by scene"}</span><progress aria-label="Scene progress" value={accepted} max={Math.max(1, total)}/></div>{controls}</div>
    </header>
  </>;
}

export function SceneTimelineStrip({ job, selection, onSelect }: { job: SceneJob; selection?: StudioSelection; onSelect: (value: StudioSelection) => void }) {
  return <section className="studio-timeline"><div className="studio-section-heading"><h3>Scene timeline</h3><span>{job.scenes?.length ?? 0} scenes{job.continuity_mode === "chained_frames" ? " · Chained continuity" : ""}</span></div>
    <nav aria-label="Scene timeline" className="studio-scene-strip">{job.scenes?.map(scene => {
      const state = sceneState(scene, job);
      const thumbnail = scene.first_frame_url;
      return <button type="button" key={scene.order} className={`studio-scene-tile ${selection === scene.order ? "is-selected" : ""}`} aria-label={`Select scene ${scene.order}`} aria-pressed={selection === scene.order} onClick={() => onSelect(scene.order)}>
        <div className={`studio-tile-image tone-${state.tone}`}>{thumbnail ? <img src={buildApiUrl(thumbnail)} alt=""/> : <span aria-hidden="true">{state.tone === "complete" ? "✓" : state.tone === "review" ? "▷" : String(scene.order).padStart(2, "0")}</span>}</div>
        <div className="studio-tile-heading"><strong>Scene {String(scene.order).padStart(2, "0")}</strong><span>{scene.generation_request.duration_seconds ? `${scene.generation_request.duration_seconds}s` : ""}</span></div><span className={`studio-tile-status tone-${state.tone}`}>{state.label}</span><p>{scene.generation_request.story_beat || scene.generation_request.scene_goal || "Scene details pending"}</p>
      </button>;
    })}{(job.video_url || job.status === "completed") && <button type="button" className={`studio-scene-tile studio-final-tile ${selection === "final" ? "is-selected" : ""}`} aria-label="Select final video" aria-pressed={selection === "final"} onClick={() => onSelect("final")}><div className="studio-tile-image">▷</div><strong>Final video</strong><span>{job.video_url ? "Ready to watch" : "Restore media"}</span></button>}</nav>
  </section>;
}

export function StudioStage({ job, selection, opening, sourceRemoved }: { job: SceneJob; selection?: StudioSelection; opening?: boolean; sourceRemoved?: boolean }) {
  const scene = job.scenes?.find(item => item.order === selection);
  const attempt = scene?.attempts?.find(item => item.attempt === scene.current_attempt);
  const final = selection === "final";
  const archived = sourceRemoved || job.next_action?.type === "restore_local" || job.status === "completed" && !job.video_url;
  const src = archived ? undefined : final ? job.video_url : scene?.clip_url;
  const title = opening ? "Opening image" : final ? "Final video" : scene ? `Scene ${String(scene.order).padStart(2, "0")}` : "Storyboard preview";
  return <section className="studio-stage" aria-label="Studio stage"><div className="studio-stage-heading"><h3>{title}</h3><span>{opening ? "Visual starting point" : final ? "Assembled output" : "Source preview"}</span></div>
    {opening && !archived && job.opening_image_url ? <div className="studio-image-stage"><img src={buildApiUrl(job.opening_image_url)} alt="Opening image preview"/></div> : src ? <ReviewPlayer compact src={buildApiUrl(src)} label={final ? "Final video" : `Scene ${scene!.order}`} boundaries={final ? job.scene_boundaries : undefined} frames={attempt?.review?.frames?.map(frame => ({ ...frame, url: buildApiUrl(`/scene-video-jobs/${encodeURIComponent(job.id)}/scenes/${scene!.order}/attempts/${attempt.attempt}/frames/${frame.index}`) }))}/> : <div className="studio-placeholder"><span aria-hidden="true">{archived ? "↓" : job.next_action?.background ? "◌" : "▷"}</span><h3>{sourceRemoved ? "Restore this scene to preview" : archived ? "Restore your video to watch" : opening ? "Your opening image will appear here" : job.next_action?.background ? "Production in progress" : "Your story starts here"}</h3><p>{sourceRemoved ? "This scene is archived. Restore source media in Storage below. Your final video remains available." : archived ? "Archived media is unavailable locally. Open Storage below to check verification and restore playback." : job.next_action?.background ? job.next_action.label : "Review the storyboard and production instructions. Footage appears here when it is available."}</p>{job.next_action?.background && <p>Your project is stored safely. You can leave or reload this page.</p>}</div>}
  </section>;
}
