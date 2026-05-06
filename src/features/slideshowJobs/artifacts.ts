import { buildApiUrl } from "../../lib/apiClient";

import type { SlideshowArtifactRef, SlideshowArtifactUrl } from "./types";

export function getSlideshowArtifactPath(
  jobId: string,
  artifact: SlideshowArtifactRef,
) {
  const encodedJobId = encodeURIComponent(jobId);

  switch (artifact.type) {
    case "brief":
      return `/slideshow-video-jobs/${encodedJobId}/artifacts/brief`;
    case "plan":
      return `/slideshow-video-jobs/${encodedJobId}/artifacts/plan`;
    case "script":
      return `/slideshow-video-jobs/${encodedJobId}/artifacts/script`;
    case "slide_image":
      return `/slideshow-video-jobs/${encodedJobId}/artifacts/slide/${encodeSlideOrder(
        artifact.order,
      )}/image`;
    case "slide_prompt":
      return `/slideshow-video-jobs/${encodedJobId}/artifacts/slide/${encodeSlideOrder(
        artifact.order,
      )}/prompt`;
    case "voice":
      return `/slideshow-video-jobs/${encodedJobId}/artifacts/voice`;
    case "render_manifest":
      return `/slideshow-video-jobs/${encodedJobId}/artifacts/render-manifest`;
    case "video":
      return `/slideshow-video-jobs/${encodedJobId}/artifacts/video`;
  }
}

export function getSlideshowArtifactUrl(
  jobId: string,
  artifact: SlideshowArtifactRef,
  baseUrl?: string,
): SlideshowArtifactUrl {
  return {
    jobId,
    artifact,
    url: buildApiUrl(getSlideshowArtifactPath(jobId, artifact), baseUrl),
  };
}

function encodeSlideOrder(order: number) {
  if (!Number.isInteger(order) || order < 1) {
    throw new Error("Slide artifact order must be a positive integer.");
  }

  return encodeURIComponent(String(order));
}

