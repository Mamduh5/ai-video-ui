import { describe, expect, it } from "vitest";
import { generationSettingsForExistingProject, generationSettingsForNewProject, generationSettingsForReplannedProject, validateGenerationSettings, type GenerationSettings } from "./contracts";

const historical: GenerationSettings = { version: "generation_settings.v1", mode: "fast_performance", performance_tempo: 2, dialogue_language: "Thai" };

describe("Fast performance version boundaries", () => {
  it("selects v2 only for new Fast projects without a version, preserving the original value", () => {
    const before = JSON.stringify(historical);
    expect(generationSettingsForNewProject(historical)).toEqual({ ...historical, fast_version: "fast_performance.v3" });
    expect(generationSettingsForExistingProject(historical)).toBe(historical);
    expect(generationSettingsForReplannedProject(historical)).toEqual({ ...historical, fast_version: "fast_performance.v1" });
    expect(JSON.stringify(historical)).toBe(before);
  });

  it.each(["fast_performance.v1", "fast_performance.v2", "fast_performance.v3"] as const)("preserves explicit %s through new and historical requests", fast_version => {
    const saved = { ...historical, fast_version };
    expect(generationSettingsForNewProject(saved)).toBe(saved);
    expect(generationSettingsForExistingProject(saved)).toBe(saved);
    expect(generationSettingsForReplannedProject(saved)).toBe(saved);
    expect(validateGenerationSettings(saved)).toBe("");
  });

  it("rejects unknown Fast versions and Fast versions attached to other modes", () => {
    expect(validateGenerationSettings({ ...historical, fast_version: "fast_performance.v99" } as unknown as GenerationSettings)).not.toBe("");
    expect(validateGenerationSettings({ ...historical, mode: "dense_performance", fast_version: "fast_performance.v2" })).not.toBe("");
    expect(generationSettingsForReplannedProject()).toEqual({ version: "generation_settings.v1", mode: "standard", performance_tempo: 1 });
  });
});
