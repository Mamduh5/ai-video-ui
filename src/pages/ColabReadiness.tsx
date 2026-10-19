import { useColabReadiness } from "./useColabReadiness";

export function ColabReadinessStatus({ readiness }: { readiness: ReturnType<typeof useColabReadiness> }) {
  return <div aria-label="Colab readiness" className={`space-y-2 rounded-lg border p-3 text-sm ${readiness.automatic ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
    <p role="status" className="font-semibold">{readiness.label}</p>
    <p><strong>Next action:</strong> {readiness.nextAction}</p>
    {readiness.automatic && <p>Drive synchronization and GPU inference are verified for the current notebook session.</p>}
    {readiness.status?.model && <p>Model: {readiness.status.model}</p>}
    {readiness.status?.error && <p role="alert">{readiness.status.error}</p>}
  </div>;
}

export function ColabCreationReadiness() {
  const readiness = useColabReadiness();
  return <ColabReadinessStatus readiness={readiness}/>;
}