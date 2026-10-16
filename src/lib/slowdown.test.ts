import { describe, expect, it } from "vitest";
import { slowdownDuration, playbackRates, validSlowdownRate } from "./slowdown";
import { validateGenerationSettings, type GenerationSettings } from "../features/settings/contracts";
describe("precise slowdown and creative tempo contracts", () => {
  it("keeps exact two thirds and slow-only finite playback rates", () => {
    expect(playbackRates).toEqual([1, 2 / 3, 0.5, 0.4]);
    expect([1, 2 / 3, 0.5, 0.4].map(rate => slowdownDuration(8, rate))).toEqual([8, 12, 16, 20]);
    for (const rate of [NaN, Infinity, -1, 0, 0.3999, 1.0001, 1.5, 2, 2.5]) { expect(validSlowdownRate(rate)).toBe(false); expect(() => slowdownDuration(8, rate)).toThrow(); }
    expect(slowdownDuration(7.61, 0.5) + slowdownDuration(8.23, 2 / 3)).toBeCloseTo(27.565);
  });
  it("validates Standard, version and dense presets independently from playback", () => {
    expect(validateGenerationSettings()).toBe("");
    expect(validateGenerationSettings({ version: "generation_settings.v1", mode: "standard", performance_tempo: 1 })).toBe("");
    for (const tempo of [1.5, 2, 2.5]) expect(validateGenerationSettings({ version: "generation_settings.v1", mode: "dense_performance", performance_tempo: tempo } as GenerationSettings)).toBe("");
    for (const value of [{ mode: "standard", performance_tempo: 2 }, { mode: "dense_performance", performance_tempo: 1 }, { mode: "dense_performance", performance_tempo: Infinity }, { mode: "dense_performance", performance_tempo: NaN }, { mode: "other", performance_tempo: 2 }, { version: "other", mode: "dense_performance", performance_tempo: 2 }]) expect(validateGenerationSettings({ version: "generation_settings.v1", ...value } as GenerationSettings)).not.toBe("");
  });
});
