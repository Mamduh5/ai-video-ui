import { useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiJson, apiMultipart } from "../lib/apiClient";
import { runningTime, generationSettingsForNewProject, validateGenerationSettings, type CreationOptions, type GenerationResolution, type GenerationSettings } from "../features/settings/contracts";
import { primary } from "./videoProduct";
import { GenerationSettingsFields } from "./GenerationSettingsFields";
import { ColabCreationReadiness } from "./ColabReadiness";
import { SubjectReferenceUploader } from "../components/SubjectReferenceUploader";
import { emptySubjectReference, canSelectSubjectReference, type SubjectReferenceCapability, type SubjectReferenceState } from "../features/subjectReference/validation";
export function CreateSceneVideoPage() {
 const navigate=useNavigate();
 const [searchParams]=useSearchParams();
 const options=useQuery({queryKey:["videoCreationOptions"],queryFn:()=>apiJson<CreationOptions>("/scene-video-options")});
 const [title,setTitle]=useState(''),[topic,setTopic]=useState(''),[countOverride,setCount]=useState<number>(),[aspectOverride,setAspect]=useState<string>(),[audioOverride,setAudio]=useState<string>();
 const [continuity,setContinuity]=useState('chained_frames'),[review,setReview]=useState('human_only'),[reference,setReference]=useState('none'),[character,setCharacter]=useState('');
 const [selectedSeconds,setSelectedSeconds]=useState<number|undefined>(undefined);
 const [generationOverride,setGeneration]=useState<GenerationSettings>();
 const [resolution,setResolution]=useState<GenerationResolution>("720p");
 const [workflowOverride,setWorkflow]=useState<string>();
 const workflow=workflowOverride??(['flow_unattended','gemini_web'].includes(searchParams.get('workflow')??'')?searchParams.get('workflow')!:options.data?.video_defaults?.preferred_workflow??"flow_web");
 const isGemini=workflow==="gemini_web";
 const subjectCapability=useQuery({queryKey:["geminiSubjectReferenceCapability"],queryFn:()=>apiJson<SubjectReferenceCapability>("/gemini-autopilot/subject-reference-capability"),enabled:isGemini,retry:false});
 const flowSubjectCapability=useQuery({queryKey:["flowSubjectReferenceCapability"],queryFn:()=>apiJson<SubjectReferenceCapability>("/flow/subject-reference-capability"),enabled:!isGemini,retry:false});
 const activeCapability=isGemini?subjectCapability.data:(flowSubjectCapability.data??options.data?.flow_subject_reference_capability);
 const capabilityLoading=isGemini?subjectCapability.isLoading:flowSubjectCapability.isLoading;
 const [subjectReference,setSubjectReference]=useState<SubjectReferenceState>({...emptySubjectReference});
 const [referenceUploadError,setReferenceUploadError]=useState("");
 const createLock=useRef(false);
 const imageRequest=useRef<{json:string;file:File;key:string} | null>(null);
 const referenceBlocked=subjectReference.pending||!!subjectReference.error||(!!subjectReference.selection&&!canSelectSubjectReference(activeCapability));
 const isUnattended=workflow==="flow_unattended";
 const defaults=isGemini?options.data?.video_defaults?.gemini:options.data?.video_defaults?.flow;
 const generation=generationOverride??generationSettingsForNewProject(defaults?.generation_settings);
 const count=countOverride??defaults?.scene_count??2, aspect=aspectOverride??defaults?.aspect_ratio??'9:16',audio=audioOverride??defaults?.audio_policy??'clip_native';
 const seconds=isGemini?(options.data?.gemini_capabilities?.native_seconds??10):selectedSeconds??defaults?.scene_seconds??options.data?.scene_seconds??8;
 const available=isGemini?options.data?.gemini_available:options.data?.standard_available;
 const flowCaps=subjectReference.selection&&options.data?.flow_ingredients_supported!==undefined?(options.data.flow_ingredients_supported?options.data.flow_ingredients_capabilities:undefined):options.data?.capabilities;
 const ingredientsUnsupported=!isGemini&&!!subjectReference.selection&&options.data?.flow_ingredients_supported===false;
 const durations=isGemini?[options.data?.gemini_capabilities?.native_seconds??10]:flowCaps?.scene_durations??(options.data&&(!subjectReference.selection||options.data.flow_ingredients_supported===undefined)?[options.data.scene_seconds]:[]);
 const durationValid=durations.includes(seconds);
 const aspectRatios=isGemini?options.data?.gemini_capabilities?.aspect_ratios??[]:flowCaps?.aspect_ratios??["9:16","16:9"];
 const aspectValid=aspectRatios.includes(aspect);
 const supportsDraft=flowCaps?.generation_resolutions?.includes("360p")??false;
 const supportsSelectedResolution=flowCaps?.generation_resolutions?.includes(resolution)??false;
 const selectionError=ingredientsUnsupported?`Flow Ingredients is not supported by ${options.data?.flow_model??"the configured model"}.`:!isGemini&&subjectReference.selection&&flowCaps?.generation_resolutions&&!supportsSelectedResolution?`${resolution} is unavailable for ${options.data?.flow_model??"the configured Flow model"} Ingredients. Choose a supported quality; your requested resolution has been kept.`:!isGemini&&options.data&&!durationValid?`${seconds} seconds is unavailable for ${options.data.flow_model??"the configured Flow model"}${subjectReference.selection?" Ingredients":""}. Choose a supported scene length; your requested duration has been kept.`:"";
 const maxScenes=isGemini?defaults?.max_scenes??options.data?.gemini_capabilities?.max_scenes??options.data?.capabilities?.max_scene_count??4:defaults?.max_scenes??options.data?.capabilities?.max_scene_count??4;
 const counts=Array.from({length:maxScenes},(_,i)=>i+1);
 const [planner,setPlanner]=useState('colab_qwen');
 const [opening,setOpening]=useState<boolean|undefined>(undefined);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function create(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const generationError=validateGenerationSettings(generation);
  if(generationError){setError(generationError);return;}
  if(!aspectValid){setError("Choose an available aspect ratio.");return;}
  if(selectionError){setError(selectionError);return;}
  if(createLock.current||busy||referenceBlocked||!available||!topic.trim()||count<1||count>maxScenes||(!isGemini&&resolution==="360p"&&!supportsDraft))return;
  createLock.current=true;setBusy(true);setError('');setReferenceUploadError('');
  try {
   const request=isGemini?{title,idea:topic,scene_count:count,aspect_ratio:aspect,generation_settings:generation}:{...(planner!=='default'?{planning_provider:planner}:{}),preset:"standard_video",title,topic,character,generation_settings:generation,scene_count:count,aspect_ratio:aspect,scene_seconds:seconds,...(supportsSelectedResolution?{generation_resolution:resolution}:{}),audio_policy:audio,continuity_mode:subjectReference.selection?"independent":continuity,review_policy:isUnattended?"human_only":review,reference_mode:isUnattended||count>8||!!subjectReference.selection?"none":reference,opening_image_required:!isUnattended&&!subjectReference.selection&&(opening??options.data?.initial_keyframe_enabled??false)&&review!=='off'&&(count>8||reference==='none')};
   let result:{job_id:string};
   if(subjectReference.selection){
    const json=JSON.stringify(request),file=subjectReference.selection.file;
    if(imageRequest.current?.json!==json||imageRequest.current.file!==file)imageRequest.current={json,file,key:crypto.randomUUID()};
    const body=new FormData();body.append("request",json);body.append("subject_reference",file);
    result=await apiMultipart<{job_id:string}>(isGemini?"/gemini-autopilot/queue":"/scene-video-jobs",body,{headers:{"Idempotency-Key":imageRequest.current.key}});
   }else{
    result=await apiJson<{job_id:string}>(isGemini?"/gemini-autopilot/queue":"/scene-video-jobs",{method:"POST",body:request});
   }
   if(isUnattended)await apiJson("/flow-autopilot/queue",{method:"POST",body:{job_id:result.job_id}});
   navigate(`/scene-jobs/${result.job_id}`);
  }catch(cause){
   const message=cause instanceof Error?cause.message:'Could not prepare storyboard.';
   if(subjectReference.selection)setReferenceUploadError(message);else setError(message);
  }finally{createLock.current=false;setBusy(false);}
 }
 const field='mt-1 w-full rounded-lg border border-slate-300 p-3';
 return <div className="mx-auto max-w-2xl space-y-5"><div><h2 className="text-3xl font-semibold">New Video</h2><p className="mt-2 text-slate-600">{isGemini?"Gemini Autopilot: queue your idea for automatic production.":"Flow: describe your idea and choose supervised or unattended production."}</p></div><form onSubmit={event=>void create(event)} className="rounded-xl border bg-white p-4 sm:p-6"><fieldset disabled={busy} className="min-w-0 space-y-5">
 <label className="block font-medium">Production workflow<select className={field} value={workflow} onChange={e=>{setWorkflow(e.target.value);setSubjectReference({...emptySubjectReference});setReferenceUploadError("");imageRequest.current=null;setCount(undefined);setAudio(undefined);setSelectedSeconds(undefined);setResolution("720p");setGeneration(undefined);}}><option value="flow_web">Flow (supervised)</option><option value="flow_unattended">Flow Autopilot (unattended)</option><option value="gemini_web">Gemini Autopilot (automatic)</option></select></label>
 {!isGemini&&<label className="block font-medium">Storyboard planner<select aria-label="Storyboard planner" className={field} value={planner} onChange={e=>{setPlanner(e.target.value);if(e.target.value==='colab_qwen'){setReview('human_only');setReference('none');}}}><option value="colab_qwen">Colab Qwen - preferred for Flow</option><option value="default">Current configured planner</option><option value="operator_authored">Import authored storyboard JSON</option></select>{planner==='colab_qwen'&&<span className="mt-2 block text-sm font-normal">Start Flow Planner once in Colab. Requests and validated storyboards transfer automatically while synchronization is verified.</span>}</label>}
 {!isGemini&&planner==='colab_qwen'&&<ColabCreationReadiness/>}
 <label className="block font-medium">Video title <span className="text-sm font-normal text-slate-500">(optional)</span><input className={field} maxLength={80} value={title} onChange={e=>setTitle(e.target.value)}/></label>
 <label className="block font-medium">Idea / story<textarea className={field} required rows={5} value={topic} onChange={e=>setTopic(e.target.value)} placeholder="A small robot finds a glowing crystal and brings an abandoned workshop to life."/></label>
 <div className="grid gap-4 sm:grid-cols-2"><label className="block font-medium">Scene count<select className={field} value={count} onChange={e=>setCount(Number(e.target.value))}>{counts.map(n=><option key={n} value={n}>{n} {n===1?'scene':'scenes'}</option>)}</select></label><label className="block font-medium">Aspect ratio<select className={field} value={aspect} onChange={e=>setAspect(e.target.value)}>{!aspectValid&&<option value={aspect} disabled>{aspect} — {aspect==="9:16"?"Portrait":"Landscape"} (unavailable)</option>}{(isGemini?options.data?.gemini_capabilities?.aspect_ratios??[]:flowCaps?.aspect_ratios??['9:16','16:9']).map(value=><option key={value} value={value}>{value} — {value==="9:16"?"Portrait":"Landscape"}</option>)}</select></label>
 <label className="block font-medium">Scene length<select className={field} disabled={!options.data||durations.length===0} aria-label="Scene length" value={seconds} onChange={e=>setSelectedSeconds(Number(e.target.value))}>{!durationValid&&<option value={seconds} disabled>{seconds} seconds - unavailable</option>}{durations.map(n=><option key={n} value={n}>{n} seconds</option>)}</select><span className="text-xs font-normal text-slate-500">Length per scene.</span></label><label className="block font-medium">Audio<select className={field} value={audio} onChange={e=>setAudio(e.target.value)}><option value="clip_native">Native audio</option>{!isGemini&&<option value="silent">Silent</option>}</select></label></div>
 {selectionError&&<p role="alert" className="text-sm text-red-700">{selectionError}</p>}
 {!isGemini&&options.data?.flow_model&&<p className="text-sm text-slate-600">Configured Flow model: {options.data.flow_model}</p>}
 <SubjectReferenceUploader key={workflow} title={isGemini?"Subject Reference":"Subject Reference (Flow Ingredients)"} roleLabel={isGemini?"Subject Reference":"Subject Reference (Flow Ingredients)"} projectKind={isGemini?"Gemini project":"Flow project"} state={subjectReference} onChange={value=>{setSubjectReference(value);setReferenceUploadError("");if(value.selection){setContinuity("independent");setOpening(false);}}} capability={activeCapability} checking={capabilityLoading} disabled={busy} uploadError={referenceUploadError}/>
 <GenerationSettingsFields value={generation} onChange={setGeneration} sourceSeconds={seconds}/>
 {!isGemini&&<label className="block font-medium">Generation quality<select aria-label="Generation quality" className={field} value={resolution} onChange={e=>setResolution(e.target.value as GenerationResolution)}><option value="720p">Standard 720p</option><option value="360p" disabled={!supportsDraft}>Draft 360p{!supportsDraft?" — unavailable for the configured Flow model":""}</option></select><span className="mt-2 block text-sm font-normal text-slate-600">Native Flow output resolution. Draft uses less detail for experiments. Unattended production verifies the displayed credit cost in Flow before generation.</span></label>}
 <p aria-label="Effective aspect ratio" className="text-sm">Video aspect: {aspect} — {aspect==="9:16"?"Portrait":"Landscape"}</p>
 <p aria-label="Approx. video length" className="rounded bg-blue-50 p-3">Estimated assembled running time: {runningTime(count*seconds)} ({count*seconds} seconds). {count} scenes at {seconds} seconds each. <span className="mt-1 block text-xs">Up to ~{count*seconds} sec before transitions/normalization.</span></p>
 {isGemini&&<p className="text-sm">At least {count} Gemini video submissions before retries; at least {Math.ceil(count/(options.data?.gemini_submission_cap??4))} application windows with cap {options.data?.gemini_submission_cap??4}, assuming no failed attempts. Provider restrictions may require longer; no completion date is promised.</p>}
 {count>maxScenes&&<p role="alert">Scene count exceeds the current maximum of {maxScenes}.</p>}

 {!isGemini&&!isUnattended&&<details className="rounded border p-4"><summary className="cursor-pointer font-medium">Advanced settings</summary><div className="mt-4 space-y-4"><p className="text-sm text-slate-600">Flow Web automation is configured by the app. Manual Flow recovery remains available in production details.</p><label className="block"><input type="checkbox" checked={opening??options.data?.initial_keyframe_enabled??false} disabled={review==='off'||(count<=8&&reference!=='none')||!!subjectReference.selection} onChange={e=>setOpening(e.target.checked)}/> Review an opening image before the first video</label><label className="block">Character / subject direction<input className={field} value={character} onChange={e=>setCharacter(e.target.value)}/></label><label className="block">Continuity<select className={field} value={subjectReference.selection?"independent":continuity} disabled={!!subjectReference.selection} onChange={e=>{setContinuity(e.target.value);if(e.target.value==='chained_frames'){if(review==='off')setReview('ai_assisted');setReference('none');}}}><option value="chained_frames">Continue from accepted ending frames</option><option value="independent">Independent scenes</option></select></label>{!!subjectReference.selection&&<p className="rounded bg-amber-50 p-2 text-xs text-amber-800">Flow Ingredients guides character appearance across scenes and uses independent scene continuity. It cannot be combined with start-frame chaining.</p>}<label className="block">Review mode<select className={field} value={review} onChange={e=>setReview(e.target.value)}><option value="human_only">Human only - watch and decide</option><option value="ai_assisted">AI assisted · you decide</option><option disabled={planner==='colab_qwen'||continuity==='chained_frames'||!!subjectReference.selection} value="off">Off · assemble imported scenes</option></select></label><label className="block">Reference mode<select disabled={planner==='colab_qwen'||continuity==='chained_frames'||count>8||!!subjectReference.selection} className={field} value={count>8||!!subjectReference.selection?"none":reference} onChange={e=>setReference(e.target.value)}><option value="none">No separate reference image</option>{count<=8&&!subjectReference.selection&&<option value="provider_generated">Configured image provider</option>}</select></label></div></details>}
 {options.isError&&<p role="alert">{options.error.message}</p>}{options.data&&!available&&<p role="alert">{isGemini?"Gemini Autopilot is unavailable. Configure its separate browser lane.":"Standard Video is unavailable. Configure the existing Flow automation path before creating a video."}</p>}{error&&<p role="alert" className="text-red-700">{error}</p>}
 <button className={primary} disabled={busy||!aspectValid||!!selectionError||referenceBlocked||!topic.trim()||!available||count<1||count>maxScenes||(!isGemini&&resolution==="360p"&&!supportsDraft)}>{busy?'Preparing...':isGemini?'Add to Gemini Queue':isUnattended?'Add to Flow Queue':'Generate Storyboard'}</button><p className="text-xs text-slate-500">{isGemini?"Gemini progresses automatically through conformance and assembly. Creative quality remains unreviewed.":isUnattended?"Storyboard import does not authorize paid generation. Flow Autopilot still requires batch credit authorization and Resume Flow queue.":"You will review the storyboard before any video generation starts."}</p>
 </fieldset></form></div>;
}
