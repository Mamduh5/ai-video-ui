import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { ApiClientError } from "../lib/apiClient";
import { useSlideshowJob } from "../features/slideshowJobs/hooks";
import type { SlideshowJobDetail } from "../features/slideshowJobs/types";

import { JobDetailPage } from "./JobDetailPage";

vi.mock("../features/slideshowJobs/hooks", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../features/slideshowJobs/hooks")>();

  return {
    ...actual,
    useSlideshowJob: vi.fn(),
  };
});

describe("JobDetailPage", () => {
  beforeEach(() => {
    vi.mocked(useSlideshowJob).mockReset();
  });

  it("shows loading state", () => {
    vi.mocked(useSlideshowJob).mockReturnValue(queryState({ isLoading: true }));

    renderPage();

    expect(screen.getByText("Loading slideshow job")).toBeInTheDocument();
    expect(screen.getByText("demo-job-123")).toBeInTheDocument();
  });

  it("shows running job status, progress, request summary, slides, and artifacts", () => {
    vi.mocked(useSlideshowJob).mockReturnValue(
      queryState({
        data: makeJob({
          status: "running",
          current_step: "image_generation",
          progress: {
            step: "image_generation",
            percent: 60,
            current_index: 7,
            total_steps: 10,
            completed_steps: ["queued", "normalizing", "planning"],
          },
          artifacts: {
            brief: true,
            plan: true,
            script: false,
            video: false,
          },
          slides: [
            {
              order: 1,
              title: "What plants need",
              caption: "Plants need sunlight, water, and air.",
              prompt: "A plant in sunlight",
              artifacts: { image: false },
            },
          ],
        }),
      }),
    );

    renderPage();

    expect(screen.getByText("demo-job-123")).toBeInTheDocument();
    expect(screen.getByText("running")).toBeInTheDocument();
    expect(screen.getAllByText("Creating slide images").length).toBeGreaterThan(0);
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getAllByText("How photosynthesis works").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("Slide 1: What plants need")).toBeInTheDocument();
    expect(screen.getByText("Brief")).toBeInTheDocument();
    expect(screen.getByText("Video")).toBeInTheDocument();
    expect(screen.getByText(/Artifact body fetching is deferred/i)).toBeInTheDocument();
  });

  it("shows completed video-ready state without preview", () => {
    vi.mocked(useSlideshowJob).mockReturnValue(
      queryState({
        data: makeJob({
          status: "completed",
          current_step: "completed",
          completed_at: "2026-05-07T00:05:00.000Z",
          artifacts: { video: true },
        }),
      }),
    );

    renderPage();

    expect(screen.getAllByText(/Video ready/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/preview and MP4 download are intentionally deferred/i)).toBeInTheDocument();
    expect(screen.queryByText(/Download MP4/i)).not.toBeInTheDocument();
  });

  it("shows failed job details", () => {
    vi.mocked(useSlideshowJob).mockReturnValue(
      queryState({
        data: makeJob({
          status: "failed",
          current_step: "rendering",
          error: {
            message: "FFmpeg render failed",
            step: "rendering",
            details: { exitCode: 1 },
          },
        }),
      }),
    );

    renderPage();

    expect(screen.getByText("Slideshow job failed")).toBeInTheDocument();
    expect(screen.getByText("FFmpeg render failed")).toBeInTheDocument();
    expect(screen.getByText("Failed step: Rendering MP4")).toBeInTheDocument();
  });

  it("shows not found errors", () => {
    vi.mocked(useSlideshowJob).mockReturnValue(
      queryState({
        isError: true,
        error: new ApiClientError({
          category: "not_found",
          status: 404,
          message: "Not found",
        }),
      }),
    );

    renderPage();

    expect(screen.getByText("This slideshow job was not found.")).toBeInTheDocument();
  });

  it("shows backend unavailable errors and supports manual refresh", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    vi.mocked(useSlideshowJob).mockReturnValue(
      queryState({
        isError: true,
        error: new ApiClientError({
          category: "network",
          message: "Backend unavailable or request blocked.",
        }),
        refetch,
      }),
    );

    renderPage();

    expect(
      screen.getByText("Backend is unavailable. Check that the API is running."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("does not introduce provider/content mode UI or forbidden backend routes", () => {
    vi.mocked(useSlideshowJob).mockReturnValue(queryState({ data: makeJob() }));

    renderPage();

    expect(screen.queryByLabelText(/provider/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/content mode/i)).not.toBeInTheDocument();
    expect(screen.queryByText("/scene-video-jobs")).not.toBeInTheDocument();
    expect(screen.queryByText("/jobs")).not.toBeInTheDocument();
  });
});

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/slideshow-jobs/demo-job-123"]}>
      <Routes>
        <Route path="/slideshow-jobs/:jobId" element={<JobDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function queryState(overrides: Record<string, unknown>) {
  return {
    data: undefined,
    error: null,
    isError: false,
    isLoading: false,
    isRefetching: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useSlideshowJob>;
}

function makeJob(overrides: Partial<SlideshowJobDetail> = {}): SlideshowJobDetail {
  return {
    id: "demo-job-123",
    status: "running",
    current_step: "planning",
    topic: "How photosynthesis works",
    audience: "middle school students",
    tone: "clear and friendly",
    language: "en",
    educational_level: "general",
    visual_style: "clean educational illustration",
    target_duration_seconds: 90,
    slide_count: 8,
    aspect_ratio: "9:16",
    target_platform: "shorts",
    subtitles: true,
    request: {
      topic: "How photosynthesis works",
      audience: "middle school students",
      tone: "clear and friendly",
      language: "en",
      educational_level: "general",
      visual_style: "clean educational illustration",
      target_duration_seconds: 90,
      slide_count: 8,
      aspect_ratio: "9:16",
      target_platform: "shorts",
      subtitles: true,
      must_include: ["sunlight", "leaves"],
      must_avoid: ["watermarks"],
    },
    created_at: "2026-05-07T00:00:00.000Z",
    updated_at: "2026-05-07T00:01:00.000Z",
    artifacts: {},
    slides: [],
    ...overrides,
  };
}
