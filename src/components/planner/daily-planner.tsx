import { CalendarClock, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/dashboard/primitives";
import { PriorityBadge } from "@/components/planner/priority-badge";
import { TaskFormDialog } from "@/components/planner/task-form-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { usePlanner } from "@/lib/planner/use-planner";
import { formatMinutes, todayISO } from "@/lib/planner/utils";
import { cn } from "@/lib/utils";

export function DailyPlanner({ planner }: { planner: ReturnType<typeof usePlanner> }) {
  const today = todayISO();
  const { todaysTasks, addTask, toggleTaskComplete, deleteTask } = planner;
  const remaining = todaysTasks.filter((task) => !task.completed);
  const done = todaysTasks.filter((task) => task.completed);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Today's plan</h2>
          <p className="text-sm text-muted-foreground">
            {remaining.length} to do · {done.length} done
          </p>
        </div>
        <TaskFormDialog date={today} onCreate={addTask} />
      </div>

      {todaysTasks.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nothing scheduled for today"
          description="Add a task to start planning your day."
        />
      ) : (
        <ul className="space-y-2">
          {[...remaining, ...done].map((task) => (
            <li
              key={task.id}
              className={cn(
                "surface-card flex items-center gap-3 p-4",
                task.completed && "opacity-60",
              )}
            >
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => toggleTaskComplete(task.id)}
                aria-label={`Mark ${task.title} ${task.completed ? "incomplete" : "complete"}`}
              />
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-sm font-medium", task.completed && "line-through")}>
                  {task.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {task.subject ?? "General"} · {formatMinutes(task.durationMinutes)}
                  {task.time ? ` · ${task.time}` : ""}
                </p>
              </div>
              <PriorityBadge priority={task.priority} />
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${task.title}`}
                onClick={() => deleteTask(task.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
