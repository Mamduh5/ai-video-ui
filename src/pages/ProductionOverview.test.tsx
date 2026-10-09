import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductionOverview, type Production } from "./ProductionOverview";

afterEach(() => vi.unstubAllGlobals());
const ready: Production = { mode: "sequential", status: "ready", started: false, paused: false, auto_advance_after_accept: true, scene_count: 3, accepted_count: 0, current_scene: 1, flow_submissions: 0, uncertain_submissions: 0, scenes: [1, 2, 3].map(order => ({ order, status: order === 1 ? "eligible" : "waiting", can_generate: false, can_resume_flow: false, flow_submissions: 0, uncertain_submissions: 0, attempt_count: 0 })) };
const settings = [1, 2, 3].map(order => ({ order, duration_seconds: 8, aspect_ratio: "16:9" }));
function show(production: Production = ready) { const changed = vi.fn(); return { ...render(<ProductionOverview jobId="job" production={production} settings={settings} onChanged={changed} />), changed }; }
describe("production overview", () => {
  it("displays the credit boundary and starts only by deliberate action", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response("{}")); vi.stubGlobal("fetch", fetch); const view = show();
    expect(screen.getByText("0 / 3 scenes accepted")).toBeInTheDocument(); expect(screen.getByText(/Scene 3: 8 seconds, 16:9/)).toBeInTheDocument(); expect(screen.getByText(/can consume subscription credits/)).toBeInTheDocument(); expect(fetch).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Start Production" })); await waitFor(() => expect(view.changed).toHaveBeenCalledOnce());
    expect(fetch).toHaveBeenCalledTimes(1); expect(fetch.mock.calls[0][0]).toContain("/production/start");
  });
  it("shows the backend current scene, pauses, and reloads without mutation", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response("{}")); vi.stubGlobal("fetch", fetch);
    const active = { ...ready, started: true, status: "reviewing", accepted_count: 1, current_scene: 2, flow_submissions: 2, scenes: ready.scenes.map(s => ({ ...s, status: s.order === 1 ? "accepted" : s.order === 2 ? "ai_review_running" : "waiting" })) };
    const view = show(active); expect(screen.getByText("1 / 3 scenes accepted")).toBeInTheDocument(); expect(screen.getByRole("status")).toHaveTextContent("Current scene: 2");
    await userEvent.click(screen.getByRole("button", { name: "Pause Production" })); expect(fetch.mock.calls[0][0]).toContain("/production/pause");
    view.unmount(); fetch.mockClear(); show({ ...active, paused: true, status: "paused" }); expect(fetch).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Resume Production" })); expect(fetch.mock.calls[0][0]).toContain("/production/resume");
  });
  it("reports attention and completed state without starting another run", () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch); const view = show({ ...ready, started: true, status: "attention_required" }); expect(screen.getByRole("status")).toHaveTextContent("attention required");
    view.rerender(<ProductionOverview jobId="job" production={{ ...ready, started: true, status: "completed", accepted_count: 3, current_scene: 0 }} settings={settings} onChanged={vi.fn()} />);
    expect(screen.getByText("3 / 3 scenes accepted")).toBeInTheDocument(); expect(screen.queryByRole("button", { name: /Production/ })).not.toBeInTheDocument(); expect(fetch).not.toHaveBeenCalled();
  });
  it("disables mutation while its request is pending", async () => {
    let resolve!: (r: Response) => void; vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(r => { resolve = r; }))); show();
    const button = screen.getByRole("button", { name: "Start Production" }); await userEvent.click(button); expect(button).toBeDisabled(); resolve(new Response("{}")); await waitFor(() => expect(button).toBeEnabled());
  });
});
