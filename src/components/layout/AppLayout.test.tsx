import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AppLayout } from "./AppLayout";

beforeEach(() => sessionStorage.clear());
afterEach(() => sessionStorage.clear());

describe("AppLayout", () => {
  it("renders navigation links and reaches the create page", async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient({defaultOptions:{queries:{enabled:false}}})}><MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<div>Recent route</div>} />
            <Route path="videos/new" element={<div>Create route</div>} />
          </Route>
        </Routes>
      </MemoryRouter></QueryClientProvider>,
    );

    expect(screen.getByRole("link", { name: "Projects" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "New Video" }));
    expect(screen.getByText("Create route")).toBeInTheDocument();
  });
});



it("returns to the remembered library URL from the main Projects link", async () => {
  const saved = "/?q=Robot&provider=flow_web&sort=name&view=grid";
  sessionStorage.setItem("videoStudio.library.location", saved);
  const client = new QueryClient({ defaultOptions: { queries: { enabled: false } } });
  const view = render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/scene-jobs/saved-project"]}>
    <Routes><Route element={<AppLayout />}>
      <Route index element={<div>Saved library route</div>} />
      <Route path="scene-jobs/:jobId" element={<div>Saved detail route</div>} />
    </Route></Routes>
  </MemoryRouter></QueryClientProvider>);
  expect(screen.getByText("Saved detail route")).toBeVisible();
  expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", saved);
  vi.mocked(window.scrollTo).mockClear();
  await userEvent.click(screen.getByRole("link", { name: "Projects" }));
  expect(screen.getByText("Saved library route")).toBeVisible();
  expect(window.scrollTo).not.toHaveBeenCalled();
  view.unmount();
  client.clear();
});
