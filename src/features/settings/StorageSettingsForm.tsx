import { SectionEditor } from "./SectionEditor";
import { archiveLevels, field, gibToBytes, retentionPolicies, validateStorage, type StorageSettings } from "./contracts";

type Draft = Omit<StorageSettings, "warning_bytes" | "critical_bytes" | "reserve_bytes"> & { warning: string; critical: string; reserve: string };
function bytes(draft: Draft): StorageSettings {
 const { warning, critical, reserve, ...rest } = draft;
 return { ...rest, warning_bytes: gibToBytes(warning), critical_bytes: gibToBytes(critical), reserve_bytes: gibToBytes(reserve) };
}
export function StorageSettingsForm({ saved, onSave, onReload }: { saved: StorageSettings; onSave: (value: StorageSettings) => Promise<void>; onReload: () => Promise<unknown> }) {
 const { warning_bytes, critical_bytes, reserve_bytes, ...rest } = saved;
 const current: Draft = { ...rest, warning: String(warning_bytes / 1024 ** 3), critical: String(critical_bytes / 1024 ** 3), reserve: String(reserve_bytes / 1024 ** 3) };
 function validate(d: Draft) { try { return validateStorage(bytes(d)); } catch (cause) { return cause instanceof Error ? cause.message : "Invalid disk thresholds"; } }
 return <SectionEditor title="Storage & Google Drive" saved={current} validate={validate} onReload={onReload} saveLabel="Save Storage Settings" onSave={d => onSave(bytes(d))}>{(d, edit) => {
  let floor: string | undefined; try { floor = String((gibToBytes(d.critical) + gibToBytes(d.reserve)) / 1024 ** 3); } catch { /* The validation message explains the incomplete numeric draft. */ }
  return <><p className="text-sm text-slate-600">Disk protection applies on the next safety check. Archive policies apply to newly queued archives.</p>
   <div className="grid gap-4 sm:grid-cols-3">{(["warning", "critical", "reserve"] as const).map(key => <label key={key} className="block">{key === "warning" ? "Warning free space" : key === "critical" ? "Critical free space" : "Working space reserve"} (GiB)<input className={field} type="text" inputMode="decimal" value={d[key]} onChange={e => edit({ ...d, [key]: e.target.value })} /></label>)}</div>
   <p className="rounded bg-blue-50 p-3">Effective generation floor: <strong>{floor ?? "--"} GiB free</strong>. Critical + working reserve determines the ordinary generation floor.</p>
   <label className="flex items-center gap-2"><input type="checkbox" checked={d.automatic} onChange={e => edit({ ...d, automatic: e.target.checked })} />Automatically archive completed projects</label>
   <div className="grid gap-4 sm:grid-cols-2"><label className="block">Archive level<select className={field} value={d.level} onChange={e => edit({ ...d, level: e.target.value })}>{Object.entries(archiveLevels).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>
   <label className="block">Retention policy<select className={field} value={d.cleanup} onChange={e => edit({ ...d, cleanup: e.target.value })}>{Object.entries(retentionPolicies).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label></div>
   <p className="text-sm">Saving this policy does not remove files or execute cleanup. Newly queued archives use this policy after verified copies exist. Existing archives retain their saved policy. Manual cleanup is a separate explicit operation on Storage.</p>
  </>;
 }}</SectionEditor>;
}
