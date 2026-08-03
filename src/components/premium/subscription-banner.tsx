import { Link } from "@tanstack/react-router";
import { Crown, Sparkles, TimerReset } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";

/** Trial countdown / plan status strip shown at the top of the dashboard. */
export function SubscriptionBanner() {
  const { status, isLoading } = useSubscription();
  if (isLoading) return null;

  const config =
    status.plan === "premium"
      ? {
          icon: Crown,
          tone: "border-warning/30 bg-warning/10",
          title: "Premium active",
          body: `${status.premiumDaysLeft} day${status.premiumDaysLeft === 1 ? "" : "s"} of unlimited StudyHub left.`,
          cta: "Manage plan",
        }
      : status.plan === "trial"
        ? {
            icon: TimerReset,
            tone: "border-primary/30 bg-primary/10",
            title: `${status.trialDaysLeft} day${status.trialDaysLeft === 1 ? "" : "s"} left in your free trial`,
            body: "You have every premium feature unlocked until your trial ends.",
            cta: "See premium",
          }
        : {
            icon: Sparkles,
            tone: "border-border bg-surface",
            title: "You're on the free plan",
            body: "Limited AI tutor messages and downloads each day. Upgrade for KSh 49 / 7 days.",
            cta: "Upgrade to Premium",
          };

  return (
    <div
      className={`animate-in fade-in slide-in-from-top-1 flex flex-wrap items-center gap-3 rounded-2xl border p-4 duration-500 ${config.tone}`}
    >
      <config.icon className="size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{config.title}</p>
        <p className="text-xs text-muted-foreground">{config.body}</p>
      </div>
      <Button asChild size="sm" variant={status.plan === "free" ? "default" : "outline"}>
        <Link to="/premium">{config.cta}</Link>
      </Button>
    </div>
  );
}