import {
  getSlideshowArtifactPath,
  getSlideshowArtifactUrl,
} from "./artifacts";

describe("slideshow artifact helpers", () => {
  it.each([
    [{ type: "brief" } as const, "/slideshow-video-jobs/job-1/artifacts/brief"],
    [{ type: "plan" } as const, "/slideshow-video-jobs/job-1/artifacts/plan"],
    [{ type: "script" } as const, "/slideshow-video-jobs/job-1/artifacts/script"],
    [
      { type: "slide_image", order: 3 } as const,
      "/slideshow-video-jobs/job-1/artifacts/slide/3/image",
    ],
    [
      { type: "slide_prompt", order: 3 } as const,
      "/slideshow-video-jobs/job-1/artifacts/slide/3/prompt",
    ],
    [{ type: "voice" } as const, "/slideshow-video-jobs/job-1/artifacts/voice"],
    [
      { type: "render_manifest" } as const,
      "/slideshow-video-jobs/job-1/artifacts/render-manifest",
    ],
    [{ type: "video" } as const, "/slideshow-video-jobs/job-1/artifacts/video"],
  ])("builds %s artifact paths", (artifact, expectedPath) => {
    expect(getSlideshowArtifactPath("job-1", artifact)).toBe(expectedPath);
  });

  it("builds full artifact URLs without using frontend routes", () => {
    const { url } = getSlideshowArtifactUrl(
      "job-1",
      { type: "video" },
      "http://api.test",
    );

    expect(url).toBe("http://api.test/slideshow-video-jobs/job-1/artifacts/video");
    expect(url).not.toContain("/slideshow-jobs/");
  });

  it("rejects invalid slide orders", () => {
    expect(() =>
      getSlideshowArtifactPath("job-1", { type: "slide_image", order: 0 }),
    ).toThrow("Slide artifact order must be a positive integer.");
  });
});

