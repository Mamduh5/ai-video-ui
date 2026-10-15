import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { FlowSpeechPilotPanel } from "./FlowSpeechPilotPanel";
import { apiJson } from "../lib/apiClient";
vi.mock("../lib/apiClient", () => ({ apiJson: vi.fn(), buildApiUrl: (p: string) => p }));
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

it("requires exact reviewed media and records incomplete findings without claiming a pass", async () => {
  const digest = new Uint8Array(32).fill(17);
  vi.stubGlobal("crypto", { subtle: { digest: vi.fn().mockResolvedValue(digest.buffer) } });
  vi.mocked(apiJson).mockResolvedValue({});
  const changed = vi.fn().mockResolvedValue(undefined);
  render(<FlowSpeechPilotPanel jobId="pilot" episode onChanged={changed}/>);
  expect(screen.getByRole("button", { name: "Record speech inspection" })).toBeDisabled();
  expect(screen.getByRole("link", { name: "Watch / download pilot media" })).toHaveAttribute("href", "/scene-video-jobs/pilot/artifacts/video");
  const file = new File(["fixture bytes"], "pilot.mp4", { type: "video/mp4" });
  Object.defineProperty(file, "arrayBuffer", { value: async () => new ArrayBuffer(8) });
  fireEvent.change(screen.getByLabelText("Reviewed media file"), { target: { files: [file] } });
  await waitFor(() => expect(screen.getByRole("button", { name: "Record speech inspection" })).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Inspection evidence and warnings"), { target: { value: "Speech is unclear; keep hold." } });
  fireEvent.click(screen.getByRole("button", { name: "Record speech inspection" }));
  await waitFor(() => expect(changed).toHaveBeenCalledOnce());
  expect(apiJson).toHaveBeenCalledWith("/flow-autopilot/batches/pilot/pilot", { method: "POST", body: { artifact: "final_video", clip_sha256: "11".repeat(32), method: "listened_audio_and_video", evidence: "Speech is unclear; keep hold.", lip_sync: "unreviewed", thai_intelligible: false, intended_speaker: false, meaning_preserved: false, natural_ending: false, voice_consistent: false } });
});
