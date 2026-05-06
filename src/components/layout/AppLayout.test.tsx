import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AppLayout } from "./AppLayout";

describe("AppLayout", () => {
  it("renders navigation links and reaches the create page", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<div>Recent route</div>} />
            <Route path="create" element={<div>Create route</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Recent Jobs" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Create Video" }));
    expect(screen.getByText("Create route")).toBeInTheDocument();
  });
});

