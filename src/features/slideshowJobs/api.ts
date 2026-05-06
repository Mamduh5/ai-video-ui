import {
  apiJson,
  fetchBlobUrl,
  fetchJsonUrl,
  fetchTextUrl,
  type ApiClientOptions,
} from "../../lib/apiClient";

import {
  getSlideshowArtifactPath,
  getSlideshowArtifactUrl,
} from "./artifacts";
import type {
  SlideshowArtifactRef,
  SlideshowJobCreateRequest,
  SlideshowJobCreateResponse,
  SlideshowJobDetail,
} from "./types";

const SLIDESHOW_JOBS_PATH = "/slideshow-video-jobs";

export function createSlideshowJob(
  request: SlideshowJobCreateRequest,
  clientOptions?: ApiClientOptions,
) {
  return apiJson<SlideshowJobCreateResponse>(
    SLIDESHOW_JOBS_PATH,
    {
      method: "POST",
      body: request,
    },
    clientOptions,
  );
}

export function getSlideshowJob(
  jobId: string,
  clientOptions?: ApiClientOptions,
) {
  return apiJson<SlideshowJobDetail>(
    `${SLIDESHOW_JOBS_PATH}/${encodeURIComponent(jobId)}`,
    undefined,
    clientOptions,
  );
}

export function getArtifactUrl(
  jobId: string,
  artifact: SlideshowArtifactRef,
  baseUrl?: string,
) {
  return getSlideshowArtifactUrl(jobId, artifact, baseUrl).url;
}

export function getArtifactPath(
  jobId: string,
  artifact: SlideshowArtifactRef,
) {
  return getSlideshowArtifactPath(jobId, artifact);
}

export function fetchArtifactText(
  url: string,
  clientOptions?: ApiClientOptions,
) {
  return fetchTextUrl(url, clientOptions);
}

export function fetchArtifactJson<T>(
  url: string,
  clientOptions?: ApiClientOptions,
) {
  return fetchJsonUrl<T>(url, undefined, clientOptions);
}

export function fetchArtifactBlob(
  url: string,
  clientOptions?: ApiClientOptions,
) {
  return fetchBlobUrl(url, clientOptions);
}

