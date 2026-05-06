import type { SelectHTMLAttributes } from "react";

import { cn } from "../../lib/format";

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-100",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

