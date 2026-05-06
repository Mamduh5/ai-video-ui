import { Link } from "react-router-dom";

import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { getSlideshowStepLabel } from "../status";
import type { SlideshowJobDetail } from "../types";

interface FailurePanelProps {
  job: SlideshowJobDetail;
}

export function FailurePanel({ job }: FailurePanelProps) {
  const failedStep = job.error?.step ?? job.current_step ?? job.progress?.step;

  return (
    <Card className="border-red-200 bg-red-50">
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-red-950">
            Slideshow job failed
          </h3>
          <p className="mt-1 text-sm text-red-800">
            {job.error?.message ||
              "The backend reported a failure while generating this slideshow."}
          </p>
        </div>
        <p className="text-sm text-red-900">
          Failed step: {getSlideshowStepLabel(failedStep)}
        </p>
        <p className="text-sm text-red-800">
          Recommended action: check backend logs or create a new job with
          adjusted inputs.
        </p>
        <details>
          <summary className="cursor-pointer text-sm font-medium text-red-900">
            Technical details
          </summary>
          <pre className="mt-2 whitespace-pre-wrap rounded-md bg-white p-3 text-xs text-red-950">
            {JSON.stringify(
              {
                jobId: job.id,
                status: job.status,
                current_step: job.current_step,
                error: job.error,
              },
              null,
              2,
            )}
          </pre>
        </details>
        <Button variant="secondary">
          <Link to="/create">Create another job</Link>
        </Button>
      </div>
    </Card>
  );
}

