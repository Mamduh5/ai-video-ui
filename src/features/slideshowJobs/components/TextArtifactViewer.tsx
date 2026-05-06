import { useTextArtifact } from "../hooks";

import { ArtifactPanel } from "./ArtifactPanel";

interface TextArtifactViewerProps {
  title: string;
  description?: string;
  url?: string | null;
}

export function TextArtifactViewer({
  description,
  title,
  url,
}: TextArtifactViewerProps) {
  const query = useTextArtifact(url);

  return (
    <ArtifactPanel
      description={description}
      error={query.error}
      isEmpty={!query.data}
      isEnabled={Boolean(url)}
      isLoading={query.isLoading}
      onRefresh={() => void query.refetch()}
      title={title}
    >
      <div className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800">
        {query.data}
      </div>
    </ArtifactPanel>
  );
}

