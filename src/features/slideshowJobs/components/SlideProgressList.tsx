import { Card } from "../../../components/ui/Card";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import type { SlideshowSlideSummary } from "../types";

interface SlideProgressListProps {
  slides?: SlideshowSlideSummary[];
}

export function SlideProgressList({ slides }: SlideProgressListProps) {
  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">Slides</h3>
          <p className="mt-1 text-sm text-slate-600">
            Slide summaries from job detail only. Prompt and image bodies are
            deferred to the artifact viewer phase.
          </p>
        </div>
        {slides?.length ? (
          <ol className="divide-y divide-slate-200">
            {slides.map((slide) => (
              <li className="py-4 first:pt-0 last:pb-0" key={slide.order}>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Slide {slide.order}: {slide.title || "Untitled"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {slide.caption || "No caption available yet."}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <StatusBadge
                      label={slide.prompt || slide.image_prompt ? "Prompt ready" : "Prompt not ready"}
                      tone={slide.prompt || slide.image_prompt ? "completed" : "unknown"}
                    />
                    <StatusBadge
                      label={slide.image_url || slide.artifacts?.image ? "Image ready" : "Image not ready"}
                      tone={slide.image_url || slide.artifacts?.image ? "completed" : "unknown"}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-600">
            Slide summaries are not available yet.
          </p>
        )}
      </div>
    </Card>
  );
}

