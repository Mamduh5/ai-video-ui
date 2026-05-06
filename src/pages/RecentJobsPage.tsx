import { Link } from "react-router-dom";

import { Card } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/StatusBadge";

export function RecentJobsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Recent Jobs</h2>
          <p className="mt-1 text-sm text-slate-600">
            This placeholder will show recently created slideshow video jobs.
          </p>
        </div>
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          to="/create"
        >
          New video
        </Link>
      </div>

      <Card>
        <div className="flex flex-col gap-3">
          <StatusBadge label="Placeholder" />
          <h3 className="text-base font-semibold">No slideshow jobs yet</h3>
          <p className="max-w-2xl text-sm text-slate-600">
            F1 only establishes routing, providers, layout, styling, and test
            tooling. Local recent-job storage and backend status loading are
            intentionally deferred.
          </p>
        </div>
      </Card>
    </div>
  );
}
