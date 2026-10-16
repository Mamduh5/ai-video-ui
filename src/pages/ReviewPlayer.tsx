import { useRef, useState } from "react";
import { playbackRates, rateLabel, secondsLabel, validSlowdownRate } from "../lib/slowdown";
export type SceneBoundary = { scene_order: number; attempt: number; start_seconds: number; end_seconds: number };
export type FilmstripFrame = { index: number; timestamp_seconds: number; url: string };
function formatTime(value: number) { const seconds = Math.max(0, Math.floor(value)); return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0"); }
export function ReviewPlayer(props: { src: string; label: string; boundaries?: SceneBoundary[]; frames?: FilmstripFrame[] }) { return <Player key={props.src} {...props} />; }
function Player({ src, label, boundaries = [], frames = [] }: { src: string; label: string; boundaries?: SceneBoundary[]; frames?: FilmstripFrame[] }) {
  const video = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [rateError, setRateError] = useState("");
  const [error, setError] = useState("");
  const metadata = () => { const value = video.current?.duration ?? 0; setDuration(Number.isFinite(value) && value > 0 ? value : 0); };
  const seek = (target: number) => { if (!video.current || !duration) return; const next = Math.min(duration, Math.max(0, target)); video.current.currentTime = next; setTime(next); };
  const changeRate = (next: number) => {
    if (!video.current || !validSlowdownRate(next)) return;
    try {
      video.current.preservesPitch = true;
      video.current.playbackRate = next;
      if (Math.abs(video.current.playbackRate - next) > 0.001) throw new Error("Unsupported rate");
      setRate(next); setRateError("");
    } catch {
      try { video.current.playbackRate = 1; } catch { /* The original media remains available for download. */ }
      setRate(1); setRateError("This browser cannot preview the selected speed. Use Export a separate slow version below and play its MP4 at normal 1x.");
    }
  };
  return <div className="mt-4 max-w-3xl space-y-3" aria-label={label}>
    <video ref={video} controls preload="metadata" className="max-h-[70vh] w-full rounded-md bg-black object-contain" src={src} aria-label={label + " video"} onLoadedMetadata={metadata} onDurationChange={metadata} onRateChange={() => { const next = video.current?.playbackRate ?? 1; if (!validSlowdownRate(next)) changeRate(1); else setRate(next); }} onTimeUpdate={() => setTime(video.current?.currentTime ?? 0)} onSeeked={() => setTime(video.current?.currentTime ?? 0)} onError={() => setError("This video could not load. Refresh to retry.")} />
    <label className="block text-sm">Playback speed of the generated result<select aria-label={label + " playback speed"} className="ml-2 rounded border p-2" value={rate} onChange={e => changeRate(Number(e.target.value))}>{playbackRates.map(value => <option key={value} value={value}>{rateLabel(value)}</option>)}</select></label>
    <p className="text-sm" aria-label={label + " viewing duration"}>{duration ? `Source: ${secondsLabel(duration)} | Viewing duration at selected speed: ${secondsLabel(duration / rate)}` : "Loading actual source duration..."}</p>
    <p className="text-xs text-slate-600">Preview changes viewing speed only. Downloads keep their saved timing; export a separate slow version to change an MP4. Strong slowdown may affect voice quality, lip synchronization and motion cadence.</p>
    {rateError && <p role="status" className="text-amber-800">{rateError}</p>}
    <div className="flex justify-between text-sm tabular-nums"><output aria-label="Playback time">{formatTime(time)} / {formatTime(duration)}</output><span>{label}</span></div>
    <label className="block text-sm">Seek video<input aria-label={label + " seek"} className="block w-full" type="range" min={0} max={duration || 1} step={0.05} value={Math.min(time, duration || 0)} disabled={!duration} onChange={event => seek(Number(event.target.value))} /></label>
    <div className="flex flex-wrap gap-2"><button type="button" disabled={!duration} onClick={() => seek((video.current?.currentTime ?? 0) - 5)} className="rounded border px-3 py-2">−5s</button><button type="button" disabled={!duration} onClick={() => seek((video.current?.currentTime ?? 0) + 5)} className="rounded border px-3 py-2">+5s</button></div>
    {boundaries.length > 0 && <nav aria-label="Scene markers" className="flex flex-wrap gap-2">{boundaries.map(scene => <button type="button" disabled={!duration} key={scene.scene_order} onClick={() => seek(scene.start_seconds)} className="rounded border px-3 py-2 text-sm">Scene {scene.scene_order} · {formatTime(scene.start_seconds)}–{formatTime(scene.end_seconds)}</button>)}</nav>}
    {frames.length > 0 && <div aria-label="Scene filmstrip" className="flex gap-2 overflow-x-auto">{frames.map(frame => <button type="button" disabled={!duration} key={frame.index} onClick={() => seek(frame.timestamp_seconds)} className="shrink-0 rounded border p-1 text-sm"><img src={frame.url} alt={"Seek to " + frame.timestamp_seconds.toFixed(2) + " seconds"} className="h-20 w-32 object-contain" /><span>{frame.timestamp_seconds.toFixed(2)}s</span></button>)}</div>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </div>;
}
