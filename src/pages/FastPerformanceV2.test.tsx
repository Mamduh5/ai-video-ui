import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { GenerationSettings } from "../features/settings/contracts";
import { apiJson } from "../lib/apiClient";
import { GenerationRevisionPanel } from "./GenerationRevisionPanel";
import { GenerationSettingsFields, GenerationSnapshot } from "./GenerationSettingsFields";
vi.mock("../lib/apiClient", async original => ({ ...await original<typeof import("../lib/apiClient")>(), apiJson: vi.fn() }));
beforeEach(() => vi.mocked(apiJson).mockReset());
afterEach(cleanup);
const historical: GenerationSettings = { version: "generation_settings.v1", mode: "fast_performance", performance_tempo: 2, dialogue_language: "Thai" };

it("describes v2 progression as requested and retains the original historical Fast snapshot", () => {
  const before = JSON.stringify(historical);
  const view = render(<GenerationSnapshot value={historical} sourceSeconds={8}/>);
  expect(screen.getByText("Fast Performance - creative tempo 2.0x - 8s source - Dialogue: Thai")).toBeVisible();
  expect(screen.queryByText(/extended story progression requested/)).toBeNull();
  view.rerender(<GenerationSnapshot value={{ ...historical, fast_version: "fast_performance.v2" }} sourceSeconds={8}/>);
  expect(screen.getByText(/8s source - extended story progression requested/)).toBeVisible();
  expect(JSON.stringify(historical)).toBe(before);
});

it("keeps v1 copy historical and explicitly selects v3 through the existing mode control", () => {
  const onChange = vi.fn();
  const view = render(<GenerationSettingsFields value={historical} onChange={onChange} sourceSeconds={8}/>);
  expect(screen.getByText(/Dense storytelling with deliberately accelerated speech/)).toBeVisible();
  view.rerender(<GenerationSettingsFields value={{ ...historical, fast_version: "fast_performance.v2" }} onChange={onChange} sourceSeconds={8}/>);
  expect(screen.getByText(/Accelerated delivery that progresses farther into the story within the same clip/)).toBeVisible();
  expect(screen.getAllByRole("option").map(option => option.getAttribute("value"))).toEqual(["dense_performance", "fast_performance", "standard", "1.5", "2", "2.5"]);
  fireEvent.change(screen.getByLabelText("Generation mode"), { target: { value: "fast_performance" } });
  expect(onChange).toHaveBeenLastCalledWith({ ...historical, fast_version: "fast_performance.v3" });
  fireEvent.change(screen.getByLabelText("Generation mode"), { target: { value: "dense_performance" } });
  expect(onChange).toHaveBeenLastCalledWith({ version: "generation_settings.v1", mode: "dense_performance", performance_tempo: 2, dialogue_language: "Thai" });
});

it.each([undefined, "fast_performance.v1", "fast_performance.v2", "fast_performance.v3"] as const)("replans historical Fast %s with an explicit compatibility version while preserving source history", async fast_version => {
  const saved = { ...historical, ...(fast_version ? { fast_version } : {}) };
  const job = { title: "Existing Fast", topic: "Father confronts his son, learns why the money was needed, and hands over the keys.", scene_seconds: 8, generation_settings: saved, scenes: [{ generation_request: { duration_seconds: 8 } }] };
  const before = JSON.stringify(job);
  vi.mocked(apiJson).mockResolvedValue({ job_id: "revision" });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><Routes><Route path="/" element={<GenerationRevisionPanel job={job}/>}/><Route path="/scene-jobs/:id" element={<p>Revision ready</p>}/></Routes></MemoryRouter></QueryClientProvider>);
  await userEvent.click(screen.getByText("Change generation mode in a new storyboard revision"));
  await userEvent.click(screen.getByRole("button", { name: "Create revised storyboard as new project" }));
  await screen.findByText("Revision ready");
  expect(apiJson).toHaveBeenCalledWith("/scene-video-jobs", expect.objectContaining({ body: expect.objectContaining({ generation_settings: { ...saved, fast_version: fast_version ?? "fast_performance.v1" } }) }));
  expect(JSON.stringify(job)).toBe(before);
});
