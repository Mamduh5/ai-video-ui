import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apiJson } from '../lib/apiClient';
import { CreateSceneVideoPage } from './NewVideoPage';
import { GeminiAutopilotPage } from './GeminiAutopilotPage';
vi.mock('../lib/apiClient',()=>({apiJson:vi.fn()}));
beforeEach(()=>vi.mocked(apiJson).mockReset());afterEach(cleanup);
const defaults={version:1,preferred_workflow:'flow_web',flow:{max_scenes:20,scene_count:2,scene_seconds:8,aspect_ratio:'9:16',audio_policy:'clip_native'},gemini:{max_scenes:20,scene_count:2,scene_seconds:10,aspect_ratio:'9:16',audio_policy:'clip_native'}};
const options={video_defaults:defaults,standard_available:true,gemini_available:true,scene_seconds:8,gemini_capabilities:{aspect_ratios:['9:16','16:9'],native_seconds:10,max_scenes:20},capabilities:{aspect_ratios:['9:16','16:9'],scene_durations:[4,6,8,10],min_scene_count:1,max_scene_count:20}};
function reads(data=options){vi.mocked(apiJson).mockImplementation(async(path,init)=>init?.method?{job_id:'fixture'}:path==='/scene-video-options'?data:path==='/gemini-autopilot'?{available:true,server_now:'2026-10-20T08:00:00Z',capabilities:data.gemini_capabilities,scheduler:{enabled:false,configured_submission_cap:4,submissions_this_window:0,queue:[]}}:path==='/colab/readiness'?{ready:false}:{});}
function show(workflow:string){render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter initialEntries={[`/videos/new?workflow=${workflow}`]}><Routes><Route path='/videos/new' element={<CreateSceneVideoPage/>}/><Route path='/gemini-autopilot' element={<GeminiAutopilotPage/>}/></Routes></MemoryRouter></QueryClientProvider>);}
for(const workflow of ['flow_web','flow_unattended','gemini_web'])for(const landscape of [false,true])it(`${workflow} defaults portrait and permits deliberate landscape (${landscape})`,async()=>{
 reads();show(workflow);await waitFor(()=>expect(screen.getByLabelText('Aspect ratio')).toHaveValue('9:16'));
 expect(await screen.findByRole('option',{name:'9:16 — Portrait'})).toBeVisible();expect(screen.getByRole('option',{name:'16:9 — Landscape'})).toBeVisible();
 if(landscape)fireEvent.change(screen.getByLabelText('Aspect ratio'),{target:{value:'16:9'}});
 const aspect=landscape?'16:9':'9:16';expect(screen.getByLabelText('Effective aspect ratio')).toHaveTextContent(aspect);
 if(workflow!=='gemini_web')fireEvent.change(screen.getByLabelText('Storyboard planner'),{target:{value:'default'}});
 fireEvent.change(screen.getByLabelText('Idea / story'),{target:{value:'Robot repairs a clock'}});
 fireEvent.click(screen.getByRole('button',{name:workflow==='gemini_web'?'Add to Gemini Queue':workflow==='flow_unattended'?'Add to Flow Queue':'Generate Storyboard'}));
 await waitFor(()=>expect(apiJson).toHaveBeenCalledWith(workflow==='gemini_web'?'/gemini-autopilot/queue':'/scene-video-jobs',expect.objectContaining({method:'POST',body:expect.objectContaining({aspect_ratio:aspect})})));
 if(workflow==='flow_unattended')await waitFor(()=>expect(apiJson).toHaveBeenCalledWith('/flow-autopilot/queue',{method:'POST',body:{job_id:'fixture'}}));
});
it('uses provider defaults until an intentional aspect selection, then retains it across workflows',async()=>{
 reads({...options,video_defaults:{...defaults,gemini:{...defaults.gemini,aspect_ratio:'16:9'}}});show('flow_web');await waitFor(()=>expect(screen.getByLabelText('Aspect ratio')).toHaveValue('9:16'));
 fireEvent.change(screen.getByLabelText('Production workflow'),{target:{value:'gemini_web'}});expect(screen.getByLabelText('Aspect ratio')).toHaveValue('16:9');
 fireEvent.change(screen.getByLabelText('Aspect ratio'),{target:{value:'9:16'}});fireEvent.change(screen.getByLabelText('Production workflow'),{target:{value:'flow_unattended'}});fireEvent.change(screen.getByLabelText('Production workflow'),{target:{value:'gemini_web'}});expect(screen.getByLabelText('Aspect ratio')).toHaveValue('9:16');
});
it('dashboard Queue Video opens the same portrait-default form',async()=>{
 reads();render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter initialEntries={['/gemini-autopilot']}><Routes><Route path='/gemini-autopilot' element={<GeminiAutopilotPage/>}/><Route path='/videos/new' element={<CreateSceneVideoPage/>}/></Routes></MemoryRouter></QueryClientProvider>);
 fireEvent.click(await screen.findByRole('link',{name:'+ Queue Video'}));await waitFor(()=>expect(screen.getByLabelText('Aspect ratio')).toHaveValue('9:16'));expect(screen.getByLabelText('Production workflow')).toHaveValue('gemini_web');
});
