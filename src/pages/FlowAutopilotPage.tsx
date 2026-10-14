import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiJson, buildApiUrl } from "../lib/apiClient";
import { primary } from "./videoProduct";
import type { Production } from "./ProductionOverview";
type Queue = { scheduler: { paused: boolean; max_attempts: number; reservations: string[]; block_reason?: string }; projects: { id: string; title: string; status: string; production: Production; video_url: string }[] };
export function FlowAutopilotPage() {
 const query=useQuery({queryKey:["flowAutopilot"],queryFn:()=>apiJson<Queue>("/flow-autopilot"),refetchInterval:3000});
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function control(action:string){if(busy)return;setBusy(true);setError("");try{await apiJson(`/flow-autopilot/control/${action}`,{method:"POST"});await query.refetch();}catch(e){setError(e instanceof Error?e.message:"Queue control failed");}finally{setBusy(false);}}
 const state=query.data?.scheduler;
 return <div className="mx-auto max-w-4xl space-y-5"><header><h2 className="text-3xl font-semibold">Flow Autopilot</h2><p className="mt-2">Projects finish in queue order. Technically valid scenes are accepted, chained and assembled automatically. Creative quality remains unreviewed until rendered footage is inspected.</p></header>
 <div className="flex flex-wrap gap-3"><Link className={primary} to="/videos/new?workflow=flow_unattended">New unattended video</Link>{state&&<button className="rounded border px-4" disabled={busy} onClick={()=>void control(state.paused?"resume":"pause")}>{state.paused?"Resume Flow queue":"Pause Flow queue"}</button>}</div>
 {state&&<section className="rounded-xl border bg-white p-5"><p>{state.paused?"Queue paused":"Queue running"}</p><p>{state.reservations.length} / {state.max_attempts} generation authorizations reserved</p><p className="text-sm">Reservations survive restart and include uncertain submissions. Pause stops future submissions; an already authorized generation continues safely.</p>{state.block_reason&&<p role="status" className="mt-2 text-amber-800">{state.block_reason}</p>}</section>}
 {(error||query.isError)&&<p role="alert">{error||query.error?.message}</p>}
 <ol className="space-y-3">{query.data?.projects.map((project,index)=><li key={project.id} className="rounded-xl border bg-white p-5"><h3 className="text-xl font-semibold">{index+1}. {project.title}</h3><p>{project.production.accepted_count} / {project.production.scene_count} scenes · {project.production.status.replaceAll("_"," ")}</p><Link className="mr-4 text-blue-800 underline" to={`/scene-jobs/${project.id}`}>View project</Link>{project.status==="completed"&&<a className="text-blue-800 underline" href={buildApiUrl(project.video_url)}>Watch final video</a>}</li>)}</ol></div>;
}
