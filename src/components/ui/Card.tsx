import type { HTMLAttributes, PropsWithChildren } from "react";

import { cn } from "../../lib/format";

export function Card({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <section
      className={cn("rounded-lg border border-slate-200 bg-white p-6", className)}
      {...props}
    >
      {children}
    </section>
  );
}

