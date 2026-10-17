import { useId, type ReactNode } from "react";

export function ProjectDrawer({ title, label, open, onOpenChange, children, className = "" }: {
  title: string;
  label?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}) {
  const contentId = useId();
  return <section className={`project-drawer rounded-xl border bg-white p-5 ${className}`} aria-label={label ?? title}>
    <h3><button type="button" className="project-drawer-toggle flex w-full items-center justify-between gap-3 text-left text-lg font-semibold" aria-expanded={open} aria-controls={contentId} onClick={() => onOpenChange(!open)}>
      {title}<span aria-hidden="true" className="text-slate-500">{open ? "−" : "+"}</span>
    </button></h3>
    <div id={contentId} hidden={!open} className="mt-4 space-y-3">{children}</div>
  </section>;
}
