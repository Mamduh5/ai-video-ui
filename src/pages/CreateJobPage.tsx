import { Card } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/StatusBadge";

export function CreateJobPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Create Presentation Video</h2>
        <p className="mt-1 text-sm text-slate-600">
          This placeholder will become the structured slideshow job form.
        </p>
      </div>

      <Card>
        <div className="flex flex-col gap-3">
          <StatusBadge label="F4 planned" tone="queued" />
          <h3 className="text-base font-semibold">
            Structured form is intentionally deferred
          </h3>
          <p className="max-w-2xl text-sm text-slate-600">
            A later phase will submit structured requests to
            {" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
              /slideshow-video-jobs
            </code>
            . This scaffold does not implement validation, mutations, or
            backend calls.
          </p>
        </div>
      </Card>
    </div>
  );
}

