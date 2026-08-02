import { Flame } from "lucide-react";

import { cn } from "@/lib/utils";

export function StudyStreak({ streak, className }: { streak: number; className?: string }) {
  const active = streak > 0;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-xl",
          active ? "bg-warning/10 text-warning" : "bg-secondary text-muted-foreground",
        )}
      >
        <Flame className="size-5" />
      </span>
      <div>
        <p className="text-2xl font-bold leading-none">
          {streak}{" "}
          <span className="text-sm font-medium text-muted-foreground">
            day{streak === 1 ? "" : "s"}
          </span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {active
            ? "Keep completing tasks to extend it"
            : "Complete a task today to start a streak"}
        </p>
      </div>
    </div>
  );
}
