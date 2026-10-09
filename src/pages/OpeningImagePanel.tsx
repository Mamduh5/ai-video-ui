import { useState } from "react";
import { apiJson, buildApiUrl } from "../lib/apiClient";
import { primary } from "./videoProduct";
export type OpeningImage = { required: boolean; provider?:string; retired_run_ids?:string[]; approved_version?: number; versions?: {version:number;decision?:string;media_check?:string;width?:number;height?:number}[]; runs?: {provider?:string;run_id:string;status:string;submission_intent:boolean;failure?:string;evidence?:{project_id?:string}}[] };
export function OpeningImagePanel({jobId,opening,imageUrl,expected,action,onChanged}:{jobId:string;opening:OpeningImage;imageUrl?:string;expected?:string;action:string;onChanged:()=>void}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[ackRun,setAckRun]=useState(''),[uploadFile,setUploadFile]=useState<File|null>(null);
  const version=opening.versions?.at(-1)?.version;
  const candidate=opening.runs?.at(-1);
  const run=candidate&&!opening.retired_run_ids?.includes(candidate.run_id)?candidate:undefined;
  const chat=opening.provider==='chatgpt_web';
  const mediaCheck=opening.versions?.at(-1)?.media_check;
  const invalidAspect=!!mediaCheck&&mediaCheck!=='passed';
  const projectId=run?.evidence?.project_id;
  const flowUrl=projectId&&/^[a-f0-9-]{36}$/i.test(projectId)?`https://flow.google.com/project/${projectId}`:"https://flow.google.com/";
  async function act(kind:string) {
    if(busy)return;setBusy(true);setError('');
    try { await apiJson(`/scene-video-jobs/${encodeURIComponent(jobId)}/opening-image/${kind}`,{method:'POST',body:kind==='approve'?{version}:kind==='reconcile-no-result'?{run_id:run?.run_id,acknowledge_possible_charge:true}:undefined});onChanged(); }
    catch(cause){setError(cause instanceof Error?cause.message:'Could not update the opening image.');}finally{setBusy(false);}
  }
  async function upload() {
    if(busy||!uploadFile)return;setBusy(true);setError('');
    try { const body=new FormData();body.append('image',uploadFile);const response=await fetch(buildApiUrl(`/scene-video-jobs/${encodeURIComponent(jobId)}/opening-image/upload`),{method:'POST',body});if(!response.ok){const detail=await response.json() as {error?:string};throw new Error(detail.error||'Could not upload opening image.');}setUploadFile(null);onChanged(); }
    catch(cause){setError(cause instanceof Error?cause.message:'Could not upload opening image.');}finally{setBusy(false);}
  }
  return <section id="opening-image" className="space-y-4 rounded-xl border bg-white p-6" aria-label="Opening image review">
    <h3 className="text-2xl font-semibold">Scene 1 opening image</h3>
    <p>This is how the scene will begin. Does it match the story?</p>
    {expected&&<p className="text-slate-700"><strong>Expected:</strong> {expected}</p>}
    {imageUrl&&<img className="max-h-[28rem] w-full rounded object-contain" src={buildApiUrl(imageUrl)} alt="Scene 1 opening image"/>}
    {action==='wait_for_opening_image'&&<p role="status">Preparing the opening image… Video generation waits for your approval.</p>}
    {action==='prepare_opening_image'&&<button disabled={busy} className={primary} onClick={()=>void act('generate')}>{busy?'Preparing…':'Generate Opening Image'}</button>}
    {action==='review_opening_image'&&<><p role="status">Opening image ready</p>{invalidAspect&&<p role="alert">The image dimensions do not match the video aspect ratio. Generate another image before continuing.</p>}<div className="flex flex-wrap gap-3"><button disabled={busy} className="rounded border px-4 py-2" onClick={()=>void act('generate')}>Generate Another</button><button disabled={busy||!version||invalidAspect} className={primary} onClick={()=>void act('approve')}>Use This Image</button></div><p className="text-sm text-slate-600">Use This Image approves only the opening image. It does not accept the video or start video generation.</p></>}
    {action==='recover_opening_image'&&<><p>Image generation needs attention. {run?.submission_intent?'Submission may already have happened. Check the existing result before any deliberate retry.':'Preparation stopped before submission. Sign in manually if required, then try again.'}</p><a className="inline-block rounded border p-3" href={chat?"https://chatgpt.com/":flowUrl} target="_blank" rel="noreferrer">{chat?"Open Image Session":"Open Flow to Check"}</a><button disabled={busy||(chat&&run?.submission_intent)} className={primary} onClick={()=>void act(run?.submission_intent?'resume':'generate')}>Recover Opening Image</button><details><summary>Technical reason</summary><p>{run?.failure}</p></details>{run?.submission_intent&&<details><summary>{chat?"If the session has no image":"If Flow has no image"}</summary><label className="mt-3 flex items-start gap-2"><input type="checkbox" checked={ackRun===run.run_id} onChange={event=>setAckRun(event.target.checked?run.run_id:"" )}/>I checked the image session: no image is available. Provider usage may still apply.</label><button disabled={busy||ackRun!==run.run_id} className="mt-3 rounded border px-4 py-2" onClick={()=>void act("reconcile-no-result")}>Confirm No Image</button><p className="mt-2 text-sm text-slate-600">This clears the uncertain run. It does not generate another image or video.</p></details>}</>}
    {['prepare_opening_image','review_opening_image'].includes(action)&&<p className="text-xs text-slate-500">One image is generated per deliberate request.</p>}
    {action!=='wait_for_opening_image'&&(!run?.submission_intent||run.status==='completed'||run.status==='resolved_no_result')&&<details><summary>Upload Opening Image</summary><label className="mt-3 block">Opening image file<input type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" disabled={busy} onChange={event=>setUploadFile(event.target.files?.[0]??null)}/></label><button className="mt-3 rounded border px-4 py-2" disabled={busy||!uploadFile} onClick={()=>void upload()}>Upload for Review</button><p className="text-sm text-slate-600">Uploaded images use the same aspect check and explicit opening-image approval.</p></details>}
    {error&&<p role="alert" className="text-red-700">{error}</p>}
  </section>;
}
export function OpeningComparison({approvedUrl,generatedUrl}:{approvedUrl:string;generatedUrl:string}) {
  return <section aria-label="Opening frame comparison" className="mt-5 grid gap-4 sm:grid-cols-2"><figure><figcaption className="mb-2 font-medium">Approved opening</figcaption><img className="w-full rounded object-contain" src={buildApiUrl(approvedUrl)} alt="Approved opening"/></figure><figure><figcaption className="mb-2 font-medium">Generated opening</figcaption><img className="w-full rounded object-contain" src={generatedUrl} alt="Generated opening"/></figure></section>;
}

export function OpeningProviderSettings({jobId,opening,onChanged}:{jobId:string;opening:OpeningImage;onChanged:()=>void}) {
 const [stopped,setStopped]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const selected=opening.provider||'flow_web';
 async function select() {if(busy)return;setBusy(true);setError('');try {await apiJson(`/scene-video-jobs/${encodeURIComponent(jobId)}/opening-image/provider`,{method:'POST',body:{provider:'chatgpt_web',confirm_no_active_generation:stopped}});onChanged();}catch(cause){setError(cause instanceof Error?cause.message:'Could not change opening provider.');}finally{setBusy(false);}}
 return <section aria-label="Opening image diagnostics" className="space-y-3 rounded border p-3"><p>Opening image provider: {selected}</p>{selected!=='chatgpt_web'&&!opening.approved_version&&<><label className="flex gap-2"><input type="checkbox" checked={stopped} onChange={event=>setStopped(event.target.checked)}/>I checked the previous image session: no generation is active. Its unresolved result and credit history must stay recorded.</label><button disabled={busy||!stopped} className="rounded border px-4 py-2" onClick={()=>void select()}>Use ChatGPT Web for Opening Images</button><p>This changes the image source and queues no generation.</p></>}{error&&<p role="alert">{error}</p>}</section>;
}
