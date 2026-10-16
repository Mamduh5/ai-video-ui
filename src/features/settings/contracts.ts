export type GenerationSettings = { version: "generation_settings.v1"; mode: "standard" | "dense_performance" | "fast_performance"; performance_tempo: 1 | 1.5 | 2 | 2.5; dialogue_language?: string };
// Apply only at new-project/default-settings boundaries; historical decoding stays Standard.
export function generationSettingsForNewProject(value?: GenerationSettings): GenerationSettings {
 return value?.mode ? value : { ...value, version: "generation_settings.v1", mode: "dense_performance", performance_tempo: 2 };
}
// Historical records without an explicit mode retain Standard when displayed or revised.
export function generationSettingsForExistingProject(value?: GenerationSettings): GenerationSettings {
 return value?.mode ? value : { ...value, version: "generation_settings.v1", mode: "standard", performance_tempo: 1 };
}
export function validateGenerationSettings(value?: GenerationSettings): string {
 if (!value) return "";
 if (value.version !== "generation_settings.v1" || !["standard", "dense_performance", "fast_performance"].includes(value.mode)) return "Choose a supported generation mode.";
 if (value.mode === "standard" ? value.performance_tempo !== 1 : ![1.5, 2, 2.5].includes(value.performance_tempo)) return "Choose a supported requested performance tempo.";
 if (value.dialogue_language && value.dialogue_language.length > 80) return "Dialogue language must be 80 characters or fewer.";
 return "";
}
export type VideoDefaults = { generation_settings?: GenerationSettings; max_scenes?: number; scene_count: number; scene_seconds: number; aspect_ratio: string; audio_policy: string };
export type VideoSettings = { version: number; preferred_workflow: string; flow: VideoDefaults; gemini: VideoDefaults };
export type GenerationResolution = "360p" | "720p";
export function flowQualityLabel(resolution?: GenerationResolution) { return resolution === "360p" ? "Draft 360p" : "Standard 720p"; }
export type CreationOptions = { hard_scene_limit?: number; gemini_submission_cap?: number; gemini_capabilities?: {max_scenes:number; native_seconds:number; aspect_ratios:string[]}; standard_available: boolean; gemini_available?: boolean; scene_seconds: number; initial_keyframe_enabled?: boolean; video_defaults?: VideoSettings; capabilities?: { aspect_ratios: string[]; scene_durations: number[]; generation_resolutions?: GenerationResolution[]; min_scene_count: number; max_scene_count: number } };
export type StorageSettings = { version?: number; automatic: boolean; level: string; cleanup: string; warning_bytes: number; critical_bytes: number; reserve_bytes: number };
export const field = "mt-1 block w-full rounded-lg border border-slate-300 p-3";
export const archiveLevels = { final_only: "Final Only", restorable: "Restorable", full_history: "Full History" };
export const retentionPolicies = { keep_local: "Keep local files", intermediates: "Remove verified intermediates", restorable_media: "Remove verified scenes and frames", cloud_only: "Cloud archive only (remove final video too)" };

// Decimal GiB must map to an exact integer byte count. Never silently round.
export function gibToBytes(value: string): number {
 if (!/^\d+(?:\.\d{1,10})?$/.test(value)) throw new Error("Enter a non-negative number in GiB (up to 10 decimal places).");
 const [whole, fraction = ""] = value.split(".");
 const denominator = 10n ** BigInt(fraction.length);
 const numerator = (BigInt(whole) * denominator + BigInt(fraction || "0")) * 1073741824n;
 if (numerator % denominator !== 0n) throw new Error("This GiB value does not represent an exact whole number of bytes. Use a value such as 1, 1.5 or 1.25.");
 const bytes = numerator / denominator;
 if (bytes > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Disk threshold is too large.");
 return Number(bytes);
}
export function validateStorage(s: StorageSettings): string {
 if (![s.warning_bytes, s.critical_bytes, s.reserve_bytes].every(n => Number.isSafeInteger(n) && n >= 0)) return "Disk thresholds must be non-negative exact byte values.";
 if (s.critical_bytes <= 0) return "Critical free space must be greater than zero.";
 if (s.reserve_bytes <= 0 || s.reserve_bytes > s.critical_bytes) return "Working reserve must be greater than zero and no larger than critical free space.";
 const floor = s.critical_bytes + s.reserve_bytes;
 if (!Number.isSafeInteger(floor)) return "Effective generation floor is too large.";
 if (s.warning_bytes <= floor) return "Warning free space must be greater than critical plus working reserve.";
 if (!(s.level in archiveLevels) || !(s.cleanup in retentionPolicies)) return "Choose a supported archive level and retention policy.";
 return "";
}

export function runningTime(seconds: number): string { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
export type QuotaTiming = { provider_reset_at?: string; provider_date_explicit?: boolean; manual_reset_at?: string; manual_recorded_at?: string; application_fallback_at?: string; provider_fallback_at?: string; effective_at?: string; source: string; manual_status: string; remaining_blockers: string[] };
export type QuotaConfig = { version: number; observed_reset_at?: string | null };
export function quotaSourceLabel(source?: string) {return ({provider_reported:"Provider-reported dated reset",provider_clock_inferred:"Provider clock (date inferred; waiting evidence only)",user_observed:"User-observed reset (not provider-verified)",application_fallback:"Application fallback estimate",fallback_estimate:"Fallback estimate",none:"No scheduled wait"} as Record<string,string>)[source??"none"]??"Estimated timing";}
export function bangkokResetInput(utc?: string | null): string { if (!utc) return ""; return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(utc)).replace(" ", "T"); }
export function bangkokResetUTC(value: string): string | null {if (!value) return null;if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Enter a complete date and time in Bangkok.");const date=new Date(`${value}:00+07:00`);if (!Number.isFinite(date.getTime()) || bangkokResetInput(date.toISOString())!==value) throw new Error("Enter a valid Bangkok date and time.");return date.toISOString();}
