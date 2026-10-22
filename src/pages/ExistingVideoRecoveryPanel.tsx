import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiJson, apiMultipart } from "../lib/apiClient";
import { bangkokTime } from "../lib/autopilotTime";

export type ExistingVideoRecovery = {
 run_id: string; scene_order: number; submitted_at: string; prompt: string; aspect_ratio: string;
 state: string; message: string; busy: boolean; can_recover: boolean; can_upload: boolean;
 provenance?: {source: string; owner_confirmed: boolean};
};
type RecoveryData = { recoveries: ExistingVideoRecovery[] };
const labels: Record<string, string> = {
 needs_check: "Check original result", checking: "Checking original result",
 ready_to_download: "Existing video found — ready to download", downloading: "Downloading original video",
 download_failed: "Download failed — manual recovery available", waiting_owner_mp4: "Waiting for owner MP4",
 validating: "Validating recovered file", completed: "Recovery completed",
 original_unavailable: "Original result unavailable", blocked: "Recovery blocked by missing attribution or failed validation",
};
const button = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50";

export function ExistingVideoRecoveryPanel({ jobId, title, onChanged }: {jobId: string; title?: string; onChanged: () => void}) {
 const endpoint = `/gemini-autopilot/projects/${encodeURIComponent(jobId)}/video-recovery`;
 const client = useQueryClient();
 const query = useQuery({queryKey: ["existingVideoRecovery", jobId], queryFn: () => apiJson<RecoveryData>(endpoint), refetchInterval: state => state.state.data?.recoveries?.some(run => run.state !== "completed") ? 2000 : false});
 if (query.isError) return <section id="video-recovery" aria-label="Existing video recovery" className="rounded-xl border p-4"><h3>Recover Existing Video</h3><p role="alert">Could not load recovery: {query.error.message}</p><button className={button} onClick={() => void query.refetch()}>Retry recovery status</button><p>Open the original saved project and keep the Gemini conversation available.</p></section>;
 if (!Array.isArray(query.data?.recoveries) || !query.data.recoveries.length) return null;
 return <section id="video-recovery" aria-label="Existing video recovery" className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
  <h3 className="text-lg font-semibold">Recover Existing Video</h3>
  <p>Restore an existing Gemini video to this project. Recovery keeps production paused and uses no new generation.</p>
  {query.data.recoveries.map(run => <RecoveryRun key={run.run_id} run={run} title={title ?? "This project"} endpoint={endpoint} onChanged={() => {void query.refetch(); void client.invalidateQueries({queryKey: ["geminiAutopilot"]}); onChanged();}}/>)}
 </section>;
}

function RecoveryRun({run, title, endpoint, onChanged}: {run: ExistingVideoRecovery; title: string; endpoint: string; onChanged: () => void}) {
 const [busy, setBusy] = useState(false), [error, setError] = useState("");
 const [manual, setManual] = useState(false), [confirmed, setConfirmed] = useState(false);
 const [file, setFile] = useState<File>(), [preview, setPreview] = useState("");
 const [previewReady, setPreviewReady] = useState(false);
 const inFlight = useRef(false);
 useEffect(() => () => {if (preview) URL.revokeObjectURL(preview);}, [preview]);
 const disabled = busy || run.busy;
 const manualVisible = manual || ["download_failed", "waiting_owner_mp4", "blocked"].includes(run.state);
 async function act(action: "recover" | "manual" | "upload") {
  if (inFlight.current || run.busy || (action === "upload" && (!file || !confirmed || !previewReady))) return;
  inFlight.current = true; setBusy(true); setError("");
  try {
   const path = `${endpoint}/${encodeURIComponent(run.run_id)}/${action}`;
   if (action === "upload") {const form = new FormData(); form.append("file", file!); form.append("confirmed", "true"); await apiMultipart<RecoveryData>(path, form); setFile(undefined); setPreview(""); setConfirmed(false);}
   else await apiJson<RecoveryData>(path, {method: "POST"});
  } catch (cause) {setError(cause instanceof Error ? cause.message : "Recovery stopped. Retry or upload the original MP4."); if (action === "recover") setManual(true);}
  finally {inFlight.current = false; setBusy(false); onChanged();}
 }
 function select(selected?: File) {
  setConfirmed(false); setPreviewReady(false); setError(""); setFile(undefined); setPreview("");
  if (!selected) return;
  if (selected.size === 0 || selected.size > 100 * 1024 * 1024 || !/\.mp4$/i.test(selected.name)) {setError("Select a nonempty original MP4 up to 100 MiB."); return;}
  setFile(selected); setPreview(URL.createObjectURL(selected));
 }
 return <article className="space-y-3 rounded-xl border bg-white p-4" aria-label={`Scene ${run.scene_order} recovery`}>
  <p className="font-semibold">{title} · Scene {run.scene_order} · {run.aspect_ratio}</p>
  <p className="text-sm">Original request: {bangkokTime(run.submitted_at)}</p>
  <p role="status" className="font-medium">{labels[run.state] ?? "Check original result"}</p><p>{run.message}</p>
  {run.prompt && <details><summary>Review original scene request</summary><p className="max-h-48 overflow-auto whitespace-pre-wrap text-sm">{run.prompt}</p></details>}
  {run.provenance && <p className="text-sm">{run.provenance.source === "owner_attributed_original" ? "Association confirmed by owner. Provider attribution was not verified." : "Original result correlated in Gemini."} Creative quality has not been human reviewed.</p>}
  {error && <p role="alert">{error}</p>}
  {run.state !== "completed" && <div className="flex flex-wrap gap-2">
   <button className={button} disabled={disabled || !run.can_recover} onClick={() => void act("recover")}>{busy ? "Recovering…" : "Recover Existing Video"}</button>
   <button className={button} disabled={disabled || !run.can_upload} onClick={() => {setManual(true); void act("manual");}}>Upload Existing MP4</button>
  </div>}
  {manualVisible && run.can_upload && run.state !== "completed" && <div className="space-y-3 border-t pt-3">
   <p>In your authenticated Gemini browser, open this original request and download its generated video using Gemini’s Download control. Select that MP4 below.</p>
   <label className="block">Original Gemini MP4<input className="block w-full" type="file" accept="video/mp4,.mp4" disabled={disabled} onChange={event => select(event.target.files?.[0])}/></label>
   {preview && <video className="max-h-80 w-full" src={preview} controls preload="metadata" aria-label="Recovered MP4 preview" onLoadedData={() => setPreviewReady(true)} onError={() => {setPreviewReady(false); setError("This file cannot be previewed. Select the complete original MP4.");}}/>}
   {file && <><p>{file.name} · {(file.size / 1048576).toFixed(1)} MiB</p><label className="flex items-start gap-2"><input type="checkbox" checked={confirmed} disabled={disabled} onChange={event => setConfirmed(event.target.checked)}/><span>I previewed this MP4 and confirm it is the original Gemini video for {title}, Scene {run.scene_order}, request from {bangkokTime(run.submitted_at)}. Record this association as owner-confirmed.</span></label><button className={button} disabled={disabled || !confirmed || !previewReady} onClick={() => void act("upload")}>Validate and import original MP4</button><p className="text-sm">{!previewReady ? "Wait for the MP4 preview to load." : !confirmed ? "Confirm the scene and original request association to continue." : "Ready to validate integrity and R3 conformance."}</p></>}
  </div>}
 </article>;
}
