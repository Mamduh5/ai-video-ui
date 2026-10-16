export const playbackRates = [1, 2 / 3, 0.5, 0.4] as const;
export function validSlowdownRate(rate: number): boolean { return Number.isFinite(rate) && rate >= 0.4 && rate <= 1; }
export function slowdownDuration(seconds: number, rate: number): number {
  if (!Number.isFinite(seconds) || seconds < 0 || !validSlowdownRate(rate)) throw new Error("Use a finite source duration and playback rate from 0.4 through 1.0.");
  return seconds / rate;
}
export function rateLabel(rate: number): string { return rate === 1 ? "Original · 1.0x" : rate === 2 / 3 ? "Slower · approximately 0.67x (2/3)" : `Slower · ${rate.toFixed(1)}x`; }
export function secondsLabel(seconds: number): string { return `${seconds.toFixed(2).replace(/\.00$/, "")} seconds`; }
