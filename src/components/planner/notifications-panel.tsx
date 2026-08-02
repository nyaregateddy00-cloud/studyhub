import { Bell, BookOpenCheck, CalendarClock, Flame, Sunrise } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { NotificationPrefs } from "@/lib/planner/types";
import type { usePlanner } from "@/lib/planner/use-planner";
import { countdownLabel } from "@/lib/planner/utils";

const PREF_ROWS: {
  key: keyof NotificationPrefs;
  label: string;
  hint: string;
  icon: typeof Bell;
}[] = [
  {
    key: "taskReminders",
    label: "Task reminders",
    hint: "Nudge before a scheduled session starts",
    icon: CalendarClock,
  },
  {
    key: "examReminders",
    label: "Exam reminders",
    hint: "Alerts as exam dates approach",
    icon: BookOpenCheck,
  },
  {
    key: "dailyDigest",
    label: "Daily digest",
    hint: "Morning summary of today's plan",
    icon: Sunrise,
  },
  {
    key: "streakAlerts",
    label: "Streak alerts",
    hint: "Warn before your streak resets",
    icon: Flame,
  },
];

export function NotificationsPanel({ planner }: { planner: ReturnType<typeof usePlanner> }) {
  const { notificationPrefs, updateNotificationPrefs, todaysTasks, upcomingExams } = planner;

  const preview: string[] = [];
  if (notificationPrefs.taskReminders && todaysTasks.some((t) => !t.completed)) {
    preview.push(`You have ${todaysTasks.filter((t) => !t.completed).length} task(s) left today.`);
  }
  if (notificationPrefs.examReminders && upcomingExams[0]) {
    preview.push(`${upcomingExams[0].title} — ${countdownLabel(upcomingExams[0].date)}.`);
  }
  if (notificationPrefs.dailyDigest) {
    preview.push("Your daily study digest would arrive each morning.");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {PREF_ROWS.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <row.icon className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <Label htmlFor={`pref-${row.key}`} className="text-sm font-medium">
                  {row.label}
                </Label>
                <p className="truncate text-xs text-muted-foreground">{row.hint}</p>
              </div>
            </div>
            <Switch
              id={`pref-${row.key}`}
              checked={notificationPrefs[row.key]}
              onCheckedChange={(checked) => updateNotificationPrefs({ [row.key]: checked })}
            />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-border p-3">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Bell className="size-3.5" /> Preview (UI only — no push sent yet)
        </p>
        {preview.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Nothing to show right now — enable a toggle above or add tasks/exams.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {preview.map((line) => (
              <li key={line} className="text-xs text-foreground">
                {line}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
