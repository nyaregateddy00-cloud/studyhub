import { Link } from "@tanstack/react-router";
import { Bot, Download, Infinity as InfinityIcon, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSubscription, useUsageGate } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";

function UsageRow({
  icon: Icon,
  label,
  kind,
}: {
  icon: typeof Bot;
  label: string;
  kind: "ai_message" | "download";
}) {
  const gate = useUsageGate(kind);
  const percent = gate.unlimited ? 100 : Math.round((gate.used / gate.limit) * 100);

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="size-4 text-muted-foreground" />
        <span className="font-medium">{label}</span>
        <span
          className={cn(
            "ml-auto tabular-nums",
            gate.unlimited
              ? "text-success"
              : gate.remaining === 0
                ? "text-destructive"
                : "text-muted-foreground",
          )}
        >
          {gate.unlimited ? (
            <span className="inline-flex items-center gap-1">
              <InfinityIcon className="size-3.5" /> Unlimited
            </span>
          ) : (
            `${gate.remaining} of ${gate.limit} left today`
          )}
        </span>
      </div>
      <Progress
        value={gate.unlimited ? 100 : Math.min(100, percent)}
        className={cn("mt-2 h-1.5", gate.unlimited && "[&>div]:bg-success")}
      />
    </div>
  );
}

/** Shows what's left of today's free allowance, or an unlimited badge on premium. */
export function UsageMeter({ className }: { className?: string }) {
  const { status } = useSubscription();

  return (
    <section className={cn("surface-card p-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Today&apos;s usage</h2>
        {!status.isPremium && (
          <Button asChild size="sm" variant="outline">
            <Link to="/premium">
              <Sparkles className="size-4" /> Go unlimited
            </Link>
          </Button>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:gap-8">
        <UsageRow icon={Bot} label="AI tutor messages" kind="ai_message" />
        <UsageRow icon={Download} label="Note downloads" kind="download" />
      </div>
    </section>
  );
}