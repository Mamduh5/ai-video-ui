import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiJson } from "../lib/apiClient";
import { generationSettingsForExistingProject, type GenerationSettings } from "../features/settings/contracts";
import { GenerationSettingsFields } from "./GenerationSettingsFields";

type RevisionSource = { title?: string; topic?: string; character?: string; scene_count?: number; aspect_ratio?: string; scene_seconds?: number; preset?: string; audio_policy?: string; review_policy?: string; reference_mode?: string; continuity_mode?: string; generation_provider?: string; generation_resolution?: string; generation_settings?: GenerationSettings; autopilot?: unknown; opening_image?: { required?: boolean }; production?: { mode?: string }; planner_provenance?: { provider: string }; scenes?: { generation_request: { duration_seconds: number; generation_settings?: GenerationSettings } }[] };
export function GenerationRevisionPanel({ job }: { job: RevisionSource }) {
  const navigate = useNavigate();
  const [value, setValue] = useState<GenerationSettings>(generationSettingsForExistingProject(job.generation_settings ?? job.scenes?.[0]?.generation_request.generation_settings));
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const createdRevision = useRef<string | undefined>(undefined);
  const [createdId, setCreatedId] = useState<string>();
  const [error, setError] = useState("");
  const gemini = Boolean(job.autopilot || job.generation_provider === "gemini_web");
  const sourceSeconds = job.scene_seconds ?? job.scenes?.[0]?.generation_request.duration_seconds ?? 0;
  async function revise() {
    if (busyRef.current || !job.topic) return;
    busyRef.current = true; setBusy(true); setError("");
    try {
      const common = { title: `${(job.title || "Untitled video").slice(0, 69)} (revision)`, scene_count: job.scene_count && job.scene_count > 0 ? job.scene_count : job.scenes?.length ?? 2, aspect_ratio: job.aspect_ratio, generation_settings: value };
      if (!createdRevision.current) {
      const result = await apiJson<{ job_id: string }>(gemini ? "/gemini-autopilot/queue" : "/scene-video-jobs", { method: "POST", body: gemini ? { ...common, idea: job.topic } : { ...common, topic: job.topic, character: job.character, scene_seconds: sourceSeconds, preset: job.preset || "standard_video", generation_resolution: job.generation_resolution, audio_policy: job.audio_policy, review_policy: job.review_policy, reference_mode: job.reference_mode, continuity_mode: job.continuity_mode, opening_image_required: job.opening_image?.required, ...(["colab_qwen", "operator_authored"].includes(job.planner_provenance?.provider ?? "") ? { planning_provider: job.planner_provenance?.provider } : {}) } });
      createdRevision.current = result.job_id; setCreatedId(result.job_id);
      }
      if (job.production?.mode === "flow_unattended") await apiJson("/flow-autopilot/queue", { method: "POST", body: { job_id: createdRevision.current } });
      navigate(`/scene-jobs/${createdRevision.current}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create the revised project."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  if (!job.topic || !job.scenes?.length || sourceSeconds <= 0) return null;
  return <details className="rounded border bg-white p-4"><summary className="cursor-pointer text-sm font-medium">Change generation mode in a new storyboard revision</summary><div className="mt-3 space-y-3"><p className="text-sm">This creates a separate project and plans its content again. Your original plan, prompts, submissions and media remain preserved. {gemini ? "The revised Gemini project follows the current queue and pause state; it can run if Autopilot is enabled." : job.production?.mode === "flow_unattended" ? "The revised Flow project needs its own batch authorization." : "Review the revised storyboard before choosing Start Production."}</p><GenerationSettingsFields value={value} onChange={setValue} sourceSeconds={sourceSeconds} disabled={busy || Boolean(createdId)}/><button type="button" disabled={busy} className="rounded border px-3 py-2 disabled:opacity-50" onClick={() => void revise()}>{busy ? "Preparing revision…" : createdId ? "Retry adding revised Flow project to queue" : gemini ? "Queue revised Gemini project" : "Create revised storyboard as new project"}</button>{createdId && error && <p role="status">The revised project already exists. Retrying only adds this same project to the Flow queue. <a className="text-blue-800 underline" href={`/scene-jobs/${createdId}`}>Open revised project</a></p>}{error && <p role="alert">{error}</p>}</div></details>;
}
