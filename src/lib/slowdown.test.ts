import { describe, expect, it } from "vitest";
import { slowdownDuration, playbackRates, validSlowdownRate } from "./slowdown";
import { generationSettingsForExistingProject, generationSettingsForNewProject, validateGenerationSettings, type GenerationSettings } from "../features/settings/contracts";
describe("precise slowdown and creative tempo contracts", () => {
  it("keeps exact two thirds and slow-only finite playback rates", () => {
    expect(playbackRates).toEqual([1, 2 / 3, 0.5, 0.4]);
    expect([1, 2 / 3, 0.5, 0.4].map(rate => slowdownDuration(8, rate))).toEqual([8, 12, 16, 20]);
    for (const rate of [NaN, Infinity, -1, 0, 0.3999, 1.0001, 1.5, 2, 2.5]) { expect(validSlowdownRate(rate)).toBe(false); expect(() => slowdownDuration(8, rate)).toThrow(); }
    expect(slowdownDuration(7.61, 0.5) + slowdownDuration(8.23, 2 / 3)).toBeCloseTo(27.565);
  });
  it("validates Standard, version and Dense/Fast presets independently from playback", () => {
    expect(validateGenerationSettings()).toBe("");
    expect(validateGenerationSettings({ version: "generation_settings.v1", mode: "standard", performance_tempo: 1 })).toBe("");
    for (const mode of ["dense_performance", "fast_performance"] as const) {
      for (const tempo of [1.5, 2, 2.5]) expect(validateGenerationSettings({ version: "generation_settings.v1", mode, performance_tempo: tempo } as GenerationSettings)).toBe("");
      for (const tempo of [1, 0, -1, 1.75, 3, Infinity, NaN]) expect(validateGenerationSettings({ version: "generation_settings.v1", mode, performance_tempo: tempo } as GenerationSettings)).not.toBe("");
    }
    for (const value of [{ mode: "standard", performance_tempo: 2 }, { mode: "dense_performance", performance_tempo: 1 }, { mode: "dense_performance", performance_tempo: Infinity }, { mode: "dense_performance", performance_tempo: NaN }, { mode: "other", performance_tempo: 2 }, { version: "other", mode: "dense_performance", performance_tempo: 2 }]) expect(validateGenerationSettings({ version: "generation_settings.v1", ...value } as GenerationSettings)).not.toBe("");
  });
});


it("applies missing-mode Dense defaults only at the explicit new-project boundary", () => {
 const expected={version:"generation_settings.v1",mode:"dense_performance",performance_tempo:2};
 expect(generationSettingsForNewProject()).toEqual(expected);
 expect(generationSettingsForNewProject({} as GenerationSettings)).toEqual(expected);
 expect(generationSettingsForNewProject({mode:"",dialogue_language:"Thai"} as unknown as GenerationSettings)).toEqual({...expected,dialogue_language:"Thai"});
 for(const mode of ["standard","dense_performance"] as const) {
  const saved:GenerationSettings={version:"generation_settings.v1",mode,performance_tempo:mode === "standard" ? 1 : 1.5};
  expect(generationSettingsForNewProject(saved)).toBe(saved);
 }
 expect(validateGenerationSettings()).toBe("");
});


it("decodes missing historical modes as Standard without rewriting explicit saved settings", () => {
 const standard={version:"generation_settings.v1",mode:"standard",performance_tempo:1};
 for (const raw of [undefined, {}, {mode:""}]) expect(generationSettingsForExistingProject(raw as GenerationSettings)).toEqual(standard);
 expect(generationSettingsForExistingProject({dialogue_language:"Thai"} as GenerationSettings)).toEqual({...standard,dialogue_language:"Thai"});
 for (const mode of ["standard","dense_performance","fast_performance"] as const) for (const tempo of mode === "standard" ? [1] as const : [1.5,2,2.5] as const) {
  const saved:GenerationSettings={version:"generation_settings.v1",mode,performance_tempo:tempo,dialogue_language:"Thai"}; const before=JSON.stringify(saved);
  expect(generationSettingsForExistingProject(saved)).toBe(saved); expect(JSON.stringify(saved)).toBe(before);
 }
});
