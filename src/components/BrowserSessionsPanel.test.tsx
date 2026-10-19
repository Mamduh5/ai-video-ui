import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { apiJson } from "../lib/apiClient";
import { BrowserSessionsPanel } from "./BrowserSessionsPanel";

vi.mock("../lib/apiClient", () => ({ apiJson: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
function show() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><BrowserSessionsPanel /></QueryClientProvider>); }

it("reports browser states and actionable failures without any mutation", async () => {
  vi.mocked(apiJson).mockResolvedValue({ automatic_launch_enabled: true, colab_management: "manual", sessions: [
    { provider: "flow_web", account: "main", state: "launch_failed", diagnostic: "Debugging port belongs to another profile." },
    { provider: "gemini_web", account: "main", state: "login_required", diagnostic: "Complete login manually." },
  ] });
  show();
  expect(await screen.findByText("Launch failed")).toBeVisible();
  expect(screen.getByText("Login required")).toBeVisible();
  expect(screen.getByText("Debugging port belongs to another profile.")).toBeVisible();
  expect(screen.getByText(/Colab is opened and run manually/)).toBeVisible();
  expect(apiJson).toHaveBeenCalledWith("/browser-sessions");
  expect(vi.mocked(apiJson).mock.calls.every(([, options]) => !options?.method)).toBe(true);
  expect(screen.queryByRole("button")).toBeNull();
});

it("handles an older or unavailable backend truthfully", async () => {
  vi.mocked(apiJson).mockRejectedValue(new Error("not found")); show();
  expect(await screen.findByText(/Browser status unavailable/)).toBeVisible();
  expect(screen.queryByText("Browser connected")).toBeNull();
});
