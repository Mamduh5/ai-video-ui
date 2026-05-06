import { useParams } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { isApiClientError } from "../lib/apiClient";
import { ArtifactReadinessPanel } from "../features/slideshowJobs/components/ArtifactReadinessPanel";
import { AudioArtifactViewer } from "../features/slideshowJobs/components/AudioArtifactViewer";
import { FailurePanel } from "../features/slideshowJobs/components/FailurePanel";
import { FinalVideoPanel } from "../features/slideshowJobs/components/FinalVideoPanel";
import { JsonArtifactViewer } from "../features/slideshowJobs/components/JsonArtifactViewer";
import { JobStatusHeader } from "../features/slideshowJobs/components/JobStatusHeader";
import { ProgressTimeline } from "../features/slideshowJobs/components/ProgressTimeline";
import { RequestSummaryCard } from "../features/slideshowJobs/components/RequestSummaryCard";
import { SlideArtifactGrid } from "../features/slideshowJobs/components/SlideArtifactGrid";
import { TextArtifactViewer } from "../features/slideshowJobs/components/TextArtifactViewer";
import { getArtifactUrl } from "../features/slideshowJobs/api";
import { useSlideshowJob } from "../features/slideshowJobs/hooks";

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { data, error, isError, isLoading, isRefetching, refetch } =
    useSlideshowJob(jobId);

  if (!jobId) {
    return (
      <Card>
        <h2 className="text-2xl font-semibold">Missing slideshow job ID</h2>
        <p className="mt-2 text-sm text-slate-600">
          Open a valid `/slideshow-jobs/:jobId` route.
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return <JobDetailLoading jobId={jobId} />;
  }

  if (isError) {
    return (
      <JobDetailError
        error={error}
        isRefreshing={isRefetching}
        jobId={jobId}
        onRefresh={() => void refetch()}
      />
    );
  }

  if (!data) {
    return (
      <JobDetailError
        error={new Error("No job detail returned.")}
        isRefreshing={isRefetching}
        jobId={jobId}
        onRefresh={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <JobStatusHeader
        isRefreshing={isRefetching}
        job={data}
        onRefresh={() => void refetch()}
      />

      {data.status === "failed" ? <FailurePanel job={data} /> : null}

      <FinalVideoPanel job={data} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <ProgressTimeline job={data} />
          <RequestSummaryCard job={data} />
          <SlideArtifactGrid job={data} />
          <TextArtifactViewer
            description="Narration/script artifact returned by the backend."
            title="Script"
            url={data.artifacts?.script ? getArtifactUrl(data.id, { type: "script" }) : null}
          />
          <div className="grid gap-6 xl:grid-cols-2">
            <JsonArtifactViewer
              description="Brief artifact as returned by the backend."
              title="Brief"
              url={data.artifacts?.brief ? getArtifactUrl(data.id, { type: "brief" }) : null}
            />
            <JsonArtifactViewer
              description="Slide plan artifact as returned by the backend."
              title="Plan"
              url={data.artifacts?.plan ? getArtifactUrl(data.id, { type: "plan" }) : null}
            />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <AudioArtifactViewer
              url={data.artifacts?.voice ? getArtifactUrl(data.id, { type: "voice" }) : null}
            />
            <JsonArtifactViewer
              description="Render manifest for the assembled slideshow."
              title="Render Manifest"
              url={
                data.artifacts?.render_manifest
                  ? getArtifactUrl(data.id, { type: "render_manifest" })
                  : null
              }
            />
          </div>
        </div>
        <ArtifactReadinessPanel job={data} />
      </div>
    </div>
  );
}

function JobDetailLoading({ jobId }: { jobId: string }) {
  return (
    <Card>
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold">Loading slideshow job</h2>
        <p className="text-sm text-slate-600">
          Fetching status for <span className="font-mono">{jobId}</span>.
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-2 w-1/3 rounded-full bg-slate-300" />
        </div>
      </div>
    </Card>
  );
}

function JobDetailError({
  error,
  isRefreshing,
  jobId,
  onRefresh,
}: {
  error: unknown;
  isRefreshing?: boolean;
  jobId: string;
  onRefresh: () => void;
}) {
  const message = getJobLoadErrorMessage(error);

  return (
    <Card className="border-red-200 bg-red-50">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-red-950">
            Could not load job status
          </h2>
          <p className="mt-1 text-sm text-red-800">{message}</p>
          <p className="mt-2 text-sm text-red-900">
            Job ID: <span className="font-mono">{jobId}</span>
          </p>
        </div>
        <Button disabled={isRefreshing} onClick={onRefresh} variant="secondary">
          {isRefreshing ? "Refreshing..." : "Try again"}
        </Button>
        <details>
          <summary className="cursor-pointer text-sm font-medium text-red-900">
            Technical details
          </summary>
          <pre className="mt-2 whitespace-pre-wrap rounded-md bg-white p-3 text-xs text-red-950">
            {stringifyError(error)}
          </pre>
        </details>
      </div>
    </Card>
  );
}

function getJobLoadErrorMessage(error: unknown) {
  if (isApiClientError(error)) {
    if (error.category === "not_found" || error.status === 404) {
      return "This slideshow job was not found.";
    }

    if (error.category === "network") {
      return "Backend is unavailable. Check that the API is running.";
    }
  }

  return "Could not load slideshow job status.";
}

function stringifyError(error: unknown) {
  if (isApiClientError(error)) {
    return JSON.stringify(
      {
        status: error.status,
        category: error.category,
        message: error.message,
        code: error.code,
        details: error.details,
      },
      null,
      2,
    );
  }

  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  return JSON.stringify(error, null, 2);
}
