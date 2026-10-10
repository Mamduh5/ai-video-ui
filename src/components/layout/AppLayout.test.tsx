import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AppLayout } from "./AppLayout";

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

