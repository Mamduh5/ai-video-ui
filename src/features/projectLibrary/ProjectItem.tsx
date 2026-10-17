import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { buildApiUrl } from "../../lib/apiClient";
import { providers } from "./presentation";
import type { LibraryProject } from "./types";

function Thumbnail({ project }: { project: LibraryProject }) {
  const [failed, setFailed] = useState(false);
  return <div className="library-thumbnail">
    {project.thumbnail_url && !failed ? <img loading="lazy" decoding="async" src={buildApiUrl(project.thumbnail_url)}
      alt={`${project.title} preview`} className="object-contain" onError={() => setFailed(true)} /> :
      <div className="library-thumbnail-fallback" aria-label="Video preview unavailable">
        <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="4" y="7" width="24" height="18" rx="4" stroke="currentColor" strokeWidth="1.5"/><path d="m13 12 8 4-8 4z" fill="currentColor"/></svg>
        <span>Preview unavailable</span>
      </div>}
  </div>;
}

function Updated({ value }: { value: string | null }) {
  const [now] = useState(() => Date.now());
  if (!value || !Number.isFinite(Date.parse(value))) return <span>Update unavailable</span>;
  const date = new Date(value);
  const days = Math.floor(Math.max(0, now - date.getTime()) / 86_400_000);
  const text = days === 0 ? "Today" : days === 1 ? "Yesterday" : days < 7 ? `${days} days ago` :
    date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: date.getFullYear() !== new Date(now).getFullYear() ? "numeric" : undefined });
  return <time dateTime={value} title={date.toLocaleString()}>{text}</time>;
}

export const ProjectItem = memo(function ProjectItem({ project, onOpen }: { project: LibraryProject; onOpen: () => void }) {
  const href = `/scene-jobs/${encodeURIComponent(project.id)}`;
  const attention = ["failed", "conformance_attention_required"].includes(project.status) ||
    ["archive_failed", "restore_failed", "failed"].includes(project.storage.state);
  const tone = attention ? "attention" : project.paused ? "paused" : project.status === "completed" ? "complete" :
    ["awaiting_review", "awaiting_human_decision"].includes(project.status) ? "review" : "active";
  const action = project.next_action.background ? "View Progress" : project.next_action.type === "none" ? "View Details" : project.next_action.label;
  const gemini = project.provider === "gemini_web" || project.workflow === "gemini_autopilot";
  const technical = gemini || project.workflow === "flow_unattended" || ["autopilot", "external_recovery"].includes(project.acceptance_type ?? "");
  const progress = Math.max(0, Math.min(100, project.progress.percent));
  return <article className="library-project" aria-label={project.title}>
    <Link to={href} onClick={onOpen} className="library-preview-link" aria-label={`Open ${project.title}`} tabIndex={-1} aria-hidden="true">
      <Thumbnail key={project.thumbnail_url} project={project} />
    </Link>
    <div className="library-project-title">
      <h3><Link to={href} onClick={onOpen}>{project.title}</Link></h3>
      <div className="library-project-description">
        {project.duration_seconds != null && project.duration_seconds > 0 && <span>{Math.round(project.duration_seconds)} sec</span>}
        {project.aspect_ratio && <span>{project.aspect_ratio}</span>}
        <span>{project.workflow === "flow_unattended" ? "Flow unattended" : project.workflow === "gemini_autopilot" ? "Gemini Autopilot" : project.workflow === "colab_planning" ? "Colab planning" : "Video project"}</span>
      </div>
      {technical && <p className="library-review-note">{gemini ? "Creative quality not human reviewed" : "Technical completion · creative review separate"}</p>}
    </div>
    <div className="library-project-state">
      <span className={`library-status library-status-${tone}`}><span aria-hidden="true" />{project.display_status}</span>
      {project.paused && !project.display_status.toLowerCase().includes("paused") && <span className="library-paused">Paused</span>}
      {project.storage.label && <span className="library-storage">{project.storage.label}{["queued", "uploading", "verifying"].includes(project.storage.state) ? ` ${Math.round(project.storage.archive_percent)}%` : ""}</span>}
    </div>
    <div className="library-project-provider"><span className={`library-provider library-provider-${project.provider}`}>
      <span aria-hidden="true">{project.provider === "gemini_web" ? "✦" : project.provider === "flow_web" ? "◈" : "◇"}</span>
      {providers.find(([value]) => value === project.provider)?.[1] ?? project.provider}
    </span></div>
    <div className="library-project-progress">
      <span>{project.progress.accepted_count} / {project.progress.scene_count} scenes ready</span>
      <div className="library-progress-track" role="progressbar" aria-label={`${project.title} scene progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <div style={{ width: `${progress}%` }} />
      </div>
    </div>
    <div className="library-project-updated"><Updated value={project.updated_at} /></div>
    <div className="library-project-action"><Link to={href} onClick={onOpen} title={project.next_action.message || undefined}>{action || "View Details"}<span aria-hidden="true">↗</span></Link></div>
  </article>;
});
