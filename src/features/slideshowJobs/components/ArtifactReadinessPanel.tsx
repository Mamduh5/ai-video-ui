import { Card } from "../../../components/ui/Card";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import type { SlideshowJobDetail } from "../types";

interface ArtifactReadinessPanelProps {
  job: SlideshowJobDetail;
}

const ARTIFACTS = [
  ["brief", "Brief"],
  ["plan", "Plan"],
  ["script", "Script"],
  ["voice", "Voice"],
  ["render_manifest", "Render manifest"],
  ["video", "Video"],
] as const;

export function ArtifactReadinessPanel({ job }: ArtifactReadinessPanelProps) {
  const slidePromptCount =
    job.slides?.filter((slide) => slide.prompt || slide.image_prompt).length ?? 0;
  const slideImageCount =
    job.slides?.filter((slide) => slide.image_url || slide.artifacts?.image)
      .length ?? 0;

  return (
    <Card className="h-fit">
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">Artifact Readiness</h3>
          <p className="mt-1 text-sm text-slate-600">
            Availability only. Artifact body fetching is deferred.
          </p>
        </div>
        <div className="space-y-2">
          {ARTIFACTS.map(([key, label]) => (
            <ReadinessRow
              isReady={Boolean(job.artifacts?.[key])}
              key={key}
              label={label}
            />
          ))}
          <ReadinessRow
            isReady={Boolean(job.artifacts?.slide_prompts) || slidePromptCount > 0}
            label={`Slide prompts${job.slides?.length ? ` (${slidePromptCount}/${job.slides.length})` : ""}`}
          />
          <ReadinessRow
            isReady={Boolean(job.artifacts?.slide_images) || slideImageCount > 0}
            label={`Slide images${job.slides?.length ? ` (${slideImageCount}/${job.slides.length})` : ""}`}
          />
        </div>
      </div>
    </Card>
  );
}

function ReadinessRow({
  isReady,
  label,
}: {
  isReady: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <StatusBadge
        label={isReady ? "Available" : "Not ready"}
        tone={isReady ? "completed" : "unknown"}
      />
    </div>
  );
}

