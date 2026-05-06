import { useQuery } from "@tanstack/react-query";

import {
  fetchArtifactBlob,
  fetchArtifactJson,
  fetchArtifactText,
  getSlideshowJob,
} from "./api";
import type { SlideshowJobDetail } from "./types";

export const SLIDESHOW_JOB_QUERY_KEY = "slideshowJob";
export const SLIDESHOW_ARTIFACT_QUERY_KEY = "slideshowArtifact";
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

export function useTextArtifact(url?: string | null) {
  return useQuery({
    queryKey: [SLIDESHOW_ARTIFACT_QUERY_KEY, "text", url],
    queryFn: () => {
      if (!url) {
        throw new Error("Missing artifact URL.");
      }

      return fetchArtifactText(url);
    },
    enabled: Boolean(url),
    retry: false,
  });
}

export function useJsonArtifact<T>(url?: string | null) {
  return useQuery({
    queryKey: [SLIDESHOW_ARTIFACT_QUERY_KEY, "json", url],
    queryFn: () => {
      if (!url) {
        throw new Error("Missing artifact URL.");
      }

      return fetchArtifactJson<T>(url);
    },
    enabled: Boolean(url),
    retry: false,
  });
}

export function useBlobArtifact(url?: string | null, enabled = true) {
  return useQuery({
    queryKey: [SLIDESHOW_ARTIFACT_QUERY_KEY, "blob", url],
    queryFn: () => {
      if (!url) {
        throw new Error("Missing artifact URL.");
      }

      return fetchArtifactBlob(url);
    },
    enabled: Boolean(url) && enabled,
    retry: false,
  });
}
