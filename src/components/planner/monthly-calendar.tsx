import { format } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/dashboard/primitives";
import { PriorityBadge } from "@/components/planner/priority-badge";
import { TaskFormDialog } from "@/components/planner/task-form-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { usePlanner } from "@/lib/planner/use-planner";
import { monthGrid, shiftMonth, toISO, todayISO } from "@/lib/planner/utils";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthlyCalendar({ planner }: { planner: ReturnType<typeof usePlanner> }) {
  const [anchor, setAnchor] = useState(new Date());
  const [selected, setSelected] = useState(todayISO());
  const { tasks, exams, addTask, toggleTaskComplete } = planner;

  const cells = useMemo(() => monthGrid(anchor), [anchor]);

  const countsByDay = useMemo(() => {
    const map = new Map<string, { tasks: number; exams: number }>();
    for (const task of tasks) {
      const entry = map.get(task.date) ?? { tasks: 0, exams: 0 };
      entry.tasks += 1;
      map.set(task.date, entry);
    }
    for (const exam of exams) {
      const entry = map.get(exam.date) ?? { tasks: 0, exams: 0 };
      entry.exams += 1;
      map.set(exam.date, entry);
    }
    return map;
  }, [tasks, exams]);

  const selectedTasks = tasks
    .filter((task) => task.date === selected)
    .sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));
  const selectedExams = exams.filter((exam) => exam.date === selected);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{format(anchor, "MMMM yyyy")}</h2>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous month"
              onClick={() => setAnchor((a) => shiftMonth(a, -1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next month"
              onClick={() => setAnchor((a) => shiftMonth(a, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map(({ date, inCurrentMonth }) => {
            const iso = toISO(date);
            const counts = countsByDay.get(iso);
            const isToday = iso === todayISO();
            const isSelected = iso === selected;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelected(iso)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-transparent p-1 text-sm transition-colors hover:bg-secondary/60",
                  !inCurrentMonth && "text-muted-foreground/40",
                  isSelected && "border-primary bg-primary/10 font-semibold text-primary",
                  isToday && !isSelected && "border-border bg-secondary/50 font-semibold",
                )}
              >
                <span>{format(date, "d")}</span>
                {counts && (counts.tasks > 0 || counts.exams > 0) && (
                  <span className="flex items-center gap-0.5">
                    {counts.tasks > 0 && <span className="size-1.5 rounded-full bg-primary" />}
                    {counts.exams > 0 && <span className="size-1.5 rounded-full bg-destructive" />}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="surface-card space-y-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{format(new Date(selected), "EEEE, MMM d")}</h3>
          <TaskFormDialog
            date={selected}
            onCreate={addTask}
            trigger={
              <Button variant="outline" size="sm">
                Add
              </Button>
            }
          />
        </div>

        {selectedExams.length > 0 && (
          <div className="space-y-1.5">
            {selectedExams.map((exam) => (
              <div
                key={exam.id}
                className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive"
              >
                <span className="font-medium">{exam.title}</span>
                {exam.time ? ` · ${exam.time}` : ""}
              </div>
            ))}
          </div>
        )}

        {selectedTasks.length === 0 && selectedExams.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nothing on this day"
            description="Add a task to fill the gap."
          />
        ) : (
          <ul className="space-y-2">
            {selectedTasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-2 rounded-lg border border-border p-2"
              >
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => toggleTaskComplete(task.id)}
                  aria-label={`Mark ${task.title} complete`}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn("truncate text-xs font-medium", task.completed && "line-through")}
                  >
                    {task.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{task.subject ?? "General"}</p>
                </div>
                <PriorityBadge priority={task.priority} className="px-1.5 py-0 text-[10px]" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
