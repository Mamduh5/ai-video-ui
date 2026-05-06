import { useObjectUrl } from "../../../lib/objectUrl";
import { getArtifactUrl } from "../api";
import { useBlobArtifact } from "../hooks";
import type { SlideshowJobDetail } from "../types";

import { ArtifactPanel } from "./ArtifactPanel";

interface FinalVideoPanelProps {
  job: SlideshowJobDetail;
}

export function FinalVideoPanel({ job }: FinalVideoPanelProps) {
  const shouldFetchVideo = job.status === "completed" && Boolean(job.artifacts?.video);
  const videoUrl = shouldFetchVideo
    ? getArtifactUrl(job.id, { type: "video" })
    : null;
  const query = useBlobArtifact(videoUrl, shouldFetchVideo);
  const objectUrl = useObjectUrl(query.data);
  const filename = `slideshow-video-${job.id}.mp4`;

  if (job.status !== "completed") {
    return (
      <ArtifactPanel
        description="The final rendered MP4 will appear here after rendering completes."
        isEnabled={false}
        title="Final Video"
        emptyMessage="Final video will appear after rendering completes."
      />
    );
  }

  return (
    <ArtifactPanel
      description="Final rendered MP4 from the slideshow render artifact."
      error={query.error}
      isEmpty={!objectUrl}
      isEnabled={Boolean(videoUrl)}
      isLoading={query.isLoading}
      onRefresh={() => void query.refetch()}
      title="Final Video"
      emptyMessage="The video artifact is not marked available yet."
    >
      {objectUrl ? (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-md border border-slate-200 bg-black">
            <video
              aria-label="Final slideshow video"
              className="max-h-[70vh] w-full"
              controls
              src={objectUrl}
            />
          </div>
          <a
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            download={filename}
            href={objectUrl}
          >
            Download MP4
          </a>
        </div>
      ) : null}
    </ArtifactPanel>
  );
}
