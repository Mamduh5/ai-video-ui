import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { JobDetailPage } from "./JobDetailPage";

describe("JobDetailPage", () => {
  it("shows the slideshow job id from the route", () => {
    render(
      <MemoryRouter initialEntries={["/slideshow-jobs/demo-job-123"]}>
        <Routes>
          <Route path="/slideshow-jobs/:jobId" element={<JobDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("demo-job-123")).toBeInTheDocument();
  });
});

