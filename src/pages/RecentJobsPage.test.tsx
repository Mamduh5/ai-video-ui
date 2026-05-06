import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { RecentJobsPage } from "./RecentJobsPage";

describe("RecentJobsPage", () => {
  it("explains that the backend list endpoint is deferred", () => {
    render(
      <MemoryRouter>
        <RecentJobsPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/backend does not expose a recent slideshow jobs list/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /new video/i })).toHaveAttribute(
      "href",
      "/create",
    );
  });
});

