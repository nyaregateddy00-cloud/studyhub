import { Badge } from "@/components/ui/badge";
import { PRIORITY_CLASSES } from "@/lib/design-tokens";
import { PRIORITY_LABEL } from "@/lib/planner/utils";
import { cn } from "@/lib/utils";
import type { Priority } from "@/lib/planner/types";

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <Badge variant="secondary" className={cn(PRIORITY_CLASSES[priority], className)}>
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}
