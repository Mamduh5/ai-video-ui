import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";

import { createSlideshowJob } from "../features/slideshowJobs/api";

import { CreateJobPage } from "./CreateJobPage";

vi.mock("../features/slideshowJobs/api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../features/slideshowJobs/api")>();

  return {
    ...actual,
    createSlideshowJob: vi.fn(),
  };
});

describe("CreateJobPage", () => {
  it("navigates to the slideshow detail route after successful create", async () => {
    const user = userEvent.setup();
    vi.mocked(createSlideshowJob).mockResolvedValue({
      id: "job-created-1",
      status: "queued",
    });

    render(
      <MemoryRouter initialEntries={["/create"]}>
        <Routes>
          <Route path="/create" element={<CreateJobPage />} />
          <Route path="/slideshow-jobs/:jobId" element={<RouteProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(
      screen.getByLabelText("Topic"),
      "How photosynthesis works",
    );
    await user.click(screen.getByRole("button", { name: /create slideshow job/i }));

    await waitFor(() => {
      expect(screen.getByText("job-created-1")).toBeInTheDocument();
    });
  });
});

function RouteProbe() {
  const { jobId } = useParams<{ jobId: string }>();

  return <div>{jobId}</div>;
}
