import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { apiJson } from "../lib/apiClient";
import { GenerationSettingsFields, GenerationSnapshot } from "./GenerationSettingsFields";
import { SceneVideoPage } from "./SceneVideoPage";
vi.mock("../lib/apiClient", async original => ({ ...await original<typeof import("../lib/apiClient")>(), apiJson: vi.fn() }));
afterEach(cleanup);
it("describes v3 native speech reference while retaining the saved tempo", () => {
 const saved = { version: "generation_settings.v1", mode: "fast_performance", fast_version: "fast_performance.v3", performance_tempo: 2.5, dialogue_language: "Thai" } as const;
 render(<><GenerationSettingsFields value={saved} onChange={vi.fn()} sourceSeconds={8}/><GenerationSnapshot value={saved} sourceSeconds={8}/></>);
 expect(screen.getByText(/approximately 1.5x creative reference/)).toBeVisible();
 expect(screen.getByText(/creative tempo 2.5x/)).toBeVisible();
});
it("shows Fast advisories and requests a better timing plan without starting generation", async () => {
 vi.mocked(apiJson).mockReset();
 vi.mocked(apiJson).mockResolvedValue({id:"v3", title:"Fast review", status:"awaiting_external_generation", current_step:"awaiting_external_generation", generation_provider:"flow_web", scenes:[{order:1,status:"waiting",generation_request:{story_beat:"Shop to vehicle",visual_description:"Father and son",motion_prompt:"Exact schedule",character_continuity:"Same family",environment_continuity:"Shop",aspect_ratio:"9:16",duration_seconds:8,generation_attempt:1,fast_plan_diagnostics:["speech_density_request_better_plan","prop_ownership_conflict"]}}]});
 render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter initialEntries={["/scene-jobs/v3"]}><Routes><Route path="/scene-jobs/:jobId" element={<SceneVideoPage/>}/></Routes></MemoryRouter></QueryClientProvider>);
 expect(await screen.findByText(/If speech cannot fit, revise the plan/)).toBeVisible();
 expect(screen.getByText("speech density request better plan")).toBeVisible();
 expect(screen.getByText("prop ownership conflict")).toBeVisible();
 expect(vi.mocked(apiJson).mock.calls.every(([,options]) => !options || options.method !== "POST")).toBe(true);
});
