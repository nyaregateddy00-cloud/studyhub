import { Link } from "@tanstack/react-router";
import { BookMarked, Clock, Flame, Megaphone, Sparkles } from "lucide-react";

import { DashboardCard, EmptyState, SectionHeader } from "@/components/dashboard/primitives";
import {
  announcements,
  recommendedMaterials,
  trendingNotes,
} from "@/components/dashboard/mock-data";
import { PlannerWidget } from "@/components/dashboard/planner-widget";
import { Badge } from "@/components/ui/badge";

type Deadline = { id: string; title: string; due_date: string | null; subject: string | null };

function formatDue(due: string | null) {
  if (!due) return "No date";
  const date = new Date(due);
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export function DashboardRightRail({ deadlines }: { deadlines: Deadline[] }) {
  return (
    <aside className="space-y-4">
      <PlannerWidget delay={0} />

      <DashboardCard delay={60}>
        <SectionHeader title="Announcements" icon={Megaphone} />
        <ul className="mt-4 space-y-3">
          {announcements.map((item) => (
            <li key={item.id} className="rounded-xl bg-secondary/50 p-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {item.tag}
                </Badge>
                <p className="min-w-0 truncate text-sm font-medium">{item.title}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ul>
      </DashboardCard>

      <DashboardCard delay={120}>
        <SectionHeader title="Trending notes" icon={Flame} />
        <ul className="mt-3 divide-y divide-border">
          {trendingNotes.map((note) => (
            <li key={note.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{note.title}</p>
                <p className="text-xs text-muted-foreground">{note.course}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">♥ {note.likes}</span>
            </li>
          ))}
        </ul>
        <Link to="/notes" className="story-link mt-3 inline-block text-xs font-medium text-primary">
          Browse all notes
        </Link>
      </DashboardCard>

      <DashboardCard delay={180}>
        <SectionHeader title="Upcoming deadlines" icon={Clock} />
        {deadlines.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={Clock}
              title="Nothing due"
              description="Add tasks in the planner to see deadlines here."
            />
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {deadlines.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.subject ?? "General"}</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-warning">
                  {formatDue(task.due_date)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>

      <DashboardCard delay={240}>
        <SectionHeader title="Recommended" icon={Sparkles} />
        <ul className="mt-3 space-y-2">
          {recommendedMaterials.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-lg p-2 hover:bg-secondary/60"
            >
              <BookMarked className="mt-0.5 size-4 shrink-0 text-accent" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.kind} · {item.minutes} min
                </p>
              </div>
            </li>
          ))}
        </ul>
      </DashboardCard>
    </aside>
  );
}
