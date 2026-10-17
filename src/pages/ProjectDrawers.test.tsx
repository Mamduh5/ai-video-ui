import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { apiJson } from "../lib/apiClient";
import { SlowdownExportPanel } from "./SlowdownExportPanel";
import { ProjectStorage } from "./StoragePage";

vi.mock("../lib/apiClient", async original => ({ ...await original<typeof import("../lib/apiClient")>(), apiJson: vi.fn() }));
beforeEach(() => {
  localStorage.clear();
  vi.mocked(apiJson).mockReset();
  vi.mocked(apiJson).mockImplementation(async path => path.includes("/slowdown/") ? { exports: [] } : { state: "not_requested", artifacts: [] });
});
afterEach(cleanup);

const titles = ["Export a separate slow version", "Storage"];
function mount(id = "first", completed = false, available = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const panels = (projectId: string, done: boolean, sources: boolean) => <QueryClientProvider client={client}>
    <SlowdownExportPanel jobId={projectId} completed={done} available={sources} finalUrl="/final.mp4" scenes={[{ order: 1, clip_url: "/scene.mp4" }]}/>
    <ProjectStorage id={projectId} completed={done} onChanged={vi.fn()}/>
  </QueryClientProvider>;
  const view = render(panels(id, completed, available));
  return { ...view, client, update: (projectId: string, done: boolean, sources = true) => view.rerender(panels(projectId, done, sources)) };
}
function expectExpanded(expanded: boolean) {
  for (const title of titles) expect(screen.getByRole("button", { name: title })).toHaveAttribute("aria-expanded", String(expanded));
}

it("keeps incomplete drawers collapsed, with accessible keyboard toggles and no processing on expansion", async () => {
  mount();
  expectExpanded(false);
  expect(screen.queryByRole("button", { name: "Calculate duration from source media" })).not.toBeInTheDocument();
  for (const title of titles) {
    const button = screen.getByRole("button", { name: title });
    button.focus();
    await userEvent.keyboard("{Enter}");
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(button.getAttribute("aria-controls")!)).toBeVisible();
    await userEvent.keyboard(" ");
    expect(button).toHaveAttribute("aria-expanded", "false");
  }
  expect(vi.mocked(apiJson).mock.calls.every(([, init]) => !init?.method)).toBe(true);
});

it("opens both completed drawers initially without creating an export, archive or restore", async () => {
  mount("finished", true);
  expectExpanded(true);
  await screen.findByRole("button", { name: "Archive Now" });
  expect(screen.getByRole("button", { name: "Calculate duration from source media" })).toBeEnabled();
  expect(vi.mocked(apiJson).mock.calls.every(([, init]) => !init?.method)).toBe(true);
});

it("expands once at completion, then preserves manual choices through refetches and status polling", async () => {
  const view = mount();
  // A manual choice while incomplete does not suppress the completion event.
  for (const title of titles) {
    await userEvent.click(screen.getByRole("button", { name: title }));
    await userEvent.click(screen.getByRole("button", { name: title }));
  }
  view.update("first", true);
  expectExpanded(true);
  for (const title of titles) await userEvent.click(screen.getByRole("button", { name: title }));
  expectExpanded(false);
  await act(() => view.client.refetchQueries());
  view.update("first", true);
  expectExpanded(false);
  // Even a temporarily stale incomplete response cannot reset the completion latch.
  view.update("first", false);
  view.update("first", true);
  expectExpanded(false);
  for (const title of titles) await userEvent.click(screen.getByRole("button", { name: title }));
  await act(() => view.client.refetchQueries());
  view.update("first", true);
  expectExpanded(true);
});

it("resets drawers when moving between completed and incomplete projects", async () => {
  const view = mount("completed", true);
  expectExpanded(true);
  view.update("incomplete", false);
  expectExpanded(false);
  for (const title of titles) await userEvent.click(screen.getByRole("button", { name: title }));
  view.update("other-incomplete", false);
  expectExpanded(false);
  view.update("other-completed", true);
  expectExpanded(true);
});

it("shows completed archive restoration and suppresses slowdown controls even with stale scene URLs", async () => {
  vi.mocked(apiJson).mockImplementation(async path => path.includes("/slowdown/") ? { exports: [] } : {
    state: "archived", manifest: { verified: true }, artifacts: [{ role: "final_video", local_object_key: "final", size: 10, verified: true, local_removed: true }],
  });
  mount("archived", true, false);
  expectExpanded(true);
  expect(await screen.findByRole("button", { name: "Restore & Watch" })).toBeEnabled();
  expect(screen.getByText(/Source media is unavailable locally/)).toBeVisible();
  expect(screen.queryByRole("button", { name: "Calculate duration from source media" })).not.toBeInTheDocument();
  expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  expect(vi.mocked(apiJson).mock.calls.every(([path, init]) => !path.includes("/slowdown/") && !init?.method)).toBe(true);
});

it("hides unusable slowdown controls when media is missing and retains manual collapse after restoration", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const panel = (finalUrl?: string) => <QueryClientProvider client={client}><SlowdownExportPanel jobId="missing" completed finalUrl={finalUrl} scenes={[]}/></QueryClientProvider>;
  const view = render(panel());
  expect(screen.getByText(/Source media is unavailable locally/)).toBeVisible();
  expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: titles[0] }));
  view.rerender(panel("/restored.mp4"));
  expect(screen.getByRole("button", { name: titles[0] })).toHaveAttribute("aria-expanded", "false");
  await userEvent.click(screen.getByRole("button", { name: titles[0] }));
  await userEvent.click(screen.getByLabelText("Whole final video"));
  expect(screen.getByRole("button", { name: "Calculate duration from source media" })).toBeEnabled();
});

it("keeps a storage query error recoverable inside its drawer", async () => {
  vi.mocked(apiJson).mockRejectedValue(new Error("Storage unavailable"));
  mount("failed", true, false);
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Storage unavailable"));
  expect(screen.getByRole("button", { name: "Storage" })).toHaveAttribute("aria-expanded", "true");
});
