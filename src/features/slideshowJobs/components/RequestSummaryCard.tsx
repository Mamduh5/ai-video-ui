import { Card } from "../../../components/ui/Card";
import type { SlideshowJobDetail } from "../types";

interface RequestSummaryCardProps {
  job: SlideshowJobDetail;
}

export function RequestSummaryCard({ job }: RequestSummaryCardProps) {
  const request = job.request ?? {};
  const values = {
    topic: job.topic ?? getString(request, "topic"),
    audience: job.audience ?? getString(request, "audience"),
    language: job.language ?? getString(request, "language"),
    tone: job.tone ?? getString(request, "tone"),
    educational_level:
      job.educational_level ?? getString(request, "educational_level"),
    visual_style: job.visual_style ?? getString(request, "visual_style"),
    target_duration_seconds:
      job.target_duration_seconds ?? getNumber(request, "target_duration_seconds"),
    slide_count: job.slide_count ?? getNumber(request, "slide_count"),
    aspect_ratio: job.aspect_ratio ?? getString(request, "aspect_ratio"),
    target_platform: job.target_platform ?? getString(request, "target_platform"),
    subtitles: job.subtitles ?? getBoolean(request, "subtitles"),
    must_include: getStringArray(request, "must_include"),
    must_avoid: getStringArray(request, "must_avoid"),
  };

  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">Request Summary</h3>
          <p className="mt-1 text-sm text-slate-600">
            Structured inputs used to create this slideshow job.
          </p>
        </div>
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <SummaryItem label="Topic" value={values.topic} wide />
          <SummaryItem label="Audience" value={values.audience} />
          <SummaryItem label="Language" value={values.language} />
          <SummaryItem label="Tone" value={values.tone} />
          <SummaryItem label="Educational level" value={values.educational_level} />
          <SummaryItem label="Visual style" value={values.visual_style} wide />
          <SummaryItem
            label="Target duration"
            value={
              typeof values.target_duration_seconds === "number"
                ? `${values.target_duration_seconds} seconds`
                : undefined
            }
          />
          <SummaryItem
            label="Slide count"
            value={
              typeof values.slide_count === "number"
                ? `${values.slide_count}`
                : undefined
            }
          />
          <SummaryItem label="Aspect ratio" value={values.aspect_ratio} />
          <SummaryItem label="Target platform" value={values.target_platform} />
          <SummaryItem
            label="Subtitles"
            value={
              typeof values.subtitles === "boolean"
                ? values.subtitles
                  ? "Yes"
                  : "No"
                : undefined
            }
          />
          <SummaryItem label="Must include" value={values.must_include.join(", ")} />
          <SummaryItem label="Must avoid" value={values.must_avoid.join(", ")} />
        </dl>
      </div>
    </Card>
  );
}

function SummaryItem({
  label,
  value,
  wide,
}: {
  label: string;
  value?: string | null;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <dt className="font-medium text-slate-700">{label}</dt>
      <dd className="mt-1 text-slate-600">{value || "Not provided"}</dd>
    </div>
  );
}

function getString(source: object, key: string) {
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function getNumber(source: object, key: string) {
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}

function getBoolean(source: object, key: string) {
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "boolean" ? value : undefined;
}

function getStringArray(source: object, key: string) {
  const value = (source as Record<string, unknown>)[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

