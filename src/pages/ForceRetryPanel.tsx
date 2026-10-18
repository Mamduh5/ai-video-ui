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

type ForceRetryResponse = { status: string; force_retry_status: ForceRetryStatus };

type Project = { job_id: string; title: string; scene_count: number; accepted_count: number; status: string };
type Props = {
  projects: Project[];
  statuses?: Record<string, ForceRetryStatus>;
  preferredProjectID?: string;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onRefresh: () => Promise<unknown>;
};

const secondary = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50";
const requestLabels: Record<string, string> = {
  retry_requested: "Retry requested",
  video_submitted: "Video submitted",
  video_generated: "Video generated",
  recovered: "Existing video recovered",
  blocked: "Retry unavailable",
  checking: "Checking Gemini browser",
  preparing: "Preparing controlled retry",
  submission_pending: "Submission outcome pending",
};
const pendingStates = new Set(["retry_requested", "video_submitted", "checking", "recovering", "preparing", "submission_pending"]);

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

export function ForceRetryPanel({ projects, statuses, preferredProjectID, busy, onBusyChange, onRefresh }: Props) {
  const [selectedID, setSelectedID] = useState("");
  const [confirmation, setConfirmation] = useState<{ jobID: string; sceneOrder?: number }>();
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ status: ForceRetryStatus; snapshot?: Record<string, ForceRetryStatus> }>();
  const sendingRef = useRef(false);
  const requestIDs = useRef(new Map<string, string>());
  const eligibleProjects = projects.filter(project => project.status !== "skipped" && project.accepted_count < project.scene_count);
  const selected = projects.find(project => project.job_id === selectedID)
    ?? eligibleProjects.find(project => project.job_id === preferredProjectID)
    ?? eligibleProjects[0]
    ?? projects[0];
  const status = selected ? statuses?.[selected.job_id] : undefined;
  // The response bridges the interval before the next authoritative server snapshot.
  const displayedResult = result && result.status.job_id === selected?.job_id && result.snapshot === statuses
    ? result.status
    : status;
  const pending = Boolean(displayedResult?.in_progress || (displayedResult?.state && pendingStates.has(displayedResult.state)));
  const blockedReason = !selected ? "There is no incomplete project to retry."
    : selected.accepted_count >= selected.scene_count ? "All scenes in this project are complete."
    : selected.status === "skipped" ? "Skipped projects cannot be retried from this action."
    : !status ? "Force Retry needs a backend retry assessment. Refresh after the updated backend is running."
    : pending ? displayedResult?.message ?? "This retry is already being processed. Wait for its result before requesting another."
    : !status.available ? status.unavailable_reason ?? status.message ?? "The backend has not established that this scene can be retried safely."
    : !status.scene_order ? "The backend has not identified the next incomplete scene. Refresh the retry assessment."
    : "";
  const unavailableReason = sending ? "The retry request is being processed. Wait for its result before clicking again."
    : busy ? "Another queue operation is being processed. Wait for it to finish before requesting a retry."
    : blockedReason;
  const disabled = Boolean(unavailableReason);
  const confirmationProject = projects.find(project => project.job_id === confirmation?.jobID);
  const confirmationStatus = confirmation ? statuses?.[confirmation.jobID] : undefined;
  const targetChanged = Boolean(confirmation && (!confirmationProject || confirmationStatus?.scene_order !== confirmation.sceneOrder));

  function selectProject(jobID: string) {
    setSelectedID(jobID);
    setConfirmation(undefined);
    setConfirmed(false);
    setError("");
  }

  async function forceRetry() {
    if (!confirmation || !confirmed || targetChanged || sendingRef.current || busy || !confirmationStatus?.available) return;
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
      setResult({ status: response.force_retry_status, snapshot: statuses });
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
        setConfirmation({ jobID: selected.job_id, sceneOrder: status?.scene_order });
        setConfirmed(false);
        setError("");
      }}>{sending ? "Requesting retry…" : "Force Retry Now"}</button>
    </div>
    {projects.length > 0 && <label className="block text-sm font-medium">Project to retry
      <select className="mt-2 block w-full rounded-lg border bg-white p-3" value={selected?.job_id ?? ""} disabled={busy || sending} onChange={event => selectProject(event.target.value)}>
        {projects.map(project => <option key={project.job_id} value={project.job_id}>{project.title}{project.accepted_count >= project.scene_count ? " (complete)" : project.status === "skipped" ? " (skipped)" : ""}</option>)}
      </select>
    </label>}
    <p id="force-retry-help" className="text-sm text-slate-700">{unavailableReason || (status?.scene_order ? `Next incomplete scene: ${status.scene_order}. A fresh browser check is required before any submission.` : "The backend will identify the next incomplete scene and check the previous attempt before submitting.")}</p>
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
      {targetChanged && <p role="alert" className="text-sm text-amber-800">The next incomplete scene changed. Cancel and review the current scene before confirming.</p>}
      {!targetChanged && confirmationStatus && !confirmationStatus.available && <p role="alert" className="text-sm text-amber-800">{confirmationStatus.unavailable_reason ?? confirmationStatus.message ?? "This scene is no longer available for retry."}</p>}
      <div className="flex flex-wrap gap-3">
        <button className={primary} disabled={!confirmed || sending || busy || targetChanged || !confirmationStatus?.available} onClick={() => void forceRetry()}>{sending ? "Requesting retry…" : "Confirm Force Retry"}</button>
        <button className={secondary} disabled={sending} onClick={() => { setConfirmation(undefined); setConfirmed(false); }}>Cancel force retry</button>
      </div>
    </div>}
  </section>;
}
