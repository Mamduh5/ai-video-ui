import {render,screen,fireEvent,waitFor,cleanup} from "@testing-library/react";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {MemoryRouter} from "react-router-dom";
import {afterEach,it,expect,vi} from "vitest";
import {FlowAutopilotPage} from "./FlowAutopilotPage";
import {apiJson} from "../lib/apiClient";
vi.mock("../lib/apiClient",()=>({apiJson:vi.fn(),buildApiUrl:(p:string)=>p}));
afterEach(()=>{cleanup();vi.clearAllMocks()});
function showPage(){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter><FlowAutopilotPage/></MemoryRouter></QueryClientProvider>);}
it("shows durable reservations, FIFO progress and pause without scene approvals",async()=>{
 vi.mocked(apiJson).mockResolvedValue({scheduler:{paused:false,max_attempts:40,reservations:["run"],block_reason:"Credits waiting"},projects:[{id:"first",title:"RAINBACK",status:"awaiting_external_generation",production:{accepted_count:1,scene_count:2,status:"generating"},video_url:"/final"}]});
 render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter><FlowAutopilotPage/></MemoryRouter></QueryClientProvider>);
 expect(await screen.findByText("1 historical generation reservations preserved")).toBeInTheDocument();expect(screen.queryByRole("button",{name:/Accept scene/i})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Pause Flow queue"}));await waitFor(()=>expect(apiJson).toHaveBeenCalledWith("/flow-autopilot/control/pause",{method:"POST"}));
});

it("authorizes only explicitly selected projects with a finite budget and no client balance",async()=>{
 vi.mocked(apiJson).mockResolvedValue({scheduler:{paused:true,reservations:Array(45).fill("historic"),batches:[]},projects:[{id:"new",title:"Thai pilot",status:"awaiting_external_generation",production:{accepted_count:0,scene_count:3,status:"queued",flow_submissions:0,uncertain_submissions:0},video_url:"/final"},{id:"unrelated",title:"Unrelated project",status:"awaiting_external_generation",production:{accepted_count:0,scene_count:3,status:"queued",flow_submissions:0,uncertain_submissions:0},video_url:"/other"}]});
 showPage();
 expect(await screen.findByText("45 historical generation reservations preserved")).toBeVisible();
 expect(screen.getByRole("button",{name:"Resume Flow queue"})).toBeDisabled();
 expect(screen.getByRole("button",{name:"Verify Flow and authorize batch"})).toBeDisabled();
 fireEvent.change(screen.getByLabelText("Batch name"),{target:{value:"Thai dramas"}});
 fireEvent.change(screen.getByLabelText("Credit budget"),{target:{value:"185"}});
 fireEvent.click(screen.getByRole("checkbox",{name:"Thai pilot"}));
 expect(screen.getByRole("checkbox",{name:"Unrelated project"})).not.toBeChecked();
 fireEvent.click(screen.getByRole("button",{name:"Verify Flow and authorize batch"}));
 await waitFor(()=>expect(apiJson).toHaveBeenCalledWith("/flow-autopilot/batches",{method:"POST",body:{name:"Thai dramas",job_ids:["new"],credits:185,speech_pilot:false}}));
 expect(vi.mocked(apiJson).mock.calls.some(([path])=>path==="/flow-autopilot/control/resume")).toBe(false);
});
