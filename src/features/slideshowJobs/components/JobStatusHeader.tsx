import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { formatDateTime } from "../../../lib/format";
import { getSlideshowStepLabel } from "../status";
import type { SlideshowJobDetail, SlideshowJobStatus } from "../types";

interface JobStatusHeaderProps {
  job: SlideshowJobDetail;
  isRefreshing?: boolean;
  onRefresh: () => void;
}

export function JobStatusHeader({
  isRefreshing,
  job,
  onRefresh,
}: JobStatusHeaderProps) {
  const step = job.current_step ?? job.progress?.step ?? job.status;

  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge label={job.status} tone={statusTone(job.status)} />
            <span className="text-sm font-medium text-slate-600">
              {getSlideshowStepLabel(step)}
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold">
              {job.topic || getRequestTopic(job.request) || "Slideshow job"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Job ID: <span className="font-mono">{job.id}</span>
            </p>
          </div>
          {job.status === "completed" ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              Video ready. Preview and download are available below when the
              video artifact loads.
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 text-sm text-slate-600 lg:items-end">
          <Button disabled={isRefreshing} onClick={onRefresh} variant="secondary">
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <dl className="grid gap-1 lg:text-right">
            <TimestampRow label="Created" value={job.created_at} />
            <TimestampRow label="Updated" value={job.updated_at} />
            <TimestampRow label="Completed" value={job.completed_at} />
          </dl>
        </div>
      </div>
    </Card>
  );
}

function getRequestTopic(request: SlideshowJobDetail["request"]) {
  const topic = request?.topic;
  return typeof topic === "string" ? topic : undefined;
}

function TimestampRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) {
    return null;
  }

  return (
    <div>
      <dt className="inline font-medium text-slate-700">{label}: </dt>
      <dd className="inline">{formatDateTime(value)}</dd>
    </div>
  );
}

function statusTone(status: SlideshowJobStatus) {
  if (status === "queued") return "queued";
  if (status === "running") return "running";
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  return "unknown";
}
