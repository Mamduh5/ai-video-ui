import { Card } from "../../../components/ui/Card";
import { getArtifactUrl } from "../api";
import type { SlideshowJobDetail, SlideshowSlideSummary } from "../types";

import { ImageArtifactViewer } from "./ImageArtifactViewer";
import { TextArtifactViewer } from "./TextArtifactViewer";

interface SlideArtifactGridProps {
  job: SlideshowJobDetail;
}

export function SlideArtifactGrid({ job }: SlideArtifactGridProps) {
  const slides = job.slides ?? [];

  return (
    <Card>
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-semibold">Slides</h3>
          <p className="mt-1 text-sm text-slate-600">
            Read-only slide prompts and images. Editing and regeneration are
            deferred.
          </p>
        </div>
        {slides.length ? (
          <div className="grid gap-4">
            {slides.map((slide) => (
              <SlideArtifactItem job={job} key={slide.order} slide={slide} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Slide artifact summaries are not available yet.
          </p>
        )}
      </div>
    </Card>
  );
}

function SlideArtifactItem({
  job,
  slide,
}: {
  job: SlideshowJobDetail;
  slide: SlideshowSlideSummary;
}) {
  const hasPrompt =
    Boolean(slide.prompt || slide.image_prompt || slide.artifacts?.prompt) ||
    Boolean(job.artifacts?.slide_prompts);
  const hasImage =
    Boolean(slide.image_url || slide.artifacts?.image) ||
    Boolean(job.artifacts?.slide_images);
  const promptUrl = hasPrompt
    ? getArtifactUrl(job.id, { type: "slide_prompt", order: slide.order })
    : null;
  const imageUrl = hasImage
    ? getArtifactUrl(job.id, { type: "slide_image", order: slide.order })
    : null;

  return (
    <section className="rounded-md border border-slate-200 p-4">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-slate-900">
          Slide {slide.order}: {slide.title || "Untitled"}
        </h4>
        <p className="mt-1 text-sm text-slate-600">
          {slide.caption || "No caption available yet."}
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <ImageArtifactViewer
          alt={`Slide ${slide.order} image`}
          title="Slide Image"
          url={imageUrl}
        />
        <TextArtifactViewer title="Slide Prompt" url={promptUrl} />
      </div>
    </section>
  );
}

