import { useState, type ReactNode } from "react";
import { primary } from "../../pages/videoProduct";

export function SectionEditor<T>({ title, saved, validate, onSave, onReload, children, saveLabel = "Save Changes", successMessage = "Changes saved." }: {
 title: string; saved: T; validate: (value: T) => string; onSave: (value: T) => Promise<void>; onReload: () => Promise<unknown>;
 children: (value: T, edit: (value: T) => void) => ReactNode; saveLabel?: string; successMessage?: string;
}) {
 const [draft, setDraft] = useState<T>(), [base, setBase] = useState<string>(), [busy, setBusy] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState(false);
 const value = draft ?? saved;
 const changed = draft !== undefined && base !== JSON.stringify(saved);
 const validation = validate(value);
 function edit(next: T) { if (draft === undefined) setBase(JSON.stringify(saved)); setDraft(next); setError(""); setSuccess(false); }
 async function save() {
  if (busy || changed || validation) return;
  setBusy(true); setError(""); setSuccess(false);
  try { await onSave(value); setDraft(undefined); setBase(undefined); setSuccess(true); }
  catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save settings. Your draft is retained."); }
  finally { setBusy(false); }
 }
 async function reload() { setBusy(true); try { await onReload(); setDraft(undefined); setBase(undefined); setError(""); setSuccess(false); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not reload saved settings."); } finally { setBusy(false); } }
 return <form aria-label={title} className="space-y-4 rounded-xl border bg-white p-5 sm:p-6" onSubmit={event => { event.preventDefault(); void save(); }}>
  <h3 className="text-xl font-semibold">{title}</h3>
  <fieldset disabled={busy} className="min-w-0 space-y-4">{children(value, edit)}</fieldset>
  {validation && <p role="alert" className="break-words text-red-700">{validation}</p>}
  {changed && <p role="alert">Saved values changed elsewhere. Your draft is retained. Reload saved values and review your edits before saving.</p>}
  {error && <p role="alert" className="break-words text-red-700">{error}</p>}
  {success && <p role="status">{successMessage}</p>}
  <div className="flex flex-wrap gap-3">
   <button type="submit" disabled={busy || changed || Boolean(validation)} className={primary}>{busy ? "Saving..." : saveLabel}</button>
   <button type="button" disabled={busy || draft === undefined} className="rounded border px-4 py-2" onClick={() => { setDraft(undefined); setBase(undefined); setError(""); setSuccess(false); }}>Cancel / Revert</button>
   {(changed || error) && <button type="button" disabled={busy} className="rounded border px-4 py-2" onClick={() => void reload()}>Reload saved values</button>}
  </div>
 </form>;
}
