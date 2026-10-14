import {render,screen,fireEvent,waitFor,cleanup} from "@testing-library/react";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {MemoryRouter} from "react-router-dom";
import {afterEach,it,expect,vi} from "vitest";
import {FlowAutopilotPage} from "./FlowAutopilotPage";
import {apiJson} from "../lib/apiClient";
vi.mock("../lib/apiClient",()=>({apiJson:vi.fn(),buildApiUrl:(p:string)=>p}));
afterEach(()=>{cleanup();vi.clearAllMocks()});
it("shows durable reservations, FIFO progress and pause without scene approvals",async()=>{
 vi.mocked(apiJson).mockResolvedValue({scheduler:{paused:false,max_attempts:40,reservations:["run"],block_reason:"Credits waiting"},projects:[{id:"first",title:"RAINBACK",status:"awaiting_external_generation",production:{accepted_count:1,scene_count:2,status:"generating"},video_url:"/final"}]});
 render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter><FlowAutopilotPage/></MemoryRouter></QueryClientProvider>);
 expect(await screen.findByText("1 / 40 generation authorizations reserved")).toBeInTheDocument();expect(screen.queryByRole("button",{name:/Accept scene/i})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Pause Flow queue"}));await waitFor(()=>expect(apiJson).toHaveBeenCalledWith("/flow-autopilot/control/pause",{method:"POST"}));
});
