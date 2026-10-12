export type VideoDefaults = { scene_count: number; scene_seconds: number; aspect_ratio: string; audio_policy: string };
export type VideoSettings = { version: number; preferred_workflow: string; flow: VideoDefaults; gemini: VideoDefaults };
export type CreationOptions = { standard_available: boolean; gemini_available?: boolean; scene_seconds: number; initial_keyframe_enabled?: boolean; video_defaults?: VideoSettings; capabilities?: { aspect_ratios: string[]; scene_durations: number[]; min_scene_count: number; max_scene_count: number } };
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
