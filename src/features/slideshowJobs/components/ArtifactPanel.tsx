import type { PropsWithChildren } from "react";

import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { isApiClientError, isArtifactNotReadyError } from "../../../lib/apiClient";

interface ArtifactPanelProps {
  title: string;
  description?: string;
  isEnabled: boolean;
  isLoading?: boolean;
  error?: unknown;
  isEmpty?: boolean;
  onRefresh?: () => void;
  emptyMessage?: string;
}

export function ArtifactPanel({
  children,
  description,
  emptyMessage = "This artifact is not available yet.",
  error,
  isEmpty,
  isEnabled,
  isLoading,
  onRefresh,
  title,
}: PropsWithChildren<ArtifactPanelProps>) {
  return (
    <Card>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm text-slate-600">{description}</p>
            ) : null}
          </div>
          {onRefresh && isEnabled ? (
            <Button disabled={isLoading} onClick={onRefresh} variant="secondary">
              {isLoading ? "Loading..." : "Refresh"}
            </Button>
          ) : null}
        </div>

        {!isEnabled ? <ArtifactNotice>{emptyMessage}</ArtifactNotice> : null}
        {isEnabled && isLoading ? (
          <ArtifactNotice>Loading artifact...</ArtifactNotice>
        ) : null}
        {isEnabled && error ? <ArtifactError error={error} /> : null}
        {isEnabled && !isLoading && !error && isEmpty ? (
          <ArtifactNotice>{emptyMessage}</ArtifactNotice>
        ) : null}
        {isEnabled && !isLoading && !error && !isEmpty ? children : null}
      </div>
    </Card>
  );
}

function ArtifactNotice({ children }: PropsWithChildren) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
      {children}
    </div>
  );
}

function ArtifactError({ error }: { error: unknown }) {
  const message = getArtifactErrorMessage(error);

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
      <p className="text-sm font-medium text-amber-900">{message}</p>
      <details className="mt-2">
        <summary className="cursor-pointer text-sm text-amber-800">
          Technical details
        </summary>
        <pre className="mt-2 whitespace-pre-wrap rounded bg-white p-3 text-xs text-amber-950">
          {stringifyArtifactError(error)}
        </pre>
      </details>
    </div>
  );
}

function getArtifactErrorMessage(error: unknown) {
  if (isArtifactNotReadyError(error)) {
    return "This artifact is still being generated.";
  }

  if (isApiClientError(error)) {
    if (error.category === "not_found") {
      return "This artifact was not found.";
    }

    if (error.category === "network") {
      return "Backend is unavailable. Check that the API is running.";
    }
  }

  return "Could not load this artifact.";
}

function stringifyArtifactError(error: unknown) {
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
