import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiJson } from "../lib/apiClient";
import { ForceRetryPanel, type ForceRetryCandidate, type ForceRetryStatus } from "./ForceRetryPanel";

vi.mock("../lib/apiClient", () => ({ apiJson: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); });
const available: ForceRetryStatus = { job_id: "existing", scene_order: 2, available: true };
const project: ForceRetryCandidate = { job_id: "existing", title: "Existing failed project", total_scenes: 3, completed_scenes: 1, next_incomplete_scene: 2, status: "needs_attention", project_status: "failed", paused: false, retry_status: available };
const refresh = vi.fn(async () => undefined);
const setBusy = vi.fn();
function panel(candidates: ForceRetryCandidate[] | undefined) {
  return <ForceRetryPanel candidates={candidates} busy={false} onBusyChange={setBusy} onRefresh={refresh}/>;
}
function mount(status: ForceRetryStatus = available) {
  return render(panel([{ ...project, retry_status: status }]));
}
function confirm() {
  fireEvent.click(screen.getByRole("button", { name: "Force Retry Now" }));
  const dialog = screen.getByRole("dialog", { name: "Confirm Force Retry" });
  fireEvent.click(within(dialog).getByRole("checkbox"));
  return within(dialog).getByRole("button", { name: "Confirm Force Retry" });
}

describe("Force Retry Now", () => {
  it("requires an explicit one-generation confirmation and prevents duplicate in-flight clicks", async () => {
    let resolveRequest!: (value: unknown) => void;
    vi.mocked(apiJson).mockImplementation(() => new Promise(resolve => { resolveRequest = resolve; }));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Force Retry Now" }));
    const dialog = screen.getByRole("dialog", { name: "Confirm Force Retry" });
    expect(within(dialog).getByText(/Existing failed project · Scene 2/)).toBeVisible();
    expect(within(dialog).getByText(/at most one new Gemini video generation/)).toBeVisible();
    const button = within(dialog).getByRole("button", { name: "Confirm Force Retry" });
    expect(button).toBeDisabled();
    expect(apiJson).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("checkbox"));
    fireEvent.click(button);
    fireEvent.click(button);
    expect(apiJson).toHaveBeenCalledTimes(1);
    expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/force-retry", { method: "POST", body: { job_id: "existing", scene_order: 2, request_id: expect.any(String), confirmed: true } });
    expect(button).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Project to retry" })).toBeDisabled();
    const requestID = (vi.mocked(apiJson).mock.calls[0][1]?.body as { request_id: string }).request_id;
    resolveRequest({ status: "retry_requested", force_retry_status: { ...available, request_id: requestID, state: "retry_requested", in_progress: true, message: "Owner retry saved for the next worker tick." } });
    expect(await screen.findByText("Retry requested")).toBeVisible();
    expect(screen.getByText(/does not mean a video has been submitted or generated/)).toBeVisible();
    expect(screen.queryByText("Video submitted")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Force Retry Now" })).toBeDisabled());
    expect(setBusy).toHaveBeenCalledWith(true);
    expect(setBusy).toHaveBeenLastCalledWith(false);
  });

  it.each([
    "Gemini requires you to complete an account security challenge in its dedicated browser.",
    "Gemini's current video limit is reached. Wait for the provider to allow another generation.",
    "The previous submitted request is unresolved. Recover its outcome before another submission.",
    "The Gemini Autopilot worker is disabled. Enable the worker before requesting a retry.",
  ])("keeps an unfinished blocked project selectable and explains its restriction: %s", unavailable_reason => {
    mount({ ...available, available: false, state: "blocked", unavailable_reason });
    expect(screen.getByRole("combobox")).toHaveValue("existing");
    expect(screen.getByRole("button", { name: "Force Retry Now" })).toBeDisabled();
    expect(screen.getByText(unavailable_reason)).toBeVisible();
    expect(apiJson).not.toHaveBeenCalled();
  });

  it("displays backend scene progress, current status and the next incomplete scene for paused projects", () => {
    render(panel([{ ...project, paused: true, status: "recovering", retry_status: { ...available, available: false, unavailable_reason: "Recover the original request first." } }]));
    const details = screen.getByLabelText("Selected retry project");
    expect(within(details).getByText("Existing failed project")).toBeVisible();
    expect(within(details).getByText("Paused · Awaiting recovery")).toBeVisible();
    expect(within(details).getByText("1 / 3")).toBeVisible();
    expect(within(details).getByText("Scene 2")).toBeVisible();
    expect(screen.getByRole("option")).toHaveTextContent("Recover the original request first.");
  });

  it("reports recovery of an existing video without claiming a new submission", async () => {
    vi.mocked(apiJson).mockResolvedValue({ status: "recovered", force_retry_status: { ...available, state: "recovered", request_id: "saved", available: false, message: "Recovered the completed video from the original request." } });
    mount(); fireEvent.click(confirm());
    expect(await screen.findByText("Existing video recovered")).toBeVisible();
    expect(screen.getAllByText(/Recovered the completed video from the original request/).length).toBeGreaterThan(0);
    expect(screen.queryByText("Video submitted")).not.toBeInTheDocument();
    expect(apiJson).toHaveBeenCalledTimes(1);
  });

  it("keeps the same idempotency request after a lost response and remount", async () => {
    vi.mocked(apiJson).mockRejectedValue(new Error("Connection lost"));
    const first = mount(); fireEvent.click(confirm());
    expect(await screen.findByRole("alert")).toHaveTextContent(/may have reached the backend/);
    await waitFor(() => expect(setBusy).toHaveBeenLastCalledWith(false));
    const firstBody = vi.mocked(apiJson).mock.calls[0][1]?.body as { request_id: string };
    first.unmount();
    vi.mocked(apiJson).mockResolvedValue({ status: "retry_requested", force_retry_status: { ...available, state: "retry_requested", request_id: firstBody.request_id, in_progress: true } });
    mount(); fireEvent.click(confirm()); await screen.findByText("Retry requested");
    const secondBody = vi.mocked(apiJson).mock.calls[1][1]?.body as { request_id: string };
    expect(secondBody.request_id).toBe(firstBody.request_id);
  });

  it("allows a new authorization after a lost response is conclusively resolved by the backend", async () => {
    localStorage.setItem("gemini-force-retry:existing:2", "resolved-request");
    vi.mocked(apiJson).mockResolvedValue({ status: "retry_requested", force_retry_status: { ...available, state: "retry_requested", request_id: "new-request", in_progress: true } });
    mount({ ...available, state: "blocked", request_id: "resolved-request", in_progress: false, message: "The prior retry was stopped before submitting. Current checks permit a new retry." });
    fireEvent.click(confirm()); await screen.findByText("Retry requested");
    const body = vi.mocked(apiJson).mock.calls[0][1]?.body as { request_id: string };
    expect(body.request_id).not.toBe("resolved-request");
  });

  it("updates requested, submitted, pending intent, and generated states from the backend", () => {
    const requested = { ...available, state: "retry_requested", request_id: "request", in_progress: true };
    const view = mount(requested);
    expect(screen.getByText("Retry requested")).toBeVisible();
    view.rerender(panel([{ ...project, retry_status: { ...requested, state: "submission_pending" } }]));
    expect(screen.getByText("Submission outcome pending")).toBeVisible();
    expect(screen.getByText(/receipt by Gemini is unresolved/)).toBeVisible();
    expect(screen.queryByText("Video submitted")).not.toBeInTheDocument();
    view.rerender(panel([{ ...project, retry_status: { ...requested, state: "video_submitted" } }]));
    expect(screen.getByText("Video submitted")).toBeVisible();
    expect(screen.getByText(/Video generation is not yet complete/)).toBeVisible();
    view.rerender(panel([{ ...project, retry_status: { ...requested, state: "video_generated", in_progress: false, available: false } }]));
    expect(screen.getByText("Video generated")).toBeVisible();
  });

  it("removes a completed project from selection after an authoritative refresh", () => {
    const view = mount();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "existing" } });
    view.rerender(panel([]));
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("No unfinished Gemini projects need retrying.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Force Retry Now" })).toBeDisabled();
  });

  it("invalidates confirmation if another worker completes the displayed scene", () => {
    const view = mount(); confirm();
    view.rerender(panel([{ ...project, next_incomplete_scene: 3, retry_status: { ...available, scene_order: 3 } }]));
    const dialog = screen.getByRole("dialog", { name: "Confirm Force Retry" });
    expect(within(dialog).getByText(/next incomplete scene changed/)).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Confirm Force Retry" })).toBeDisabled();
    expect(apiJson).not.toHaveBeenCalled();
  });

  it("invalidates a confirmation when the selected project is no longer an unfinished candidate", () => {
    const view = mount(); confirm(); view.rerender(panel([]));
    expect(screen.getByRole("button", { name: "Confirm Force Retry" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm Force Retry" }));
    expect(apiJson).not.toHaveBeenCalled();
  });

  it("rechecks active submission eligibility even if an old available flag remains true", () => {
    const view = mount(); confirm();
    view.rerender(panel([{ ...project, retry_status: { ...available, in_progress: true, message: "The original submission is active." } }]));
    const dialog = screen.getByRole("dialog", { name: "Confirm Force Retry" });
    expect(within(dialog).getByText("The original submission is active.")).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Confirm Force Retry" })).toBeDisabled();
    expect(apiJson).not.toHaveBeenCalled();
  });

  it("authorizes the selected failed project and its backend-identified incomplete scene", async () => {
    const second = { ...project, job_id: "second", title: "Second failed project", completed_scenes: 0, next_incomplete_scene: 1, retry_status: { ...available, job_id: "second", scene_order: 1 } };
    vi.mocked(apiJson).mockResolvedValue({ status: "retry_requested", force_retry_status: { ...second.retry_status, state: "retry_requested", request_id: "second-request", in_progress: true } });
    render(panel([project, second]));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "second" } });
    fireEvent.click(confirm()); await screen.findByText("Retry requested");
    expect(apiJson).toHaveBeenCalledWith("/gemini-autopilot/force-retry", { method: "POST", body: { job_id: "second", scene_order: 1, request_id: expect.any(String), confirmed: true } });
  });

  it("lets a newer server request replace an earlier optimistic response from this tab", async () => {
    vi.mocked(apiJson).mockResolvedValue({ status: "retry_requested", force_retry_status: { ...available, state: "retry_requested", request_id: "older-request", in_progress: true } });
    const view = mount(); fireEvent.click(confirm());
    expect(await screen.findByText("Retry requested")).toBeVisible();
    await waitFor(() => expect(setBusy).toHaveBeenLastCalledWith(false));
    view.rerender(panel([{ ...project, retry_status: { ...available, request_id: "later-request", available: false, state: "blocked", unavailable_reason: "A later request found a Gemini security challenge.", message: "Resolve the current browser challenge." } }]));
    expect(screen.getByText("Retry unavailable")).toBeVisible();
    expect(screen.getByText("A later request found a Gemini security challenge.")).toBeVisible();
    expect(screen.queryByText("Retry requested")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Force Retry Now" })).toBeDisabled();
  });

  it("requires the backend to identify the exact next scene before confirmation", () => {
    mount({ ...available, scene_order: undefined });
    expect(screen.getByRole("button", { name: "Force Retry Now" })).toBeDisabled();
    expect(screen.getByText(/has not identified the next incomplete scene/, { selector: "p" })).toBeVisible();
  });
  it("rejects a stale scene assessment instead of trusting its available flag", () => {
    mount({ ...available, scene_order: 3 });
    expect(screen.getByText(/does not match the next incomplete scene/, { selector: "p" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Force Retry Now" })).toBeDisabled();
  });
  it("explains missing backend support without falling back to queue labels", () => {
    render(panel(undefined));
    expect(screen.getByRole("button", { name: "Force Retry Now" })).toBeDisabled();
    expect(screen.getByText(/needs a backend project assessment/)).toBeVisible();
    expect(screen.queryByText("No unfinished Gemini projects need retrying.")).not.toBeInTheDocument();
  });
});
