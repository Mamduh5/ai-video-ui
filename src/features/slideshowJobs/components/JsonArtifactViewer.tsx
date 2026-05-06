import { useJsonArtifact } from "../hooks";

import { ArtifactPanel } from "./ArtifactPanel";

interface JsonArtifactViewerProps {
  title: string;
  description?: string;
  url?: string | null;
}

export function JsonArtifactViewer({
  description,
  title,
  url,
}: JsonArtifactViewerProps) {
  const query = useJsonArtifact<unknown>(url);

  return (
    <ArtifactPanel
      description={description}
      error={query.error}
      isEmpty={query.data === undefined}
      isEnabled={Boolean(url)}
      isLoading={query.isLoading}
      onRefresh={() => void query.refetch()}
      title={title}
    >
      <pre className="max-h-96 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-50">
        {JSON.stringify(query.data, null, 2)}
      </pre>
    </ArtifactPanel>
  );
}

