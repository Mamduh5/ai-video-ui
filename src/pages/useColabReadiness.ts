import { useEffect, useState } from "react";
import { apiJson } from "../lib/apiClient";

export type ColabStatus = {
  mode?: string;
  directory?: string;
  sync_verified?: boolean;
  gpu_verified?: boolean;
  state?: string;
  next_action?: string;
  session_id?: string;
  model?: string;
  heartbeat_at?: string;
  expires_at?: string;
  request_id?: string;
  error?: string;
};

const messages: Record<string, { label: string; nextAction: string }> = {
  checking: { label: "Checking Colab planner", nextAction: "Checking fresh notebook and Drive exchange evidence." },
  unavailable: { label: "Colab readiness unavailable", nextAction: "Check the backend connection, or use manual transfer in Recovery." },
  unconfigured: { label: "Drive exchange not configured", nextAction: "Set COLAB_EXCHANGE_DIR to the Drive for Desktop folder for MyDrive/AI_Video_Planner, or use manual transfer in Recovery." },
  sync_unverified: { label: "Drive synchronization not verified", nextAction: "Open the notebook on the same Drive account and run Start Flow Planner to verify the exchange." },
  session_stale: { label: "Colab session not responding", nextAction: "Reconnect the notebook to a GPU runtime and run Start Flow Planner." },
  model_loading: { label: "Qwen model loading", nextAction: "Wait for Start Flow Planner to finish its GPU inference check." },
  ready: { label: "Qwen planner ready", nextAction: "Create a Flow project. Its request and validated storyboard will transfer automatically." },
  processing: { label: "Storyboard processing", nextAction: "Keep the notebook running. Validated results are imported automatically." },
  failed: { label: "Planning failed", nextAction: "Read the notebook error, resolve it, then run Start Flow Planner again. Recovery remains available." },
  stopped: { label: "Colab planner stopped", nextAction: "Run Start Flow Planner in the notebook when you want to plan more projects." },
};

export function describeColabStatus(status: ColabStatus | null, now: number, failed = false) {
  let state = failed ? "unavailable" : status ? status.state ?? "unavailable" : "checking";
  const expiry = Date.parse(status?.expires_at ?? "");
  const heartbeat = Date.parse(status?.heartbeat_at ?? "");
  const fresh = Number.isFinite(expiry) && expiry > now && Number.isFinite(heartbeat) && heartbeat <= now + 10000 && heartbeat < expiry;
  if (["ready", "processing", "model_loading"].includes(state) && !fresh) state = "session_stale";
  if (["ready", "processing"].includes(state) && !status?.sync_verified) state = "sync_unverified";
  if (["ready", "processing"].includes(state) && !status?.gpu_verified) state = "model_loading";
  const message = messages[state] ?? messages.unavailable;
  return {
    state,
    label: message.label,
    nextAction: state === status?.state && status.next_action ? status.next_action : message.nextAction,
    automatic: fresh && Boolean(status?.sync_verified && status?.gpu_verified) && ["ready", "processing"].includes(state),
  };
}

export function useColabReadiness() {
  const [status, setStatus] = useState<ColabStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const value = await apiJson<ColabStatus>("/colab/status");
        if (active) { setStatus(value ?? {}); setFailed(false); setNow(Date.now()); }
      } catch {
        if (active) { setFailed(true); setNow(Date.now()); }
      } finally {
        if (active) timer = setTimeout(() => void load(), 5000);
      }
    }
    void load();
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { active = false; clearTimeout(timer); clearInterval(clock); };
  }, []);
  return { status, ...describeColabStatus(status, now, failed) };
}
