import type { GenerationSettings } from "../features/settings/contracts";
import { field } from "../features/settings/contracts";

export function GenerationSettingsFields({ value, onChange, sourceSeconds, disabled = false }: { value?: GenerationSettings; onChange: (value: GenerationSettings) => void; sourceSeconds: number; disabled?: boolean }) {
  const dense = value?.mode === "dense_performance";
  const tempo = dense ? value.performance_tempo : 1;
  return <fieldset disabled={disabled} className="space-y-3 rounded-lg border p-4">
    <legend className="px-1 font-medium">Generation performance</legend>
    <label className="block">Generation mode<select className={field} value={dense ? "dense_performance" : "standard"} onChange={e => onChange(e.target.value === "dense_performance" ? { version: "generation_settings.v1", mode: "dense_performance", performance_tempo: 2, ...(value?.dialogue_language ? { dialogue_language: value.dialogue_language } : {}) } : { version: "generation_settings.v1", mode: "standard", performance_tempo: 1 })}><option value="standard">Standard generation</option><option value="dense_performance">Dense Performance — substantial content, delivered briskly</option></select></label>
    {dense && <><p className="text-sm">Characters speak and act faster during generation. You can slow the result afterward.</p>
      <label className="block">Performance tempo requested from the AI<select className={field} value={tempo} onChange={e => onChange({ ...value, performance_tempo: Number(e.target.value) as 1.5 | 2 | 2.5 })}>{[1.5, 2, 2.5].map(n => <option key={n} value={n}>{n.toFixed(1)}x</option>)}</select></label>
      <label className="block">Dialogue language (optional)<input className={field} maxLength={80} placeholder="For example, Thai" value={value.dialogue_language ?? ""} onChange={e => onChange({ ...value, dialogue_language: e.target.value })}/></label>
      <p className="text-sm">Source generation duration: {sourceSeconds} seconds. Approximate normal-paced content target: {(sourceSeconds * tempo).toFixed(1)} seconds per scene.</p>
      <p className="text-xs text-slate-600">Creative content-allocation target only. Delivery speed and intelligibility depend on the generated result. This does not change provider duration or playback speed.</p>
    </>}
  </fieldset>;
}

export function GenerationSnapshot({ value, sourceSeconds }: { value?: GenerationSettings; sourceSeconds: number }) {
  return <div className="mt-3 text-sm text-slate-600" aria-label="Saved generation performance"><p>{value?.mode === "dense_performance" ? `Dense Performance · requested ${value.performance_tempo.toFixed(1)}x · ${sourceSeconds}s source · approximately ${(sourceSeconds * value.performance_tempo).toFixed(1)}s normal-paced content target` : "Standard generation"}{value?.dialogue_language ? ` · Dialogue: ${value.dialogue_language}` : ""}</p><p>Saved plan settings stay fixed. To change generation mode, explicitly create a new storyboard revision; project defaults apply to new projects.</p></div>;
}
