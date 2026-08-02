import { GraduationCap, MapPin, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/dashboard/primitives";
import { ExamFormDialog } from "@/components/planner/exam-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { usePlanner } from "@/lib/planner/use-planner";
import { countdownLabel, daysUntil, friendlyDate } from "@/lib/planner/utils";
import { cn } from "@/lib/utils";

export function UpcomingExams({ planner }: { planner: ReturnType<typeof usePlanner> }) {
  const { upcomingExams, addExam, deleteExam } = planner;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Upcoming exams</h2>
          <p className="text-sm text-muted-foreground">{upcomingExams.length} scheduled</p>
        </div>
        <ExamFormDialog onCreate={addExam} />
      </div>

      {upcomingExams.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No exams scheduled"
          description="Add an exam to see a live countdown here."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {upcomingExams.map((exam) => {
            const days = daysUntil(exam.date);
            const soon = days <= 3;
            return (
              <li key={exam.id} className="surface-card space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{exam.title}</p>
                    <p className="text-xs text-muted-foreground">{exam.subject ?? "General"}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${exam.title}`}
                    onClick={() => deleteExam(exam.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={cn(soon ? "bg-destructive/10 text-destructive" : "bg-secondary")}
                    variant="secondary"
                  >
                    {countdownLabel(exam.date)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {friendlyDate(exam.date)}
                    {exam.time ? ` · ${exam.time}` : ""}
                  </span>
                </div>
                {exam.location && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" /> {exam.location}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
