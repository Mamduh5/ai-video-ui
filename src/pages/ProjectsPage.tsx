import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiJson, buildApiUrl } from "../lib/apiClient";
import { primary, updatedTime, type Project } from "./videoProduct";

export function ProjectsPage() {
 const [offset,setOffset]=useState(0);
 const query=useQuery({queryKey:["videoProjects",offset],queryFn:()=>apiJson<{projects:Project[];has_more:boolean;next_offset:number}>(`/scene-video-jobs?offset=${offset}`),refetchInterval:10000});
 return <div className="space-y-6"><header className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-3xl font-semibold">My Videos</h2><p className="mt-2 text-slate-600">Pick up where you left off, or tell a new story.</p></div><Link to="/videos/new" className={primary}>+ New Video</Link></header>
 {query.isLoading && <p role="status">Loading your videos…</p>}
 {query.isError && <div role="alert"><p>{query.error.message}</p><button onClick={()=>void query.refetch()} className="mt-3 rounded border p-3">Try again</button></div>}
 {query.data?.projects.length===0 && <section className="rounded-xl border bg-white p-10 text-center"><h3 className="text-2xl font-semibold">Create your first AI video</h3><p className="mx-auto my-4 max-w-lg text-slate-600">Describe an idea, review the storyboard, then the app will generate each scene for you.</p><Link className={primary} to="/videos/new">New Video</Link></section>}
 <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{query.data?.projects.map(project=><article key={project.id} className="min-w-0 overflow-hidden rounded-xl border bg-white">
 {project.thumbnail_url ? <img loading="lazy" src={buildApiUrl(project.thumbnail_url)} alt={`${project.title} preview`} className="h-48 w-full bg-slate-100 object-contain"/> : <div aria-label="Video preview placeholder" className="flex aspect-video items-center justify-center bg-slate-200 text-slate-500">Your story starts here</div>}
 <div className="space-y-3 p-5"><h3 className="break-words text-xl font-semibold">{project.title}</h3><span className={`inline-block rounded-full px-3 py-1 text-sm ${project.display_status==='Needs attention'||project.display_status==='Failed'?'bg-amber-100 text-amber-900':project.display_status==='Completed'?'bg-green-100 text-green-900':'bg-blue-50 text-blue-900'}`}>{project.display_status}</span><p>{project.accepted_count} / {project.scene_count} scenes approved{project.duration_seconds ? ` · ${project.duration_seconds.toFixed(0)} sec` : ''}</p><p className="text-xs text-slate-500">{updatedTime(project.updated_at)}</p><Link className="inline-block rounded border border-blue-800 px-4 py-2 font-medium text-blue-800" to={`/scene-jobs/${encodeURIComponent(project.id)}`}>{project.next_action.background ? 'View Progress' : project.next_action.type==='none' ? 'View Details' : project.next_action.label}</Link></div></article>)}</div>
 {(offset>0||query.data?.has_more)&&<nav aria-label="Video pages" className="flex gap-3"><button disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-40))} className="rounded border p-3 disabled:opacity-50">Previous</button><button disabled={!query.data?.has_more} onClick={()=>setOffset(query.data?.next_offset??offset)} className="rounded border p-3 disabled:opacity-50">More Videos</button></nav>}
 </div>;
}
