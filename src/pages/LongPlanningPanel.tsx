import {useState} from "react";
import {apiJson} from "../lib/apiClient";
import {AutopilotFailure,type FailureDetail} from "./autopilotStatus";
import {bangkokTime} from "../lib/autopilotTime";
export type LongPlanningSummary={stage:string;completed_scenes:number;total_scenes:number;completed_batches:number;stage_attempts:number;needs_attention:boolean;next_retry_at?:string;diagnostic?:FailureDetail};
export function LongPlanningPanel({id,progress,onChanged,gemini=false}:{id:string;progress?:LongPlanningSummary;onChanged:()=>void;gemini?:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");if(!progress)return null;
 const first=Number(progress.stage.replace("batch_",""));const stage=progress.stage.startsWith("batch_")?`Planning scenes ${first}-${Math.min(first+4,progress.total_scenes)}`:({outline:"Planning episode outline",publishing:"Saving final storyboard and requests",complete:"Storyboard saved"} as Record<string,string>)[progress.stage]??progress.stage;
 async function retry(){setBusy(true);setError("");try{await apiJson(`/scene-video-jobs/${encodeURIComponent(id)}/planning/retry`,{method:"POST"});onChanged()}catch(e){setError(e instanceof Error?e.message:"Could not retry the failed stage")}finally{setBusy(false)}}
 return <section className="space-y-2 rounded-xl border bg-white p-5" aria-label="Long-form planning progress"><h3 className="font-semibold">{stage}</h3><p>{progress.completed_scenes} / {progress.total_scenes} scenes saved in {progress.completed_batches} validated batches.</p>{progress.stage!=="complete"&&<p className="text-sm">Valid outline and batches survive restart. Generation begins only after the full storyboard and requests are saved.</p>}{progress.next_retry_at&&<p>Next stage retry: {bangkokTime(progress.next_retry_at)}</p>}{progress.diagnostic&&<AutopilotFailure detail={progress.diagnostic}/>} {progress.needs_attention&&!gemini&&<button disabled={busy} className="rounded border px-4 py-2" onClick={()=>void retry()}>Retry failed planning stage</button>}{error&&<p role="alert">{error}</p>}</section>;
}
