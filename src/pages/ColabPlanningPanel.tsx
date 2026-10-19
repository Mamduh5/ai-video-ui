import { useState } from "react";
import { apiJson, buildApiUrl } from "../lib/apiClient";
import { ColabReadinessStatus } from "./ColabReadiness";
import { useColabReadiness } from "./useColabReadiness";
export type ColabPlanning = { status: string; auto_exchange?: boolean; error?: string; advisories?: string[]; request: { request_id: string; revision: number } };
export function ColabPlanningPanel({ id, planning, onChanged, unattended = false }: { id: string; planning: ColabPlanning; onChanged: () => void; unattended?: boolean }) {
 const [resultJson,setResultJson]=useState(''),[requestJson,setRequestJson]=useState('');
 const [file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const readiness=useColabReadiness();
 const waiting=planning.status==='waiting';
 const automatic=readiness.automatic&&!planning.error&&(!waiting||planning.auto_exchange===true);
 const nextAction=!waiting?(unattended?'Review the imported storyboard, then authorize a credit batch and resume the Flow queue when ready.':'Review the imported storyboard, then click Start Production when ready.'):planning.error?'Read the planning error below and open Recovery to correct or import the matching result.':readiness.automatic&&!planning.auto_exchange?'Open Recovery, then Request recovery, and click Create a new planning request to enable automatic planning. Existing request history is preserved.':readiness.nextAction;
 async function importResult(){if((!file&&!resultJson.trim())||busy)return;setBusy(true);setError('');try{const response=await fetch(buildApiUrl(`/scene-video-jobs/${encodeURIComponent(id)}/colab/import`),{method:'POST',headers:{'Content-Type':'application/json'},body:resultJson.trim()||(file?await file.text():'')});const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error||'Could not import storyboard.');onChanged();}catch(cause){setError(cause instanceof Error?cause.message:'Import failed');}finally{setBusy(false);}}
 async function showRequest(){if(busy)return;setBusy(true);setError('');try{const response=await fetch(buildApiUrl(`/scene-video-jobs/${encodeURIComponent(id)}/colab/request`));if(!response.ok)throw new Error('Could not export request');setRequestJson(await response.text());}catch(cause){setError(cause instanceof Error?cause.message:'Request export failed');}finally{setBusy(false);}}
 async function retry(){if(busy)return;setBusy(true);setError('');try{await apiJson(`/scene-video-jobs/${encodeURIComponent(id)}/colab/retry`,{method:'POST'});onChanged();}catch(cause){setError(cause instanceof Error?cause.message:'Could not retry');}finally{setBusy(false);}}
 const recovery=<div className="mt-3 space-y-3">
   <p className="text-sm">Manual transfer is available when synchronization is unavailable. The archive Drive connection does not synchronize notebook files.</p>
   <p className="text-sm">Request UUID: <code>{planning.request.request_id}</code> - revision {planning.request.revision}. Use this UUID in the notebook, not the SHA-256 checksum.</p>
   {waiting ? <>
     <a className="inline-block text-blue-800 underline" href={buildApiUrl(`/scene-video-jobs/${encodeURIComponent(id)}/colab/request`)} download>Export request for manual transfer</a>
     <p className="text-sm">Upload the request with the notebook's advanced manual controls, process that request, then download and import its completed result here.</p>
     <button type="button" className="rounded border p-2" disabled={busy} onClick={()=>void showRequest()}>Show request JSON for clipboard transfer</button>
     {requestJson&&<label className="block">Exported Colab request JSON<textarea className="mt-2 block w-full rounded border p-2 font-mono text-xs" rows={5} readOnly value={requestJson}/></label>}
     <label className="block">Paste completed Colab result JSON<textarea className="mt-2 block w-full rounded border p-2 font-mono text-xs" rows={5} value={resultJson} onChange={e=>setResultJson(e.target.value)} placeholder="Paste the original complete checksummed result envelope"/></label>
     <label className="block">Completed Colab result JSON<input className="mt-2 block" type="file" accept=".json,application/json" onChange={e=>setFile(e.target.files?.[0]??null)}/></label>
     <button type="button" className="rounded border p-3 disabled:opacity-50" disabled={(!file&&!resultJson.trim())||busy} onClick={()=>void importResult()}>Import storyboard</button>
     <details><summary>Request recovery</summary><p>A new request revision makes older results stale. Existing confirmed batches resume in Colab when you rerun the same request.</p><button type="button" disabled={busy} className="mt-2 rounded border p-2" onClick={()=>void retry()}>Create a new planning request</button></details>
   </> : <>
     <a className="block text-blue-800 underline" href={buildApiUrl(`/scene-video-jobs/${encodeURIComponent(id)}/colab/receipt`)} download>Export import receipt / scene memory</a>
     <p className="text-xs">For manual transfer, upload this receipt in the notebook to save imported context and explicit scene decisions in Drive. Re-export after new decisions.</p>
   </>}
 </div>;
 return <section aria-label="Colab planning" className="space-y-3 rounded-xl border bg-white p-5">
   <h3 className="text-xl font-semibold">Colab storyboard planner</h3>
   {!waiting ? <><p role="status" className="font-semibold">Storyboard imported</p><p>{unattended ? "Validated storyboard imported. Flow generation still requires batch credit authorization and Resume Flow queue." : "Validated storyboard imported. Review every scene, then click Start Production to authorize Flow generation."}</p></> : planning.error ? <p role="status" className="font-semibold">Planning failed</p> : null}
   <ColabReadinessStatus readiness={{...readiness,nextAction}}/>
   {waiting && <>
     <p>{automatic ? "This project's current request is exchanged automatically. Video Studio will display its storyboard after validation; keep the notebook running." : "The current request is waiting for a validated Colab storyboard. You can use Recovery for manual transfer while automatic exchange is unavailable."}</p>
     <a className="block text-blue-800 underline" href={buildApiUrl('/colab/notebook')} download>Download clean notebook kit</a>
     <p className="text-sm">Upload the kit's notebook folder into MyDrive/AI_Video_Planner. Open AI_Video_Planner.ipynb, connect a GPU runtime, and run Start Flow Planner once.</p>
     <p className="text-xs">{unattended ? "Storyboard import does not authorize paid generation. Batch credit authorization and Resume Flow queue remain required." : "Storyboard import does not start paid generation. Start Production remains your approval step."}</p>
   </>}
   <details open={!automatic}><summary className="cursor-pointer font-medium">Recovery / manual JSON transfer</summary>{recovery}</details>
   {planning.advisories?.map((note,i)=><p className="text-sm text-slate-600" key={i}>{note}</p>)}
   {(error||planning.error)&&<p role="alert" className="text-red-700">{error||planning.error}</p>}
 </section>;
}