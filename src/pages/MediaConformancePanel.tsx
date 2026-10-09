import type { ReactNode } from "react";

export type MediaFacts = { duration_seconds: number; width: number; height: number; display_aspect_ratio: string; video_codec?: string; audio_present: boolean; audio_codec?: string; audio_channels?: number; frame_rate?: number };
export type MediaConformance = { status: "pass" | "warning" | "fail"; checks: { field: string; status: string; expected?: string; actual?: string; severity?: string; message?: string }[] };
export type MediaAttempt = { media?: MediaFacts; conformance?: MediaConformance; conformance_decision?: "pending" | "accepted_override" | "replace"; conformance_decided_at?: string };

export function MediaConformancePanel({ attempt, children }: { attempt: MediaAttempt; children?: ReactNode }) {
  if (!attempt.conformance) return null;
  const { media, conformance, conformance_decision: decision } = attempt;
  const pending = conformance.status === "warning" && decision === "pending";
  const channels = media?.audio_channels === 2 ? "stereo" : media?.audio_channels === 1 ? "mono" : media?.audio_channels ? `${media.audio_channels} channels` : "";
  return <div className={`mt-4 rounded-lg border p-4 ${pending ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
    <h4 className="font-semibold">{pending ? "Video settings don’t match" : "Video settings"}</h4>
    <p className="mt-1 text-xs text-slate-600">Deterministic media check</p>
    {pending && <p className="mt-2 font-medium text-amber-900">Clip does not match scene request. Human decision required before AI review or assembly.</p>}
    {decision === "accepted_override" && <p className="mt-2 font-medium">Media override accepted{attempt.conformance_decided_at ? ` · ${new Date(attempt.conformance_decided_at).toLocaleString()}` : ""}. Scene acceptance is a separate decision.</p>}
    {decision === "replace" && <p className="mt-2">Human media decision: Replace Clip. This attempt is preserved.</p>}
    <dl className="mt-3 space-y-3 text-sm">{conformance.checks.filter(check => pending && ["duration", "aspect_ratio", "audio_stream"].includes(check.field)).map((check) => <div key={check.field}>
      <dt className={check.status === "pass" ? "font-medium text-green-800" : "font-medium text-amber-900"}>{check.status === "pass" ? "✓" : "⚠"} {check.field.replaceAll("_", " ")} · {check.status}{check.severity ? ` (${check.severity})` : ""}</dt>
      <dd>{check.expected && <span className="mr-3">Expected: {check.expected}</span>}{check.actual && <span>Imported: {check.actual}</span>}{check.message && <p className="mt-1 text-slate-600">{check.message}</p>}</dd>
    </div>)}</dl>
    <details className="mt-3"><summary className="cursor-pointer">Details</summary><pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(conformance, null, 2)}</pre>
    {media && <div className="mt-3 space-y-1 text-sm text-slate-700"><p>Video: {media.video_codec?.toUpperCase() ?? "unknown codec"} {media.width}×{media.height} · {media.display_aspect_ratio} · {media.duration_seconds.toFixed(2)} sec{media.frame_rate ? ` · ${media.frame_rate.toFixed(2)} fps` : ""}</p><p>Audio: {media.audio_present ? `${media.audio_codec?.toUpperCase() ?? "present"} ${channels}` : "absent"}</p></div>}
    </details>
    {children}
  </div>;
}
