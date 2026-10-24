import { useEffect, useRef } from "react";
import { useObjectUrl } from "../lib/objectUrl";

import { emptySubjectReference, canSelectSubjectReference, validateSubjectReference, type SubjectReferenceCapability, type SubjectReferenceState } from "../features/subjectReference/validation";

export function SubjectReferenceUploader({
  state,
  onChange,
  capability,
  checking = false,
  disabled = false,
  uploadError = "",
  title = "Subject Reference",
  roleLabel = "Subject Reference",
  projectKind = "project",
  description = "Guide the subject's appearance across scenes. The background and opening composition can change. This is separate from an opening frame or a previous scene's continuity frame.",
  inputLabel = "Reference image file",
  previewAlt = "Subject reference preview",
  heading = "Reference Image",
}: {
  state: SubjectReferenceState;
  onChange: (state: SubjectReferenceState) => void;
  capability?: SubjectReferenceCapability;
  checking?: boolean;
  disabled?: boolean;
  uploadError?: string;
  title?: string;
  roleLabel?: string;
  projectKind?: string;
  description?: string;
  inputLabel?: string;
  previewAlt?: string;
  heading?: string;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const validation = useRef(0);
  const preview = useObjectUrl(state.selection?.file);
  const supported = canSelectSubjectReference(capability);
  useEffect(() => () => { validation.current++; }, []);
  async function select(file?: File) {
    if (!file || disabled || !supported || !capability) return;
    const current = ++validation.current;
    onChange({ ...state, pending: true, error: "" });
    try {
      const selection = await validateSubjectReference(file, capability);
      if (current === validation.current) onChange({ selection, pending: false, error: "" });
    } catch (cause) {
      if (current === validation.current) onChange({ ...state, pending: false, error: cause instanceof Error ? cause.message : "Could not validate the image." });
    }
  }
  function remove() { validation.current++; onChange({ ...emptySubjectReference }); }
  return <section aria-label={title} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
    <div><h3 className="font-semibold">{heading} <span className="text-sm font-normal text-slate-500">(optional)</span></h3><p className="mt-1 text-sm font-medium">{roleLabel}</p></div>
    <p className="text-sm text-slate-600">{description}</p>
    {!supported && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{checking ? `Checking ${roleLabel} availability...` : capability?.message || `${roleLabel} is unavailable until its provider image role is verified. You can create a video without an image.`}</p>}
    <label className="block text-sm font-medium">{inputLabel}<input ref={fileInput} className="mt-2 block w-full min-w-0 text-sm file:mr-3 file:rounded file:border file:bg-white file:px-3 file:py-2" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" disabled={disabled || !supported} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; void select(file); }}/></label>
    <p className="text-xs text-slate-600">One PNG or JPEG. Maximum {capability?.max_bytes ? capability.max_bytes / 1048576 : 10} MiB, {capability?.max_width || 4096} by {capability?.max_height || 4096} pixels, {((capability?.max_pixels || 16000000) / 1000000).toLocaleString()} megapixels total. Image contents are validated again when saved.</p>
    {state.selection && preview && <figure className="space-y-2"><img src={preview} alt={previewAlt} className="max-h-64 w-full rounded-lg bg-white object-contain"/><figcaption className="break-words text-xs text-slate-600">{state.selection.file.name} - {state.selection.width} by {state.selection.height} pixels</figcaption></figure>}
    {(state.selection || state.pending || state.error) && <div className="flex flex-wrap gap-3">{state.selection && <button type="button" className="rounded-lg border bg-white px-3 py-2 text-sm disabled:opacity-50" disabled={disabled || !supported} onClick={() => fileInput.current?.click()}>Replace image</button>}<button type="button" className="rounded-lg border bg-white px-3 py-2 text-sm disabled:opacity-50" disabled={disabled} onClick={remove}>Remove image</button></div>}
    {state.pending && <p role="status" className="text-sm">Validating image... Project creation waits until validation finishes.</p>}
    {state.error && <p role="alert" className="text-sm text-red-700">{state.error} Replace or remove the image before continuing.</p>}
    {uploadError && <p role="alert" className="text-sm text-red-700">{uploadError} Your image remains selected. Retry project creation to use the same request.</p>}
    {state.selection && !state.error && <p className="text-xs text-slate-600">The image is saved with this {projectKind} before it can enter planning or generation.</p>}
  </section>;
}
