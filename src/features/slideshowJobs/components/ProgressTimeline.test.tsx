import { render, screen } from "@testing-library/react";

import type { SlideshowJobDetail } from "../types";

import { ProgressTimeline } from "./ProgressTimeline";

describe("ProgressTimeline", () => {
  it("highlights current and completed steps", () => {
    render(
      <ProgressTimeline
        job={makeJob({
          current_step: "image_generation",
          progress: {
            step: "image_generation",
            percent: 55,
            current_index: 7,
            total_steps: 10,
            completed_steps: ["queued", "normalizing", "planning"],
          },
        })}
      />,
    );

    expect(screen.getByText("Current step: Creating slide images")).toBeInTheDocument();
    expect(screen.getByText("55%")).toBeInTheDocument();
    expect(screen.getByText("Step 7 of 10")).toBeInTheDocument();
    expect(screen.getByText("Creating slide images")).toBeInTheDocument();
    expect(screen.getAllByText("Complete").length).toBeGreaterThan(0);
  });

  it("marks failed jobs", () => {
    render(
      <ProgressTimeline
        job={makeJob({ status: "failed", current_step: "rendering" })}
      />,
    );

    expect(screen.getByText("Failed here")).toBeInTheDocument();
  });
});

function makeJob(overrides: Partial<SlideshowJobDetail> = {}): SlideshowJobDetail {
  return {
    id: "job-1",
    status: "running",
    current_step: "planning",
    ...overrides,
  };
}

