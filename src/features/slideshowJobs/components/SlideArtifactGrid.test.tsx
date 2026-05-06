import { render, screen } from "@testing-library/react";

import { useObjectUrl } from "../../../lib/objectUrl";
import { useBlobArtifact, useTextArtifact } from "../hooks";
import type { SlideshowJobDetail } from "../types";

import { SlideArtifactGrid } from "./SlideArtifactGrid";

vi.mock("../hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../hooks")>();

  return {
    ...actual,
    useBlobArtifact: vi.fn(),
    useTextArtifact: vi.fn(),
  };
});

vi.mock("../../../lib/objectUrl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/objectUrl")>();

  return {
    ...actual,
    useObjectUrl: vi.fn(),
  };
});

describe("SlideArtifactGrid", () => {
  beforeEach(() => {
    vi.mocked(useBlobArtifact).mockReset();
    vi.mocked(useObjectUrl).mockReset();
    vi.mocked(useTextArtifact).mockReset();
  });

  it("renders slide prompts and images from artifact routes", () => {
    vi.mocked(useTextArtifact).mockReturnValue(
      textQueryState({ data: "Prompt text" }),
    );
    vi.mocked(useBlobArtifact).mockReturnValue(
      blobQueryState({ data: new Blob(["image"], { type: "image/png" }) }),
    );
    vi.mocked(useObjectUrl).mockReturnValue("blob:image");

    render(<SlideArtifactGrid job={makeJob()} />);

    expect(screen.getByText("Slide 1: Intro")).toBeInTheDocument();
    expect(screen.getByText("Prompt text")).toBeInTheDocument();
    expect(screen.getByAltText("Slide 1 image")).toHaveAttribute(
      "src",
      "blob:image",
    );
    expect(useTextArtifact).toHaveBeenCalledWith(
      "http://localhost:8080/slideshow-video-jobs/job-1/artifacts/slide/1/prompt",
    );
    expect(useBlobArtifact).toHaveBeenCalledWith(
      "http://localhost:8080/slideshow-video-jobs/job-1/artifacts/slide/1/image",
    );
  });

  it("does not build artifact URLs when slide artifacts are unavailable", () => {
    vi.mocked(useTextArtifact).mockReturnValue(textQueryState({}));
    vi.mocked(useBlobArtifact).mockReturnValue(blobQueryState({}));
    vi.mocked(useObjectUrl).mockReturnValue(null);

    render(
      <SlideArtifactGrid
        job={makeJob({
          artifacts: {},
          slides: [{ order: 1, title: "Intro", caption: "Start" }],
        })}
      />,
    );

    expect(useTextArtifact).toHaveBeenCalledWith(null);
    expect(useBlobArtifact).toHaveBeenCalledWith(null);
    expect(
      screen.getAllByText("This artifact is not available yet.").length,
    ).toBeGreaterThan(0);
  });
});

function makeJob(overrides: Partial<SlideshowJobDetail> = {}): SlideshowJobDetail {
  return {
    id: "job-1",
    status: "running",
    current_step: "image_generation",
    artifacts: {
      slide_images: true,
      slide_prompts: true,
    },
    slides: [
      {
        order: 1,
        title: "Intro",
        caption: "Start here",
      },
    ],
    ...overrides,
  };
}

function textQueryState(overrides: Record<string, unknown>) {
  return {
    data: undefined,
    error: null,
    isLoading: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useTextArtifact>;
}

function blobQueryState(overrides: Record<string, unknown>) {
  return {
    data: undefined,
    error: null,
    isLoading: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useBlobArtifact>;
}
