import { useParams } from "react-router-dom";

import { Card } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/StatusBadge";

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Job Detail</h2>
          <p className="mt-1 text-sm text-slate-600">
            This route is ready for created jobs. Polling, status, artifacts,
            and final video preview are planned for F5/F6/F7.
          </p>
        </div>

        <Card>
          <div className="flex flex-col gap-3">
            <StatusBadge label="Placeholder" />
            <h3 className="text-base font-semibold">Slideshow job shell</h3>
            <p className="text-sm text-slate-600">
              Route parameter:
              {" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                {jobId ?? "missing"}
              </code>
            </p>
            <p className="max-w-2xl text-sm text-slate-600">
              This page does not fetch job detail yet. It only confirms the
              route target after create-job submission.
            </p>
          </div>
        </Card>
      </div>

      <Card className="h-fit">
        <div className="space-y-3">
          <h3 className="text-base font-semibold">Planned detail panel</h3>
          <p className="text-sm text-slate-600">
            This side panel will eventually show current step, artifact
            readiness, manual refresh, and friendly error details. No polling is
            implemented in this slice.
          </p>
        </div>
      </Card>
    </div>
  );
}
