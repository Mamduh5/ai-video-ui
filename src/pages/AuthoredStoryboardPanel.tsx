import { useState } from "react";
import { apiJson } from "../lib/apiClient";
export function AuthoredStoryboardPanel({id,onChanged}:{id:string;onChanged:()=>void}){
 const [raw,setRaw]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function submit(){if(busy)return;setBusy(true);setError("");try{await apiJson(`/scene-video-jobs/${id}/storyboard/import`,{method:"POST",body:JSON.parse(raw)});onChanged();}catch(e){setError(e instanceof Error?e.message:"Storyboard import failed");}finally{setBusy(false);}}
 return <section className="rounded-xl border bg-white p-5"><h3 className="text-xl font-semibold">Import authored storyboard</h3><p>This project waits for your complete storyboard JSON. It is recorded as operator authored and makes no planner inference claim. Scene count, durations, identities and adjacent states are validated before production.</p><label className="mt-3 block">Storyboard JSON<textarea className="mt-1 w-full rounded border p-3" rows={10} value={raw} onChange={e=>setRaw(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}<button className="mt-3 rounded bg-blue-800 px-4 py-2 text-white" disabled={busy||!raw.trim()} onClick={()=>void submit()}>{busy?"Validating...":"Import storyboard"}</button></section>;
}
