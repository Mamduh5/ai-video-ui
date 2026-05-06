import { useQuery } from "@tanstack/react-query";

import { getSlideshowJob } from "./api";
import type { SlideshowJobDetail } from "./types";

export const SLIDESHOW_JOB_QUERY_KEY = "slideshowJob";
export const ACTIVE_JOB_REFETCH_INTERVAL_MS = 2000;

export function useSlideshowJob(jobId?: string | null) {
  const normalizedJobId = jobId?.trim();

  return useQuery({
    queryKey: [SLIDESHOW_JOB_QUERY_KEY, normalizedJobId],
    queryFn: () => {
      if (!normalizedJobId) {
        throw new Error("Missing slideshow job ID.");
      }

      return getSlideshowJob(normalizedJobId);
    },
    enabled: Boolean(normalizedJobId),
    refetchInterval: (query) =>
      getSlideshowJobRefetchInterval(query.state.data),
  });
}

export function shouldPollSlideshowJob(job?: SlideshowJobDetail | null) {
  return job?.status === "queued" || job?.status === "running";
}

export function getSlideshowJobRefetchInterval(
  job?: SlideshowJobDetail | null,
) {
  return shouldPollSlideshowJob(job) ? ACTIVE_JOB_REFETCH_INTERVAL_MS : false;
}

