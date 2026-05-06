import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";

import {
  fetchArtifactBlob,
  fetchArtifactJson,
  fetchArtifactText,
  getSlideshowJob,
} from "./api";
import {
  ACTIVE_JOB_REFETCH_INTERVAL_MS,
  getSlideshowJobRefetchInterval,
  shouldPollSlideshowJob,
  useBlobArtifact,
  useJsonArtifact,
  useSlideshowJob,
  useTextArtifact,
} from "./hooks";
import type { SlideshowJobDetail } from "./types";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();

  return {
    ...actual,
    fetchArtifactBlob: vi.fn(),
    fetchArtifactJson: vi.fn(),
    fetchArtifactText: vi.fn(),
    getSlideshowJob: vi.fn(),
  };
});

describe("useSlideshowJob", () => {
  beforeEach(() => {
    vi.mocked(fetchArtifactBlob).mockReset();
    vi.mocked(fetchArtifactJson).mockReset();
    vi.mocked(fetchArtifactText).mockReset();
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

  it("keeps artifact hooks disabled when URL is missing", () => {
    renderHook(() => useTextArtifact(null), {
      wrapper: createQueryWrapper(),
    });

    expect(fetchArtifactText).not.toHaveBeenCalled();
  });

  it("fetches text artifacts", async () => {
    vi.mocked(fetchArtifactText).mockResolvedValue("Narration text");

    const { result } = renderHook(() => useTextArtifact("http://api.test/script"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBe("Narration text"));
    expect(fetchArtifactText).toHaveBeenCalledWith("http://api.test/script");
  });

  it("fetches JSON artifacts", async () => {
    vi.mocked(fetchArtifactJson).mockResolvedValue({ slides: [] });

    const { result } = renderHook(
      () => useJsonArtifact<{ slides: unknown[] }>("http://api.test/plan"),
      {
        wrapper: createQueryWrapper(),
      },
    );

    await waitFor(() => expect(result.current.data).toEqual({ slides: [] }));
    expect(fetchArtifactJson).toHaveBeenCalledWith("http://api.test/plan");
  });

  it("fetches blob artifacts", async () => {
    const blob = new Blob(["image"], { type: "image/png" });
    vi.mocked(fetchArtifactBlob).mockResolvedValue(blob);

    const { result } = renderHook(() => useBlobArtifact("http://api.test/image"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBe(blob));
    expect(fetchArtifactBlob).toHaveBeenCalledWith("http://api.test/image");
  });

  it("surfaces artifact errors", async () => {
    vi.mocked(fetchArtifactText).mockRejectedValue(new Error("Artifact missing"));

    const { result } = renderHook(() => useTextArtifact("http://api.test/script"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
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
