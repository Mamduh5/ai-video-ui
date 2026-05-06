import {
  ApiClientError,
  apiJson,
  buildApiUrl,
  fetchBlobUrl,
  fetchJsonUrl,
  fetchTextUrl,
  isArtifactNotReadyError,
} from "./apiClient";

describe("apiClient", () => {
  it("joins base URL and paths safely", () => {
    expect(buildApiUrl("/slideshow-video-jobs", "http://localhost:8080/")).toBe(
      "http://localhost:8080/slideshow-video-jobs",
    );
    expect(buildApiUrl("slideshow-video-jobs", "http://localhost:8080")).toBe(
      "http://localhost:8080/slideshow-video-jobs",
    );
  });

  it("sends JSON requests with headers and parsed response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
      }),
    );

    const response = await apiJson<{ ok: boolean }>(
      "/slideshow-video-jobs",
      {
        method: "POST",
        body: { topic: "Photosynthesis" },
      },
      {
        baseUrl: "http://api.test",
        fetchFn: fetchMock as typeof fetch,
      },
    );

    expect(response).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/slideshow-video-jobs",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ topic: "Photosynthesis" }),
        headers: expect.objectContaining({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it.each([
    [400, "validation"],
    [404, "not_found"],
    [409, "artifact_not_ready"],
    [500, "server"],
  ] as const)("maps %s responses to %s errors", async (status, category) => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          message: "Request failed",
          code: "test_error",
          fields: { topic: ["Required"] },
        },
        { status },
      ),
    );

    await expect(
      apiJson("/slideshow-video-jobs/job-1", undefined, {
        baseUrl: "http://api.test",
        fetchFn: fetchMock as typeof fetch,
      }),
    ).rejects.toMatchObject({
      category,
      status,
      message: "Request failed",
      code: "test_error",
    });
  });

  it("identifies 409 artifact-not-ready errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ message: "Artifact not ready" }, { status: 409 }),
    );

    try {
      await fetchTextUrl("http://api.test/artifact", {
        fetchFn: fetchMock as typeof fetch,
      });
      throw new Error("Expected request to fail");
    } catch (error) {
      expect(isArtifactNotReadyError(error)).toBe(true);
    }
  });

  it("handles network errors as typed API errors", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      fetchJsonUrl("http://api.test/slideshow-video-jobs/job-1", undefined, {
        fetchFn: fetchMock as typeof fetch,
      }),
    ).rejects.toMatchObject({
      category: "network",
      message: "Backend unavailable or request blocked.",
    });
  });

  it("returns text artifacts", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("Narration script", { status: 200 }));

    await expect(
      fetchTextUrl("http://api.test/script", {
        fetchFn: fetchMock as typeof fetch,
      }),
    ).resolves.toBe("Narration script");
  });

  it("returns JSON artifacts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ slides: [] }));

    await expect(
      fetchJsonUrl<{ slides: unknown[] }>("http://api.test/plan", undefined, {
        fetchFn: fetchMock as typeof fetch,
      }),
    ).resolves.toEqual({ slides: [] });
  });

  it("returns blob artifacts", async () => {
    const blob = new Blob(["mp4"]);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(blob, {
        headers: {
          "Content-Type": "video/mp4",
        },
      }),
    );

    const response = await fetchBlobUrl("http://api.test/video", {
      fetchFn: fetchMock as typeof fetch,
    });

    expect(response.constructor.name).toBe("Blob");
    expect(response.type).toBe("video/mp4");
  });

  it("throws a typed error for invalid JSON success bodies", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{bad json", { status: 200 }));

    await expect(
      fetchJsonUrl("http://api.test/bad-json", undefined, {
        fetchFn: fetchMock as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(ApiClientError);
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
