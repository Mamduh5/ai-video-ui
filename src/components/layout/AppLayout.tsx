import { NavLink, Outlet } from "react-router-dom";

import { cn } from "../../lib/format";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-md px-3 py-2 text-sm font-medium transition",
    isActive
      ? "bg-slate-900 text-white"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
  );

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">
              Ai Video Pipeline
            </p>
            <h1 className="text-2xl font-semibold">
              Explainer Slideshow Studio
            </h1>
          </div>
          <nav aria-label="Main navigation" className="flex gap-2">
            <NavLink className={navLinkClass} to="/">
              Recent Jobs
            </NavLink>
            <NavLink className={navLinkClass} to="/create">
              Create
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}

