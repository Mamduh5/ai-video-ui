import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HandoffPanel, TransitionComparison } from "./ContinuityPanel";
import { apiJson } from "../lib/apiClient";
vi.mock("../lib/apiClient",()=>({apiJson:vi.fn(),buildApiUrl:(url:string)=>url}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
describe("continuity evidence",()=>{
  it("shows actual handoff and current opening alongside story state",()=>{
    render(<TransitionComparison previousUrl="/handoff.png" openingUrl="/opening.jpg" previousExit="Inside workshop" currentEntry="Inside workshop" openingSeconds={0.5}/>);
    expect(screen.getByAltText("Previous accepted handoff")).toHaveAttribute("src","/handoff.png");expect(screen.getByAltText("Current scene opening")).toHaveAttribute("src","/opening.jpg");expect(screen.getByText("Starts: Inside workshop")).toBeInTheDocument();
  });
  it("persists a lightweight override and Continue without accepting another scene",async()=>{
    vi.mocked(apiJson).mockResolvedValue({});const changed=vi.fn();render(<HandoffPanel jobId="job" order={1} attempt={2} frames={[{index:4,timestamp_seconds:7.2,object_key:"frame.png",sha256:"hash"}]} selection={{frame_index:4,confirmed:false}} locked={false} onChanged={changed}/>);
    fireEvent.click(screen.getByRole("button",{name:/Handoff at/}));await waitFor(()=>expect(changed).toHaveBeenCalledOnce());expect(apiJson).toHaveBeenCalledWith("/scene-video-jobs/job/scenes/1/handoff",{method:"POST",body:{frame:4,continue:false}});
    fireEvent.click(screen.getByRole("button",{name:"Continue with selected frame"}));await waitFor(()=>expect(apiJson).toHaveBeenCalledWith("/scene-video-jobs/job/scenes/1/handoff",{method:"POST",body:{frame:4,continue:true}}));
  });
});
