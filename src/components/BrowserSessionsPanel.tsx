import { useQuery } from "@tanstack/react-query";
import { apiJson } from "../lib/apiClient";

type BrowserSession = { provider: string; account: string; state: string; diagnostic?: string };
type BrowserSessions = { automatic_launch_enabled: boolean; sessions: BrowserSession[]; colab_management: string };
const labels: Record<string, string> = {
  browser_launching: "Browser launching",
  browser_connected: "Browser connected",
  login_required: "Login required",
  browser_disconnected: "Browser disconnected",
  launch_failed: "Launch failed",
};

export function BrowserSessionsPanel() {
  const query = useQuery({ queryKey: ["browserSessions"], queryFn: () => apiJson<BrowserSessions>("/browser-sessions"), refetchInterval: 5000, retry: false });
  const data = query.data;
  return <section aria-label="Dedicated browser sessions" className="space-y-3 rounded-xl border bg-white p-5">
    <h3 className="text-lg font-semibold">Dedicated browser sessions</h3>
    <p className="text-sm text-slate-600">Enabled Gemini and Flow browsers start with the backend and keep their separate login sessions. Opening a browser does not resume paused production. Colab is opened and run manually.</p>
    {query.isLoading && <p role="status">Checking browser sessions...</p>}
    {query.isError && <p role="status">Browser status unavailable. Check that the backend is running the latest build.</p>}
    {data && <>
      {!data.automatic_launch_enabled && <p className="text-sm">Automatic browser launching is disabled for this backend.</p>}
      {data.automatic_launch_enabled && data.sessions?.length === 0 && <p className="text-sm">No dedicated browser providers are enabled.</p>}
      <dl className="space-y-3">{data.sessions?.map(session => <div key={session.provider} className="rounded-lg border p-3">
        <dt className="font-medium">{session.provider === "gemini_web" ? "Gemini" : "Flow"} · {session.account}</dt>
        <dd className="text-sm">{labels[session.state] || "Browser status unknown"}</dd>
        {session.diagnostic && <dd className="mt-1 break-words text-sm text-amber-800">{session.diagnostic}</dd>}
      </div>)}</dl>
    </>}
  </section>;
}
