import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";

import { getSlideshowJob } from "./api";
import {
  ACTIVE_JOB_REFETCH_INTERVAL_MS,
  getSlideshowJobRefetchInterval,
  shouldPollSlideshowJob,
  useSlideshowJob,
} from "./hooks";
import type { SlideshowJobDetail } from "./types";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();

  return {
    ...actual,
    getSlideshowJob: vi.fn(),
  };
});

describe("useSlideshowJob", () => {
  beforeEach(() => {
    vi.mocked(getSlideshowJob).mockReset();
  });

  it("fetches job detail by ID", async () => {
    vi.mocked(getSlideshowJob).mockResolvedValue(makeJob({ id: "job-1" }));

    const { result } = renderHook(() => useSlideshowJob("job-1"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.data?.id).toBe("job-1"));
    expect(getSlideshowJob).toHaveBeenCalledWith("job-1");
  });

  it("handles errors from the API", async () => {
    vi.mocked(getSlideshowJob).mockRejectedValue(new Error("Nope"));

    const { result } = renderHook(() => useSlideshowJob("job-1"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("does not fetch when the job ID is missing", () => {
    renderHook(() => useSlideshowJob(""), {
      wrapper: createQueryWrapper(),
    });

    expect(getSlideshowJob).not.toHaveBeenCalled();
  });

  it("polls queued and running jobs only", () => {
    expect(shouldPollSlideshowJob(makeJob({ status: "queued" }))).toBe(true);
    expect(shouldPollSlideshowJob(makeJob({ status: "running" }))).toBe(true);
    expect(shouldPollSlideshowJob(makeJob({ status: "completed" }))).toBe(false);
    expect(shouldPollSlideshowJob(makeJob({ status: "failed" }))).toBe(false);
    expect(getSlideshowJobRefetchInterval(makeJob({ status: "running" }))).toBe(
      ACTIVE_JOB_REFETCH_INTERVAL_MS,
    );
    expect(getSlideshowJobRefetchInterval(makeJob({ status: "failed" }))).toBe(
      false,
    );
  });
});

function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function QueryWrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function makeJob(overrides: Partial<SlideshowJobDetail> = {}): SlideshowJobDetail {
  return {
    id: "job-1",
    status: "running",
    current_step: "planning",
    ...overrides,
  };
}

