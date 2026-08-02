import { Link } from "@tanstack/react-router";
import { CalendarClock, Flame } from "lucide-react";

import { DashboardCard, EmptyState, SectionHeader } from "@/components/dashboard/primitives";
import { PriorityBadge } from "@/components/planner/priority-badge";
import { usePlanner } from "@/lib/planner/use-planner";
import { countdownLabel } from "@/lib/planner/utils";

export function PlannerWidget({ delay = 0 }: { delay?: number }) {
  const planner = usePlanner();
  const remainingToday = planner.todaysTasks.filter((task) => !task.completed);
  const nextExam = planner.upcomingExams[0];

  return (
    <DashboardCard delay={delay}>
      <SectionHeader title="Study planner" icon={CalendarClock} />
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm">
          <Flame className="size-4 text-warning" />
          <span className="font-medium">{planner.streak}</span>
          <span className="text-muted-foreground">day streak</span>
        </div>

        {remainingToday.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Nothing left today"
            description="Plan tomorrow's sessions in the planner."
          />
        ) : (
          <ul className="space-y-2">
            {remainingToday.slice(0, 3).map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm">{task.title}</span>
                <PriorityBadge
                  priority={task.priority}
                  className="shrink-0 px-1.5 py-0 text-[10px]"
                />
              </li>
            ))}
          </ul>
        )}

        {nextExam && (
          <p className="text-xs text-muted-foreground">
            Next exam: <span className="font-medium text-foreground">{nextExam.title}</span> ·{" "}
            {countdownLabel(nextExam.date)}
          </p>
        )}

        <Link to="/planner" className="story-link inline-block text-xs font-medium text-primary">
          Open planner
        </Link>
      </div>
    </DashboardCard>
  );
}
