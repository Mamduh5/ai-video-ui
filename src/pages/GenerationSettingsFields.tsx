import type { GenerationSettings } from "../features/settings/contracts";
import { field, generationSettingsForExistingProject } from "../features/settings/contracts";

export function GenerationSettingsFields({ value, onChange, sourceSeconds, disabled = false }: { value?: GenerationSettings; onChange: (value: GenerationSettings) => void; sourceSeconds: number; disabled?: boolean }) {
  const mode = value?.mode ?? "standard";
  const dense = mode === "dense_performance";
  const fast = mode === "fast_performance";
  function changeMode(mode: GenerationSettings["mode"]) {
    onChange(mode === "standard" ? { version: "generation_settings.v1", mode, performance_tempo: 1 } : { version: "generation_settings.v1", mode, performance_tempo: 2, ...(mode === "fast_performance" ? { fast_version: "fast_performance.v2" as const } : {}), ...(value?.dialogue_language ? { dialogue_language: value.dialogue_language } : {}) });
  }
  return <fieldset disabled={disabled} className="space-y-3 rounded-lg border p-4">
    <legend className="px-1 font-medium">Generation performance</legend>
    <label className="block">Generation mode<select className={field} value={mode} onChange={e => changeMode(e.target.value as GenerationSettings["mode"])}><option value="dense_performance">Dense Performance - Recommended / default</option><option value="fast_performance">Fast Performance - Experimental</option><option value="standard">Standard generation</option></select></label>
    {dense && <p className="text-sm">More substantial story and activity with efficient use of the full scene duration and normal-feeling delivery.</p>}
    {fast && value && <><p className="text-sm">{value.fast_version === "fast_performance.v2" ? "Accelerated delivery that progresses farther into the story within the same clip. Watch the original, then slow it down afterward if needed." : "Dense storytelling with deliberately accelerated speech, reactions and physical actions. Watch the original, then slow it down afterward if needed."}</p>
      <label className="block">Fast creative tempo<select className={field} value={value.performance_tempo} onChange={e => onChange({ ...value, performance_tempo: Number(e.target.value) as 1.5 | 2 | 2.5 })}><option value={1.5}>1.5x - moderately accelerated</option><option value={2}>2.0x - rapid</option><option value={2.5}>2.5x - very rapid / experimental</option></select></label>
      <p className="text-xs text-slate-600">Creative performance targets only; the provider may not achieve the exact multiplier. This does not change provider duration or playback speed.</p>
    </>}
    {(dense || fast) && value && <>
      <label className="block">Dialogue language (optional)<input className={field} maxLength={80} placeholder="For example, Thai" value={value.dialogue_language ?? ""} onChange={e => onChange({ ...value, dialogue_language: e.target.value })}/></label>
      <p className="text-sm">Source generation duration: {sourceSeconds} seconds.{dense && ` Approximate normal-paced content target: ${(sourceSeconds * value.performance_tempo).toFixed(1)} seconds per scene.`}</p>
      {dense && <p className="text-xs text-slate-600">Dense content-allocation setting: {value.performance_tempo.toFixed(1)}x, preserved for compatibility. It is not a literal performance or playback multiplier.</p>}
    </>}
    {mode === "standard" && <p className="text-sm">Conservative / legacy generation behavior.</p>}
  </fieldset>;
}

export function GenerationSnapshot({ value, sourceSeconds }: { value?: GenerationSettings; sourceSeconds: number }) {
  const saved = generationSettingsForExistingProject(value);
  const performance = saved.mode === "fast_performance"
    ? `Fast Performance - creative tempo ${saved.performance_tempo.toFixed(1)}x - ${sourceSeconds}s source${saved.fast_version === "fast_performance.v2" ? " - extended story progression requested" : ""}`
    : saved.mode === "dense_performance"
      ? `Dense Performance - saved content-allocation target ${saved.performance_tempo.toFixed(1)}x - ${sourceSeconds}s source - approximately ${(sourceSeconds * saved.performance_tempo).toFixed(1)}s normal-paced content target`
      : "Standard generation";
  return <div className="mt-3 text-sm text-slate-600" aria-label="Saved generation performance"><p>{performance}{saved.dialogue_language ? ` - Dialogue: ${saved.dialogue_language}` : ""}</p><p>Saved plan settings stay fixed. To change generation mode, explicitly create a new storyboard revision; project defaults apply to new projects.</p></div>;
}
