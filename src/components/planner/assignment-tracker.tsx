import { ClipboardList, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/dashboard/primitives";
import { AssignmentFormDialog } from "@/components/planner/assignment-form-dialog";
import { PriorityBadge } from "@/components/planner/priority-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssignmentStatus } from "@/lib/planner/types";
import type { usePlanner } from "@/lib/planner/use-planner";
import { daysUntil, friendlyDate } from "@/lib/planner/utils";
import { cn } from "@/lib/utils";

const COLUMNS: { status: AssignmentStatus; label: string }[] = [
  { status: "not_started", label: "Not started" },
  { status: "in_progress", label: "In progress" },
  { status: "submitted", label: "Submitted" },
];

export function AssignmentTracker({ planner }: { planner: ReturnType<typeof usePlanner> }) {
  const { assignments, addAssignment, updateAssignmentStatus, deleteAssignment } = planner;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Assignment tracker</h2>
          <p className="text-sm text-muted-foreground">{assignments.length} total</p>
        </div>
        <AssignmentFormDialog onCreate={addAssignment} />
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No assignments yet"
          description="Track coursework and deadlines here."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((column) => {
            const items = assignments.filter((item) => item.status === column.status);
            return (
              <div key={column.status} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  {column.label}
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((assignment) => {
                    const overdue =
                      assignment.status !== "submitted" && daysUntil(assignment.dueDate) < 0;
                    return (
                      <div key={assignment.id} className="surface-card space-y-2 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-medium">{assignment.title}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${assignment.title}`}
                            onClick={() => deleteAssignment(assignment.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {assignment.subject ?? "General"}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <PriorityBadge priority={assignment.priority} />
                          <span
                            className={cn(
                              "text-xs",
                              overdue ? "font-medium text-destructive" : "text-muted-foreground",
                            )}
                          >
                            Due {friendlyDate(assignment.dueDate)}
                          </span>
                        </div>
                        <Select
                          value={assignment.status}
                          onValueChange={(value) =>
                            updateAssignmentStatus(assignment.id, value as AssignmentStatus)
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLUMNS.map((c) => (
                              <SelectItem key={c.status} value={c.status}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
