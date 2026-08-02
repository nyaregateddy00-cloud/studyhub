import { Progress } from "@/components/ui/progress";
import type { usePlanner } from "@/lib/planner/use-planner";
import { formatMinutes } from "@/lib/planner/utils";

export function ProgressOverview({ planner }: { planner: ReturnType<typeof usePlanner> }) {
  const { tasks, completedTasks, completionPercent, weekMinutes, overdueAssignments } = planner;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tasks completed</span>
          <span className="font-medium">
            {completedTasks.length} / {tasks.length || 0}
          </span>
        </div>
        <Progress value={completionPercent} className="mt-2" />
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-secondary/50 p-3">
          <p className="text-xs text-muted-foreground">Studied (7d)</p>
          <p className="text-lg font-semibold">{formatMinutes(weekMinutes)}</p>
        </div>
        <div className="rounded-xl bg-secondary/50 p-3">
          <p className="text-xs text-muted-foreground">Overdue</p>
          <p className="text-lg font-semibold">{overdueAssignments.length}</p>
        </div>
      </div>
    </div>
  );
}
