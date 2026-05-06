import { render, screen } from "@testing-library/react";

import { ApiClientError } from "../../../lib/apiClient";
import { useObjectUrl } from "../../../lib/objectUrl";
import { useBlobArtifact } from "../hooks";
import type { SlideshowJobDetail } from "../types";

import { FinalVideoPanel } from "./FinalVideoPanel";

vi.mock("../hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../hooks")>();

  return {
    ...actual,
    useBlobArtifact: vi.fn(),
  };
});

vi.mock("../../../lib/objectUrl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/objectUrl")>();

  return {
    ...actual,
    useObjectUrl: vi.fn(),
  };
});

describe("FinalVideoPanel", () => {
  beforeEach(() => {
    vi.mocked(useBlobArtifact).mockReset();
    vi.mocked(useObjectUrl).mockReset();
  });

  it("does not fetch video before the job is completed", () => {
    vi.mocked(useBlobArtifact).mockReturnValue(queryState({}));
    vi.mocked(useObjectUrl).mockReturnValue(null);

    render(<FinalVideoPanel job={makeJob({ status: "running" })} />);

    expect(useBlobArtifact).toHaveBeenCalledWith(null, false);
    expect(
      screen.getByText("Final video will appear after rendering completes."),
    ).toBeInTheDocument();
  });

  it("fetches and renders final video for completed jobs with video artifact", () => {
    const blob = new Blob(["video"], { type: "video/mp4" });
    vi.mocked(useBlobArtifact).mockReturnValue(queryState({ data: blob }));
    vi.mocked(useObjectUrl).mockReturnValue("blob:video");

    render(
      <FinalVideoPanel
        job={makeJob({ status: "completed", artifacts: { video: true } })}
      />,
    );

    expect(useBlobArtifact).toHaveBeenCalledWith(
      "http://localhost:8080/slideshow-video-jobs/job-1/artifacts/video",
      true,
    );
    expect(screen.getByLabelText("Final slideshow video")).toHaveAttribute(
      "src",
      "blob:video",
    );
    expect(screen.getByRole("link", { name: "Download MP4" })).toHaveAttribute(
      "download",
      "slideshow-video-job-1.mp4",
    );
  });

  it("handles not-ready video artifacts", () => {
    vi.mocked(useBlobArtifact).mockReturnValue(
      queryState({
        error: new ApiClientError({
          category: "artifact_not_ready",
          status: 409,
          message: "Not ready",
        }),
      }),
    );
    vi.mocked(useObjectUrl).mockReturnValue(null);

    render(
      <FinalVideoPanel
        job={makeJob({ status: "completed", artifacts: { video: true } })}
      />,
    );

    expect(
      screen.getByText("This artifact is still being generated."),
    ).toBeInTheDocument();
  });
});

function makeJob(overrides: Partial<SlideshowJobDetail> = {}): SlideshowJobDetail {
  return {
    id: "job-1",
    status: "completed",
    current_step: "completed",
    artifacts: {},
    ...overrides,
  };
}

function queryState(overrides: Record<string, unknown>) {
  return {
    data: undefined,
    error: null,
    isLoading: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useBlobArtifact>;
}
