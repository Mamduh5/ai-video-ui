import { useState } from "react";
import { primary } from "./videoProduct";

type RecoveryPromptEditorProps = {
  initialPrompt: string;
  busy: boolean;
  onSave: (prompt: string) => void;
  onCancel?: () => void;
};

/** Own the unsaved draft; the caller keys saved-prompt changes when not editing. */
export function RecoveryPromptEditor({ initialPrompt, busy, onSave, onCancel }: RecoveryPromptEditorProps) {
  const [draft, setDraft] = useState(initialPrompt);
  return <div className="space-y-3 rounded-xl border border-amber-200 bg-white p-4">
    <label className="block text-sm font-medium text-slate-800">Revise scene prompt before retrying<textarea className="mt-2 block w-full rounded-lg border p-3 text-sm" rows={3} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Describe the camera motion and scene action for Gemini" /></label>
    <div className="flex flex-wrap gap-2">
      <button disabled={busy || draft.trim().length < 5} className={primary} onClick={() => onSave(draft.trim())}>Save Prompt & Retry Scene</button>
      {onCancel && <button disabled={busy} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50" onClick={onCancel}>Cancel</button>}
    </div>
  </div>;
}
