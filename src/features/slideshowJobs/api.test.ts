import {
  createSlideshowJob,
  fetchArtifactBlob,
  fetchArtifactJson,
  fetchArtifactText,
  getArtifactUrl,
  getSlideshowJob,
} from "./api";
import type { SlideshowJobCreateRequest } from "./types";

describe("slideshow job API", () => {
  it("posts create requests to /slideshow-video-jobs", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        id: "job-1",
        status: "queued",
      }),
    );
    const request: SlideshowJobCreateRequest = {
      topic: "How photosynthesis works",
      audience: "middle school students",
      aspect_ratio: "9:16",
      target_platform: "shorts",
    };

    const response = await createSlideshowJob(request, {
      baseUrl: "http://api.test",
      fetchFn: fetchMock as typeof fetch,
    });

    expect(response).toEqual({ id: "job-1", status: "queued" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/slideshow-video-jobs",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(request),
      }),
    );
  });

  it("fetches job detail from /slideshow-video-jobs/:id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        id: "job-1",
        status: "running",
        current_step: "planning",
      }),
    );

    const response = await getSlideshowJob("job-1", {
      baseUrl: "http://api.test",
      fetchFn: fetchMock as typeof fetch,
    });

    expect(response.current_step).toBe("planning");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/slideshow-video-jobs/job-1",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("fetches text, JSON, and blob artifacts by URL", async () => {
    const textFetch = vi
      .fn()
      .mockResolvedValue(new Response("Brief text", { status: 200 }));
    const jsonFetch = vi.fn().mockResolvedValue(jsonResponse({ plan: [] }));
    const blobFetch = vi.fn().mockResolvedValue(
      new Response(new Blob(["image"]), {
        headers: {
          "Content-Type": "image/png",
        },
      }),
    );

    await expect(
      fetchArtifactText("http://api.test/brief", {
        fetchFn: textFetch as typeof fetch,
      }),
    ).resolves.toBe("Brief text");
    await expect(
      fetchArtifactJson("http://api.test/plan", {
        fetchFn: jsonFetch as typeof fetch,
      }),
    ).resolves.toEqual({ plan: [] });
    const blob = await fetchArtifactBlob("http://api.test/image", {
      fetchFn: blobFetch as typeof fetch,
    });

    expect(blob.constructor.name).toBe("Blob");
    expect(blob.type).toBe("image/png");
  });

  it("builds artifact URLs against the backend route family", () => {
    expect(getArtifactUrl("job-1", { type: "brief" }, "http://api.test")).toBe(
      "http://api.test/slideshow-video-jobs/job-1/artifacts/brief",
    );
    expect(
      getArtifactUrl("job-1", { type: "slide_image", order: 2 }, "http://api.test"),
    ).toBe("http://api.test/slideshow-video-jobs/job-1/artifacts/slide/2/image");
    expect(
      getArtifactUrl("job-1", { type: "render_manifest" }, "http://api.test"),
    ).toBe("http://api.test/slideshow-video-jobs/job-1/artifacts/render-manifest");
  });
});

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}
