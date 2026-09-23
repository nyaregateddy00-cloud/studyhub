import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  badge,
  actions,
  className,
}: {
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="truncate font-display text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2.5 pt-1 sm:pt-0">{actions}</div>}
    </header>
  );
}
