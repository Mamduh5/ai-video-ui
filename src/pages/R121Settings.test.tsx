import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apiJson } from '../lib/apiClient';
import { SettingsPage } from './SettingsPage';
import { CreateSceneVideoPage } from './NewVideoPage';
import { GeminiQuotaForm } from '../features/settings/GeminiQuotaForm';
import { bangkokResetInput, bangkokResetUTC, runningTime } from '../features/settings/contracts';
vi.mock('../lib/apiClient',()=>({apiJson:vi.fn()}));
beforeEach(()=>vi.mocked(apiJson).mockReset());afterEach(cleanup);
const defaults={version:7,preferred_workflow:'flow_web',flow:{max_scenes:20,scene_count:2,scene_seconds:8,aspect_ratio:'16:9',audio_policy:'clip_native'},gemini:{max_scenes:12,scene_count:3,scene_seconds:10,aspect_ratio:'16:9',audio_policy:'clip_native'}};
const options={standard_available:true,gemini_available:true,hard_scene_limit:20,gemini_submission_cap:4,scene_seconds:8,video_defaults:defaults,gemini_capabilities:{max_scenes:12,native_seconds:10,aspect_ratios:['16:9']},capabilities:{scene_durations:[4,6,8,10],aspect_ratios:['16:9','9:16'],min_scene_count:1,max_scene_count:20}};
function mount(node:React.ReactNode){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>)}
function reads(){vi.mocked(apiJson).mockImplementation(async path=>({'/settings/video':defaults,'/scene-video-options':options,'/settings/gemini':{available:true,config:{version:0,enabled:true,configured_submission_cap:4,planning_timeout_seconds:480,planning_max_attempts:3},status:{submissions_this_window:4,eligibility_estimated:true,window_hours:5}},'/storage':{settings:{automatic:true,level:'restorable',cleanup:'keep_local',warning_bytes:5*1024**3,critical_bytes:2*1024**3,reserve_bytes:1024**3},local:[]},'/settings/system':{}}[path]))}
it('separates provider maxima from preserved defaults and rejects invalid maxima',async()=>{
 reads();mount(<SettingsPage/>);const max=await screen.findByLabelText('Maximum scenes allowed');expect(max).toHaveValue(20);expect(screen.getByLabelText('Default scene count')).toHaveValue('2');
 fireEvent.change(max,{target:{value:'21'}});expect(screen.getByText(/Maximum scenes must be a whole number/)).toBeVisible();expect(within(screen.getByRole('form',{name:'General / Video Defaults'})).getByRole('button',{name:'Save Changes'})).toBeDisabled();
 fireEvent.change(max,{target:{value:'1'}});expect(screen.getByText(/Default scene count cannot exceed/)).toBeVisible();fireEvent.click(within(screen.getByRole('form',{name:'General / Video Defaults'})).getByRole('button',{name:'Cancel / Revert'}));
 fireEvent.change(screen.getByLabelText('Preferred workflow'),{target:{value:'gemini_web'}});expect(max).toHaveValue(12);expect(screen.getByLabelText('Default scene count')).toHaveValue('3');expect(vi.mocked(apiJson).mock.calls.every(([,init])=>!init?.method)).toBe(true);
});
it('New Video obtains 1 through 20 from backend and previews 2:40 and five Gemini windows',async()=>{
 const all={...options,video_defaults:{...defaults,gemini:{...defaults.gemini,max_scenes:20}}};vi.mocked(apiJson).mockResolvedValue(all);mount(<CreateSceneVideoPage/>);const count=await screen.findByLabelText('Scene count');await waitFor(()=>expect(within(count).getAllByRole('option')).toHaveLength(20));expect(within(count).queryByRole('option',{name:'21 scenes'})).toBeNull();
 fireEvent.change(count,{target:{value:'20'}});expect(screen.getByText(/Estimated assembled running time: 2:40/)).toBeVisible();fireEvent.change(screen.getByLabelText('Production workflow'),{target:{value:'gemini_web'}});fireEvent.change(count,{target:{value:'20'}});expect(screen.getByText(/Estimated assembled running time: 3:20/)).toBeVisible();expect(screen.getByText(/At least 20 Gemini video submissions/)).toHaveTextContent('at least 5 application windows with cap 4');
});
it('full Bangkok datetime input saves UTC user evidence and clear requires save',async()=>{
 const save=vi.fn(async()=>undefined);const timing={source:'user_observed',manual_status:'user_observed',manual_reset_at:'2026-10-12T07:18:00Z',effective_at:'2026-10-12T07:18:00Z',remaining_blockers:['weekly_limit','local_storage_critical']};render(<GeminiQuotaForm saved={{version:3,observed_reset_at:null}} timing={timing} onSave={save} onReload={async()=>undefined}/>);
 const input=screen.getByLabelText('Observed allowance reset date and time (Asia/Bangkok)');fireEvent.input(input,{target:{value:'2026-10-12T14:18'}});expect(screen.getByRole('button',{name:'Clear observed reset'})).toBeEnabled();fireEvent.click(screen.getByRole('button',{name:'Save Changes'}));await waitFor(()=>expect(save).toHaveBeenCalledWith({version:3,observed_reset_at:'2026-10-12T07:18:00.000Z'}));expect(screen.getByText(/Selected source: User-observed reset/)).toHaveTextContent('not provider-verified');expect(screen.getByText(/Remaining restrictions/)).toHaveTextContent('weekly limit, local storage critical');
 fireEvent.input(input,{target:{value:'2026-10-12T14:18'}});fireEvent.click(screen.getByRole('button',{name:'Clear observed reset'}));expect(save).toHaveBeenCalledTimes(1);fireEvent.click(screen.getByRole('button',{name:'Save Changes'}));await waitFor(()=>expect(save).toHaveBeenLastCalledWith({version:3,observed_reset_at:null}));
});
it('converts Bangkok date and time and rejects ambiguous or impossible dates',()=>{expect(bangkokResetUTC('2026-10-12T14:18')).toBe('2026-10-12T07:18:00.000Z');expect(bangkokResetInput('2026-10-12T07:18:00Z')).toBe('2026-10-12T14:18');for(const invalid of ['14:18','2026-02-30T14:18','2026-10-12T24:19'])expect(()=>bangkokResetUTC(invalid)).toThrow();expect(runningTime(200)).toBe('3:20');expect(runningTime(160)).toBe('2:40');});
