import { StorageWarning } from "../../pages/StoragePage";
import { useLayoutEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";


import { cn } from "../../lib/format";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-md px-3 py-2 text-sm font-medium transition",
    isActive
      ? "bg-slate-900 text-white"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
  );

export function AppLayout() {
  const location = useLocation();
  useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0 }); }, [location.pathname]);
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">
              Ai Video Pipeline
            </p>
            <h1 className="text-2xl font-semibold">
              Video Studio
            </h1>

          </div>
          <nav aria-label="Main navigation" className="flex flex-wrap gap-2">
            <NavLink className={navLinkClass} to="/">
              Projects
            </NavLink>
            <NavLink className={navLinkClass} to="/videos/new">
              New Video
            </NavLink>
            <NavLink className={navLinkClass} to="/gemini-autopilot">Gemini Autopilot</NavLink>
            <NavLink className={navLinkClass} to="/storage">Storage</NavLink>
            <details className="rounded px-3 py-2 text-sm"><summary className="cursor-pointer">Advanced</summary><NavLink className={navLinkClass} to="/create">Slideshow tools</NavLink></details>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-6">
        <StorageWarning/>
        <Outlet />
      </main>
    </div>
  );
}
