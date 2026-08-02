import { Bell, Flame, Target } from "lucide-react";

import { DashboardCard, SectionHeader } from "@/components/dashboard/primitives";
import { NotificationsPanel } from "@/components/planner/notifications-panel";
import { ProgressOverview } from "@/components/planner/progress-overview";
import { StudyStreak } from "@/components/planner/study-streak";
import type { usePlanner } from "@/lib/planner/use-planner";

export function PlannerSidebar({ planner }: { planner: ReturnType<typeof usePlanner> }) {
  return (
    <aside className="space-y-4">
      <DashboardCard>
        <SectionHeader title="Study streak" icon={Flame} />
        <div className="mt-4">
          <StudyStreak streak={planner.streak} />
        </div>
      </DashboardCard>

      <DashboardCard delay={60}>
        <SectionHeader title="Progress" icon={Target} />
        <div className="mt-4">
          <ProgressOverview planner={planner} />
        </div>
      </DashboardCard>

      <DashboardCard delay={120}>
        <SectionHeader title="Notifications" icon={Bell} />
        <div className="mt-4">
          <NotificationsPanel planner={planner} />
        </div>
      </DashboardCard>
    </aside>
  );
}
