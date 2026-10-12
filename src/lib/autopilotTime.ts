export function bangkokTime(value: string) {
  return new Date(value).toLocaleString("en-GB", { timeZone: "Asia/Bangkok", hour12: false }) + " Bangkok";
}
