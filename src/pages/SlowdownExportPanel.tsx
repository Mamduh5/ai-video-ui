import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiJson, buildApiUrl } from "../lib/apiClient";
import { playbackRates, rateLabel, secondsLabel, validSlowdownRate } from "../lib/slowdown";
import { ReviewPlayer, type SceneBoundary } from "./ReviewPlayer";
import { ProjectDrawer } from "./ProjectDrawer";
import { useProjectDrawer } from "./useProjectDrawer";

type EditingMode = "scenes" | "whole_final";
type SavedEdits = { mode: EditingMode; wholeRate: number; sceneRates: Record<number, number> };
export type SlowdownPreview = { source_revision: string; source_duration_seconds: number; duration_seconds: number; boundaries: SceneBoundary[]; warnings?: string[] };
export type SlowdownExport = { id: string; status: string; duration_seconds: number; boundaries?: SceneBoundary[]; video_url?: string; download_name?: string; error?: string; recipe?: { mode: EditingMode } };
type SourceScene = { order: number; clip_url?: string; current_attempt?: number };
const button = "rounded border px-3 py-2 disabled:opacity-50";
function loadEdits(key: string, hasFinal: boolean): SavedEdits {
  const fallback: SavedEdits = { mode: hasFinal ? "whole_final" : "scenes", wholeRate: 1, sceneRates: {} };
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null") as SavedEdits | null;
    if (!saved || !["scenes", "whole_final"].includes(saved.mode) || !validSlowdownRate(saved.wholeRate)) return fallback;
    const sceneRates = Object.fromEntries(Object.entries(saved.sceneRates ?? {}).filter(([order, rate]) => Number.isInteger(Number(order)) && Number(order) > 0 && validSlowdownRate(rate)));
    return { mode: saved.mode, wholeRate: saved.wholeRate, sceneRates };
  } catch { return fallback; }
}
export function SlowdownExportPanel(props: { jobId: string; completed?: boolean; available?: boolean; sourceScenesAvailable?: boolean; finalUrl?: string; scenes: SourceScene[] }) {
  return <Panel key={props.jobId} {...props}/>;
}
function Panel({ jobId, completed = false, available = true, sourceScenesAvailable = true, finalUrl, scenes }: { jobId: string; completed?: boolean; available?: boolean; sourceScenesAvailable?: boolean; finalUrl?: string; scenes: SourceScene[] }) {
  const key = `slowdown-edits.v1:${jobId}`;
  const [edits, setEdits] = useState(() => loadEdits(key, Boolean(finalUrl)));
  const { open, setOpen } = useProjectDrawer(jobId, completed);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [storageNotice, setStorageNotice] = useState("");
  const [preview, setPreview] = useState<{ inputKey: string; value: SlowdownPreview }>();
  const endpoint = `/scene-video-jobs/${encodeURIComponent(jobId)}/slowdown`;
  const availableScenes = scenes.filter(scene => Boolean(scene.clip_url));
  const hasSourceMedia = available && (Boolean(finalUrl) || availableScenes.length > 0);
  const list = useQuery({ queryKey: ["slowdownExports", jobId], queryFn: () => apiJson<{ exports: SlowdownExport[] }>(endpoint + "/exports"), enabled: open && hasSourceMedia, refetchInterval: query => query.state.data?.exports?.some(item => item.status === "rendering") ? 2000 : false, retry: false });
  const input = edits.mode === "whole_final" ? { mode: edits.mode, whole_rate: edits.wholeRate } : { mode: edits.mode, scene_rates: availableScenes.map(scene => ({ scene_order: scene.order, rate: edits.sceneRates[scene.order] ?? 1 })) };
  const inputKey = JSON.stringify([input, finalUrl, availableScenes, available, sourceScenesAvailable]);
  const calculated = preview?.inputKey === inputKey ? preview.value : undefined;
  const unavailable = !available || edits.mode === "scenes" && !sourceScenesAvailable || (edits.mode === "whole_final" ? !finalUrl : availableScenes.length === 0);
  function edit(patch: Partial<SavedEdits>) {
    const next = { ...edits, ...patch }; setEdits(next); setError("");
    try { localStorage.setItem(key, JSON.stringify(next)); setStorageNotice(""); } catch { setStorageNotice("Your browser cannot save editing choices. Keep this page open to retain them."); }
  }
  async function run(action: "preview" | "export" | "cancel", id?: string, retry = false) {
    if (busyRef.current || (action !== "cancel" && unavailable) || (action === "export" && !calculated)) return;
    busyRef.current = true; setBusy(true); setError("");
    try {
      if (action === "preview") {
        const value = await apiJson<SlowdownPreview>(endpoint + "/preview", { method: "POST", body: input }); setPreview({ inputKey, value });
      } else if (action === "export") {
        await apiJson<SlowdownExport>(endpoint + "/exports", { method: "POST", body: { ...input, source_revision: calculated!.source_revision, ...(retry ? { retry: true } : {}) } }); await list.refetch();
      } else { await apiJson(endpoint + `/exports/${encodeURIComponent(id!)}/cancel`, { method: "POST" }); await list.refetch(); }
    } catch (cause) { if (action === "export") setPreview(undefined); setError(cause instanceof Error ? cause.message : "Could not process the slow version. The original media is preserved."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  return <ProjectDrawer title="Export a separate slow version" open={open} onOpenChange={setOpen}>
    {!hasSourceMedia ? <p role="status">{completed || !available ? "Source media is unavailable locally. Restore the project in Storage before creating a slow version." : "Generate or import a source scene before creating a slow version."}</p> : <>
    <p className="mt-3 text-sm">Choose after watching the original. A slow export saves new timing into a separate MP4, which plays at the selected pace in an ordinary player at normal 1x. No generation or provider credits are used.</p>
    {!sourceScenesAvailable && <p role="status">Some source scenes are archived. Restore local media in Storage to export individual scenes. Whole final video export remains available.</p>}
    <fieldset disabled={busy} className="space-y-3">
      <legend className="font-medium">Editing scope</legend>
      <label className="mr-4 inline-flex gap-2"><input type="radio" name={`slowdown-scope-${jobId}`} disabled={!sourceScenesAvailable} checked={edits.mode === "scenes"} onChange={() => edit({ mode: "scenes" })}/>Individual scenes, then assemble</label>
      <label className="inline-flex gap-2"><input type="radio" name={`slowdown-scope-${jobId}`} checked={edits.mode === "whole_final"} onChange={() => edit({ mode: "whole_final" })}/>Whole final video</label>
      <p className="text-sm">Only the active scope is exported. Switching scope keeps both sets of choices and never compounds their rates.</p>
      {edits.mode === "whole_final" ? <label className="block">Whole final playback/export speed<select aria-label="Whole final playback/export speed" className="ml-2 rounded border p-2" value={edits.wholeRate} onChange={e => edit({ wholeRate: Number(e.target.value) })}>{playbackRates.map(rate => <option key={rate} value={rate}>{rateLabel(rate)}</option>)}</select></label> : <div className="space-y-2">{availableScenes.map(scene => <label key={scene.order} className="block">Scene {scene.order} playback/export speed<select aria-label={`Scene ${scene.order} playback/export speed`} className="ml-2 rounded border p-2" disabled={!sourceScenesAvailable} value={edits.sceneRates[scene.order] ?? 1} onChange={e => edit({ sceneRates: { ...edits.sceneRates, [scene.order]: Number(e.target.value) } })}>{playbackRates.map(rate => <option key={rate} value={rate}>{rateLabel(rate)}</option>)}</select></label>)}</div>}
      {unavailable && <p role="status">{edits.mode === "whole_final" ? "The original final video must exist for this scope." : "A completed source scene must exist for this scope."}</p>}
      <button type="button" className={button} disabled={unavailable} onClick={() => void run("preview")}>{busy ? "Working…" : "Calculate duration from source media"}</button>
      {calculated && <div className="space-y-2 rounded bg-slate-50 p-3"><p>Actual source: {secondsLabel(calculated.source_duration_seconds)} · Derived duration: {secondsLabel(calculated.duration_seconds)}</p>{calculated.boundaries?.length > 0 && <ol aria-label="Derived scene timeline">{calculated.boundaries.map(scene => <li key={scene.scene_order}>Scene {scene.scene_order}: {secondsLabel(scene.start_seconds)}–{secondsLabel(scene.end_seconds)}</li>)}</ol>}{calculated.warnings?.map((warning, i) => <p key={i} className="text-sm text-amber-800">{warning}</p>)}<button type="button" className={button} onClick={() => void run("export")}>Export separate MP4</button>{list.data?.exports?.some(item => ["failed", "canceled", "interrupted"].includes(item.status)) && <button type="button" className={button} onClick={() => void run("export", undefined, true)}>Retry failed export with this recipe</button>}</div>}
    </fieldset>
    <p className="text-xs text-slate-600">Video and audio slow together with supported pitch preservation. Strong slowdown can affect voice quality, lip synchronization and frame cadence. Slowing cannot add omitted words or story content. Original clips, final video and future continuity sources stay unchanged.</p>
    {storageNotice && <p role="status">{storageNotice}</p>}{error && <p role="alert" className="text-red-700">{error}</p>}
    {list.isError && <p role="alert">Could not load saved exports: {list.error.message}<button className={button} onClick={() => void list.refetch()}>Refresh exports</button></p>}
    {(list.data?.exports?.length ?? 0) > 0 && <section className="space-y-3" aria-label="Saved slow versions"><h4 className="font-medium">Saved derived versions</h4>{list.data?.exports.map(item => <article key={item.id} className="rounded border p-3"><p className="font-medium">{item.download_name || `Slow version ${item.id}`} · {item.status} · {secondsLabel(item.duration_seconds)}</p>{item.error && <p role="status">{item.error}</p>}{item.status === "rendering" && <button disabled={busy} className={button} onClick={() => void run("cancel", item.id)}>Cancel export</button>}{item.status === "completed" && item.video_url && <><ReviewPlayer src={buildApiUrl(item.video_url)} label={`Derived video ${item.id}`} boundaries={item.boundaries}/><a className="mt-3 inline-block text-blue-800 underline" href={buildApiUrl(item.video_url + "?download=1")} download={item.download_name}>Download separate slow MP4</a></>}{["failed", "canceled", "interrupted"].includes(item.status) && <p className="text-sm">Original sources are available. Calculate the current recipe again to prepare another export.</p>}</article>)}</section>}
    </>}
  </ProjectDrawer>;
}
