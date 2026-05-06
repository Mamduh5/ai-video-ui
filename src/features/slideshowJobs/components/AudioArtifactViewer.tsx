import { useObjectUrl } from "../../../lib/objectUrl";
import { useBlobArtifact } from "../hooks";

import { ArtifactPanel } from "./ArtifactPanel";

interface AudioArtifactViewerProps {
  url?: string | null;
}

export function AudioArtifactViewer({ url }: AudioArtifactViewerProps) {
  const query = useBlobArtifact(url);
  const objectUrl = useObjectUrl(query.data);

  return (
    <ArtifactPanel
      description="Voice artifact from the backend when available."
      error={query.error}
      isEmpty={!objectUrl}
      isEnabled={Boolean(url)}
      isLoading={query.isLoading}
      onRefresh={() => void query.refetch()}
      title="Voice"
    >
      {objectUrl ? (
        <audio aria-label="Voice artifact" className="w-full" controls src={objectUrl} />
      ) : null}
    </ArtifactPanel>
  );
}

