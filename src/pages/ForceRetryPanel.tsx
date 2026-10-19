import { useRef, useState } from "react";
import { apiJson } from "../lib/apiClient";
import { primary } from "./videoProduct";

export type ForceRetryStatus = {
  job_id: string;
  scene_order?: number;
  available: boolean;
  unavailable_reason?: string;
  request_id?: string;
  state?: string;
  message?: string;
  in_progress?: boolean;
  run_id?: string;
};

export type ForceRetryCandidate = {
  job_id: string;
  title: string;
  status: string;
  project_status: string;
  paused: boolean;
  completed_scenes: number;
  total_scenes: number;
  next_incomplete_scene?: number;
  retry_status: ForceRetryStatus;
};

type ForceRetryResponse = { status: string; force_retry_status: ForceRetryStatus };
type Props = {
  candidates?: ForceRetryCandidate[];
  preferredProjectID?: string;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onRefresh: () => Promise<unknown>;
};

const secondary = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50";
const projectLabels: Record<string, string> = {
  recovering_external: "Recovering owner-submitted video", waiting_provider: "Waiting for Gemini availability",
  planning: "Planning", planning_retry: "Waiting for planning retry", recovering: "Awaiting recovery",
  ready: "Ready for Gemini", generating: "Generating", needs_attention: "Needs attention", failed: "Generation failed",
};
const requestLabels: Record<string, string> = {
  retry_requested: "Retry requested", video_submitted: "Video submitted", video_generated: "Video generated",
  recovered: "Existing video recovered", blocked: "Retry unavailable", checking: "Checking Gemini browser",
  preparing: "Preparing controlled retry", submission_pending: "Submission outcome pending",
};
const pendingStates = new Set(["retry_requested", "video_submitted", "checking", "recovering", "preparing", "submission_pending"]);

function projectStatus(project: ForceRetryCandidate) {
  const status = ["completed", "skipped", "removed"].includes(project.status)
    ? "Needs attention: unfinished scenes remain"
    : projectLabels[project.status] ?? project.status.replaceAll("_", " ");
  return project.paused ? `Paused · ${status}` : status;
}

function retryBlocker(project?: ForceRetryCandidate, status = project?.retry_status) {
  if (!project) return "No unfinished Gemini projects need retrying.";
  if (!status || status.job_id !== project.job_id) return "Force Retry needs a current backend retry assessment. Refresh to check this project.";
  if (status.in_progress || (status.state && pendingStates.has(status.state))) {
    return status.message ?? "This retry is already being processed. Wait for its result before requesting another.";
  }
  if (!status.available) return status.unavailable_reason ?? status.message ?? "The backend has not established that this scene can be retried safely.";
  if (!project.next_incomplete_scene || !status.scene_order) return "The backend has not identified the next incomplete scene. Refresh the retry assessment.";
  if (project.next_incomplete_scene !== status.scene_order) return "The retry assessment does not match the next incomplete scene. Refresh before retrying.";
  return "";
}

function requestStorageKey(jobID: string, sceneOrder?: number) {
  return `gemini-force-retry:${jobID}:${sceneOrder ?? "next"}`;
}
function readRequestID(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function saveRequestID(key: string, value?: string) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch { /* The backend also enforces durable idempotency. */ }
}

export function ForceRetryPanel({ candidates, preferredProjectID, busy, onBusyChange, onRefresh }: Props) {
  const [selectedID, setSelectedID] = useState("");
  const [confirmation, setConfirmation] = useState<{ jobID: string; sceneOrder?: number }>();
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ status: ForceRetryStatus; snapshot?: ForceRetryCandidate[] }>();
  const sendingRef = useRef(false);
  const requestIDs = useRef(new Map<string, string>());
  // Membership and scene progress come only from the backend's project/scene assessment.
  const selected = candidates?.find(project => project.job_id === selectedID)
    ?? candidates?.find(project => project.job_id === preferredProjectID)
    ?? candidates?.[0];
  const status = selected?.retry_status;
  // The response bridges the interval before the next authoritative server snapshot.
  const displayedResult = result && result.status.job_id === selected?.job_id && result.snapshot === candidates
    ? result.status : status;
  const blockedReason = candidates === undefined
    ? "Force Retry needs a backend project assessment. Refresh after the updated backend is running."
    : retryBlocker(selected, displayedResult);
  const unavailableReason = sending ? "The retry request is being processed. Wait for its result before clicking again."
    : busy ? "Another queue operation is being processed. Wait for it to finish before requesting a retry." : blockedReason;
  const disabled = Boolean(unavailableReason);
  const confirmationProject = candidates?.find(project => project.job_id === confirmation?.jobID);
  const confirmationStatus = confirmationProject?.retry_status;
  const targetChanged = Boolean(confirmation && (!confirmationProject || confirmationProject.next_incomplete_scene !== confirmation.sceneOrder || confirmationStatus?.scene_order !== confirmation.sceneOrder));
  const confirmationBlocker = retryBlocker(confirmationProject);

  function selectProject(jobID: string) {
    setSelectedID(jobID);
    setConfirmation(undefined);
    setConfirmed(false);
    setError("");
  }

  async function forceRetry() {
    if (!confirmation || !confirmed || targetChanged || sendingRef.current || busy || confirmationBlocker || !confirmationStatus) return;
    sendingRef.current = true;
    setSending(true);
    onBusyChange(true);
    setError("");
    const key = requestStorageKey(confirmation.jobID, confirmation.sceneOrder);
    try {
      const savedID = requestIDs.current.get(key) ?? readRequestID(key);
      const acknowledgedTerminal = Boolean(savedID && confirmationStatus.request_id === savedID
        && confirmationStatus.state && !confirmationStatus.in_progress && !pendingStates.has(confirmationStatus.state));
      const requestID = (!acknowledgedTerminal && savedID) || crypto.randomUUID();
      requestIDs.current.set(key, requestID);
      saveRequestID(key, requestID);
      const response = await apiJson<ForceRetryResponse>("/gemini-autopilot/force-retry", {
        method: "POST",
        body: { job_id: confirmation.jobID, scene_order: confirmation.sceneOrder, request_id: requestID, confirmed: true },
      });
      setResult({ status: response.force_retry_status, snapshot: candidates });
      setSelectedID(confirmation.jobID);
      setConfirmation(undefined);
      setConfirmed(false);
      requestIDs.current.delete(key);
      saveRequestID(key);
    } catch (cause) {
      setError(`${cause instanceof Error ? cause.message : "Force Retry could not be requested."} The request may have reached the backend. Repeating this confirmation reuses the same request and cannot authorize an extra submission.`);
    } finally {
      try { await onRefresh(); } catch {
        setError("The retry status could not refresh. The saved request remains protected; refresh the page to see its current outcome.");
      } finally {
        sendingRef.current = false;
        setSending(false);
        onBusyChange(false);
      }
    }
  }

  return <section aria-label="Force retry" className="space-y-4 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl space-y-2">
        <h3 className="text-xl font-semibold">Force Retry Now</h3>
        <p className="text-sm text-slate-700">Check the dedicated Gemini browser and recover an existing video first. If a new attempt is safe, this action may consume one Gemini video generation.</p>
      </div>
      <button className={primary} disabled={disabled} aria-describedby="force-retry-help" onClick={() => {
        if (!selected || disabled) return;
        setConfirmation({ jobID: selected.job_id, sceneOrder: selected.next_incomplete_scene });
        setConfirmed(false);
        setError("");
      }}>{sending ? "Requesting retry…" : "Force Retry Now"}</button>
    </div>
    {Boolean(candidates?.length) && <label className="block text-sm font-medium">Project to retry
      <select className="mt-2 block w-full rounded-lg border bg-white p-3" value={selected?.job_id ?? ""} disabled={busy || sending} onChange={event => selectProject(event.target.value)}>
        {candidates?.map(project => <option key={project.job_id} value={project.job_id}>{project.title} · {projectStatus(project)} · {project.completed_scenes} / {project.total_scenes} scenes · {project.next_incomplete_scene ? `Next scene ${project.next_incomplete_scene}` : "Next scene not yet prepared"} · {retryBlocker(project) || "Retry permitted"}</option>)}
      </select>
    </label>}
    {selected && <dl className="grid gap-3 rounded-lg border bg-white p-4 text-sm sm:grid-cols-2" aria-label="Selected retry project">
      <div><dt className="font-medium">Project</dt><dd>{selected.title}</dd></div>
      <div><dt className="font-medium">Current status</dt><dd>{projectStatus(selected)}</dd></div>
      {selected.project_status !== selected.status && <div><dt className="font-medium">Saved project state</dt><dd>{selected.project_status.replaceAll("_", " ")}</dd></div>}
      <div><dt className="font-medium">Completed scenes</dt><dd>{selected.completed_scenes} / {selected.total_scenes}</dd></div>
      <div><dt className="font-medium">Next incomplete scene</dt><dd>{selected.next_incomplete_scene ? `Scene ${selected.next_incomplete_scene}` : "Not yet prepared"}</dd></div>
    </dl>}
    <p id="force-retry-help" className="text-sm text-slate-700">{unavailableReason || `Retry permitted for scene ${selected?.next_incomplete_scene}. Eligibility will be checked again on confirmation and before any submission.`}</p>
    {displayedResult?.state && <div role="status" className="space-y-1 rounded-lg border bg-white p-3 text-sm">
      <p className="font-semibold">{requestLabels[displayedResult.state] ?? "Retry status"}</p>
      {displayedResult.message && <p>{displayedResult.message}</p>}
      {displayedResult.state === "retry_requested" && <p>The request is saved. This does not mean a video has been submitted or generated.</p>}
      {displayedResult.state === "video_submitted" && <p>Gemini received the request. Video generation is not yet complete.</p>}
      {displayedResult.state === "submission_pending" && <p>A submission intent is recorded, but receipt by Gemini is unresolved. Another request cannot start until that outcome is recovered.</p>}
    </div>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {confirmation && <div role="dialog" aria-modal="false" aria-label="Confirm Force Retry" className="space-y-4 rounded-xl border border-indigo-300 bg-white p-4">
      <p className="font-semibold">Authorize one controlled retry</p>
      <p className="text-sm">{confirmationProject?.title}{confirmation.sceneOrder ? ` · Scene ${confirmation.sceneOrder}` : " · Next incomplete scene"}. An existing result will be recovered first. A new submission is permitted only after the previous attempt is conclusively resolved and the current Gemini browser workflow is usable.</p>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} disabled={sending} onChange={event => setConfirmed(event.target.checked)} className="mt-1"/><span>I authorize at most one new Gemini video generation for this retry. This may consume one generation from my Gemini allowance.</span></label>
      {targetChanged && <p role="alert" className="text-sm text-amber-800">The project or next incomplete scene changed. Cancel and review the current project before confirming.</p>}
      {!targetChanged && confirmationBlocker && <p role="alert" className="text-sm text-amber-800">{confirmationBlocker}</p>}
      <div className="flex flex-wrap gap-3">
        <button className={primary} disabled={!confirmed || sending || busy || targetChanged || Boolean(confirmationBlocker)} onClick={() => void forceRetry()}>{sending ? "Requesting retry…" : "Confirm Force Retry"}</button>
        <button className={secondary} disabled={sending} onClick={() => { setConfirmation(undefined); setConfirmed(false); }}>Cancel force retry</button>
      </div>
    </div>}
  </section>;
}
