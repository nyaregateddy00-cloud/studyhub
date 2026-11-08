import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DashboardCard({
  className,
  children,
  delay = 0,
}: {
  className?: string;
  children: ReactNode;
  delay?: number;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-border/80 bg-gradient-to-b from-card to-card/70 p-5 sm:p-6 shadow-xs backdrop-blur-md transition-all duration-300 animate-fade-in hover:border-primary/25",
        className,
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  action,
  badge,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && (
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
            <Icon className="size-4" />
          </span>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-bold tracking-tight text-foreground font-display">
              {title}
            </h2>
            {badge}
          </div>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand-tint text-primary",
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: string;
  delay?: number;
}) {
  return (
    <div
      className="group relative rounded-3xl border border-border/80 bg-gradient-to-b from-card to-card/60 p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg animate-fade-in overflow-hidden"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-2xl border border-border/40 shadow-xs transition-transform duration-200 group-hover:scale-110",
            tone,
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-4 text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl text-foreground font-display">
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      {hint && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border/50">
            {hint}
          </span>
        </div>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/80 bg-secondary/15 px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary/80 border border-border/60 shadow-xs">
        <Icon className="size-5" />
      </span>
      <p className="text-sm font-bold tracking-tight text-foreground">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground leading-relaxed">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
