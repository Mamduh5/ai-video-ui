import { render, screen } from "@testing-library/react";

import type { SlideshowJobDetail } from "../types";

import { JobStatusHeader } from "./JobStatusHeader";

describe("JobStatusHeader", () => {
  it("shows job status, step, timestamps, and refresh action", () => {
    const onRefresh = vi.fn();
    render(<JobStatusHeader job={makeJob()} onRefresh={onRefresh} />);

    expect(screen.getByText("running")).toBeInTheDocument();
    expect(screen.getByText("Building outline")).toBeInTheDocument();
    expect(screen.getByText("How photosynthesis works")).toBeInTheDocument();
    expect(screen.getByText("job-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });

  it("shows completed state copy without rendering video preview", () => {
    render(
      <JobStatusHeader
        job={makeJob({ status: "completed", current_step: "completed" })}
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByText(/Video ready/i)).toBeInTheDocument();
    expect(screen.queryByRole("video")).not.toBeInTheDocument();
  });
});

function makeJob(overrides: Partial<SlideshowJobDetail> = {}): SlideshowJobDetail {
  return {
    id: "job-1",
    status: "running",
    current_step: "planning",
    topic: "How photosynthesis works",
    created_at: "2026-05-07T00:00:00.000Z",
    updated_at: "2026-05-07T00:01:00.000Z",
    ...overrides,
  };
}

