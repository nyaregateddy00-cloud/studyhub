import { format, isSameWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { TaskFormDialog } from "@/components/planner/task-form-dialog";
import { PriorityBadge } from "@/components/planner/priority-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { usePlanner } from "@/lib/planner/use-planner";
import { shiftWeek, toISO, weekDays } from "@/lib/planner/utils";
import { cn } from "@/lib/utils";

export function WeeklyTimetable({ planner }: { planner: ReturnType<typeof usePlanner> }) {
  const [anchor, setAnchor] = useState(new Date());
  const { tasks, addTask, toggleTaskComplete } = planner;

  const days = useMemo(() => weekDays(anchor), [anchor]);
  const isCurrentWeek = isSameWeek(anchor, new Date(), { weekStartsOn: 1 });

  const tasksByDay = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    for (const day of days) map.set(toISO(day), []);
    for (const task of tasks) {
      if (map.has(task.date)) map.get(task.date)!.push(task);
    }
    for (const [, list] of map) {
      list.sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));
    }
    return map;
  }, [days, tasks]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Weekly timetable</h2>
          <p className="text-sm text-muted-foreground">
            {format(days[0], "MMM d")} – {format(days[6], "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous week"
            onClick={() => setAnchor((a) => shiftWeek(a, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          {!isCurrentWeek && (
            <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
              This week
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            aria-label="Next week"
            onClick={() => setAnchor((a) => shiftWeek(a, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-7">
        {days.map((day) => {
          const iso = toISO(day);
          const dayTasks = tasksByDay.get(iso) ?? [];
          const isToday = toISO(new Date()) === iso;
          return (
            <div
              key={iso}
              className={cn(
                "surface-card flex min-h-40 flex-col gap-2 p-3",
                isToday && "ring-2 ring-primary/50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {format(day, "EEE")}
                  </p>
                  <p className={cn("text-sm font-semibold", isToday && "text-primary")}>
                    {format(day, "d MMM")}
                  </p>
                </div>
                <TaskFormDialog
                  date={iso}
                  onCreate={addTask}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Add task on ${format(day, "EEEE")}`}
                    >
                      <Plus className="size-4" />
                    </Button>
                  }
                />
              </div>
              <div className="flex-1 space-y-1.5">
                {dayTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No sessions</p>
                ) : (
                  dayTasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-start gap-2 rounded-lg bg-secondary/50 p-2",
                        task.completed && "opacity-60",
                      )}
                    >
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => toggleTaskComplete(task.id)}
                        className="mt-0.5"
                        aria-label={`Mark ${task.title} complete`}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-xs font-medium",
                            task.completed && "line-through",
                          )}
                        >
                          {task.title}
                        </p>
                        {task.time && (
                          <p className="text-[10px] text-muted-foreground">{task.time}</p>
                        )}
                      </div>
                      <PriorityBadge priority={task.priority} className="px-1.5 py-0 text-[10px]" />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
