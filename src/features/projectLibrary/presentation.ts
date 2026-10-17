import type { ProjectLibrarySort, ProjectProvider, ProjectStatus } from "./types";

export const providers: [ProjectProvider, string][] = [
  ["flow_web", "Flow"], ["gemini_web", "Gemini"], ["manual", "Manual"],
];
export const statuses: [ProjectStatus, string][] = [
  ["pending", "Pending"], ["running", "Running"], ["completed", "Completed (all review types)"],
  ["failed", "Failed"], ["awaiting_external_generation", "Awaiting generation"],
  ["awaiting_review", "Awaiting review"], ["awaiting_human_decision", "Awaiting your decision"],
  ["conformance_attention_required", "Conformance needs attention"],
];
export const sorts: [ProjectLibrarySort, string][] = [
  ["recent", "Last updated"], ["created", "Newest created"], ["name", "Name (A–Z)"],
];

export const locationKey = "videoStudio.library.location";
const scrollKey = "videoStudio.library.scroll";
const viewKey = "videoStudio.library.view";

// Storage is an enhancement; a full/blocked browser store must not break browsing.
export function preferredView() {
  try { return localStorage.getItem(viewKey) === "grid" ? "grid" : "list"; }
  catch { return "list"; }
}
export function saveView(view: string) {
  try { localStorage.setItem(viewKey, view); } catch { /* optional preference */ }
}
export function rememberLocation(href: string) {
  try { sessionStorage.setItem(locationKey, href); } catch { /* optional context */ }
}
export function libraryHref() {
  try {
    const value = sessionStorage.getItem(locationKey);
    if (value && /^\/(?:videos)?(?:\?|$)/.test(value)) return value;
  } catch { /* optional context */ }
  return "/";
}
function positions(): Record<string, number> {
  try { return JSON.parse(sessionStorage.getItem(scrollKey) ?? "{}"); }
  catch { return {}; }
}
export function savedScroll(href: string) {
  const value = positions()?.[href];
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}
export function saveScroll(href: string, top: number) {
  try {
    const entries = Object.entries(positions() ?? {}).filter(([key]) => key !== href).slice(-19);
    sessionStorage.setItem(scrollKey, JSON.stringify(Object.fromEntries([...entries, [href, top]])));
  } catch { /* optional context */ }
}
