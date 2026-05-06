import { useObjectUrl } from "../../../lib/objectUrl";
import { useBlobArtifact } from "../hooks";

import { ArtifactPanel } from "./ArtifactPanel";

interface ImageArtifactViewerProps {
  title: string;
  alt: string;
  url?: string | null;
}

export function ImageArtifactViewer({ alt, title, url }: ImageArtifactViewerProps) {
  const query = useBlobArtifact(url);
  const objectUrl = useObjectUrl(query.data);

  return (
    <ArtifactPanel
      error={query.error}
      isEmpty={!objectUrl}
      isEnabled={Boolean(url)}
      isLoading={query.isLoading}
      onRefresh={() => void query.refetch()}
      title={title}
    >
      {objectUrl ? (
        <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-100">
          <img alt={alt} className="h-auto w-full object-contain" src={objectUrl} />
        </div>
      ) : null}
    </ArtifactPanel>
  );
}

