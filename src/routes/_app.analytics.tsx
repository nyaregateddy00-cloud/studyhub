import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileJson, TrendingDown, TrendingUp } from "lucide-react";
import { Suspense, lazy, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const MinutesTrendChart = lazy(() =>
  import("@/components/analytics/analytics-charts").then((m) => ({ default: m.MinutesTrendChart })),
);
const SubjectMinutesChart = lazy(() =>
  import("@/components/analytics/analytics-charts").then((m) => ({
    default: m.SubjectMinutesChart,
  })),
);
const QuizAccuracyChart = lazy(() =>
  import("@/components/analytics/analytics-charts").then((m) => ({ default: m.QuizAccuracyChart })),
);

export const Route = createFileRoute("/_app/analytics")({
  head: () => ({
    meta: [
      { title: "Study Analytics — StudyHub" },
      {
        name: "description",
        content: "Compare study trends over time and export your full study history as PDF or JSON.",
      },
      { property: "og:title", content: "Study Analytics — StudyHub" },
      { property: "og:description", content: "Trends, quiz accuracy and exportable study history." },
    ],
  }),
  component: Analytics,
});

const ranges = { 7: "Last 7 days", 30: "Last 30 days", 90: "Last 90 days" } as const;

function dayKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function Analytics() {
  const { user } = useAuth();
  const [range, setRange] = useState<7 | 30 | 90>(30);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const [sessions, attempts, notes, tasks, profile] = await Promise.all([
        supabase.from("study_sessions").select("id,subject,minutes,studied_on").order("studied_on", { ascending: true }),
        supabase.from("quiz_attempts").select("id,quiz_id,score,total,seconds_taken,created_at").order("created_at", { ascending: true }),
        supabase.from("notes").select("id,title,course,created_at").eq("user_id", user!.id),
        supabase.from("study_tasks").select("id,title,subject,due_date,duration_minutes,priority,completed,created_at"),
        supabase.from("profiles").select("display_name,xp,level,streak_days").eq("id", user!.id).maybeSingle(),
      ]);
      return {
        sessions: sessions.data ?? [],
        attempts: attempts.data ?? [],
        notes: notes.data ?? [],
        tasks: tasks.data ?? [],
        profile: profile.data,
      };
    },
  });

  const view = useMemo(() => {
    if (!data) return null;
    const start = new Date();
    start.setDate(start.getDate() - range);
    const prevStart = new Date();
    prevStart.setDate(prevStart.getDate() - range * 2);

    const minutesIn = (from: Date, to: Date) =>
      data.sessions
        .filter((session) => {
          const day = new Date(session.studied_on);
          return day >= from && day < to;
        })
        .reduce((sum, session) => sum + session.minutes, 0);

    const now = new Date();
    const currentMinutes = minutesIn(start, now);
    const previousMinutes = minutesIn(prevStart, start);

    const series: { date: string; minutes: number; current: number; previous: number }[] = [];
    for (let index = range - 1; index >= 0; index -= 1) {
      const day = new Date();
      day.setDate(day.getDate() - index);
      const key = day.toISOString().slice(0, 10);
      const prevDay = new Date(day);
      prevDay.setDate(prevDay.getDate() - range);
      const prevKey = prevDay.toISOString().slice(0, 10);
      const current = data.sessions
        .filter((session) => dayKey(session.studied_on) === key)
        .reduce((sum, session) => sum + session.minutes, 0);
      const previous = data.sessions
        .filter((session) => dayKey(session.studied_on) === prevKey)
        .reduce((sum, session) => sum + session.minutes, 0);
      series.push({ date: key.slice(5), minutes: current, current, previous });
    }

    const scored = data.attempts.map((attempt) => ({
      date: dayKey(attempt.created_at).slice(5),
      score: Math.round((attempt.score / Math.max(attempt.total, 1)) * 100),
    }));

    const bySubject = Object.entries(
      data.sessions.reduce<Record<string, number>>((acc, session) => {
        const key = session.subject ?? "General";
        acc[key] = (acc[key] ?? 0) + session.minutes;
        return acc;
      }, {}),
    ).map(([subject, minutes]) => ({ subject, minutes }));

    const change =
      previousMinutes === 0
        ? currentMinutes > 0
          ? 100
          : 0
        : Math.round(((currentMinutes - previousMinutes) / previousMinutes) * 100);

    const avgScore = scored.length
      ? Math.round(scored.reduce((sum, item) => sum + item.score, 0) / scored.length)
      : 0;

    return { series, scored, bySubject, currentMinutes, previousMinutes, change, avgScore };
  }, [data, range]);

  function exportJson() {
    if (!data) return;
    const payload = {
      exported_at: new Date().toISOString(),
      profile: data.profile,
      study_sessions: data.sessions,
      quiz_attempts: data.attempts,
      notes: data.notes,
      study_tasks: data.tasks,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `studyhub-history-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("History exported as JSON");
  }

  async function exportPdf() {
    if (!data || !view) return;
    const { default: JsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new JsPDF();

    doc.setFontSize(18);
    doc.text("StudyHub — Study Analytics", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated ${new Date().toLocaleString()}`, 14, 27);

    autoTable(doc, {
      startY: 34,
      head: [["Metric", "Value"]],
      body: [
        ["Range", ranges[range]],
        ["Minutes studied (current)", String(view.currentMinutes)],
        ["Minutes studied (previous)", String(view.previousMinutes)],
        ["Change vs previous period", `${view.change}%`],
        ["Average quiz score", `${view.avgScore}%`],
        ["Notes saved", String(data.notes.length)],
        ["Current streak", String(data.profile?.streak_days ?? 0)],
        ["XP", String(data.profile?.xp ?? 0)],
      ],
    });

    autoTable(doc, {
      head: [["Subject", "Minutes"]],
      body: view.bySubject.map((row) => [row.subject, String(row.minutes)]),
    });

    autoTable(doc, {
      head: [["Date", "Score", "Total", "Seconds"]],
      body: data.attempts
        .slice(-40)
        .map((attempt) => [
          new Date(attempt.created_at).toLocaleDateString(),
          String(attempt.score),
          String(attempt.total),
          String(attempt.seconds_taken),
        ]),
    });

    doc.save(`studyhub-analytics-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("Analytics exported as PDF");
  }

  if (isLoading || !data || !view) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  const TrendIcon = view.change >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="mt-1 text-muted-foreground">
            Compare trends over time and export your full history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(range)} onValueChange={(value) => setRange(Number(value) as 7 | 30 | 90)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ranges).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportJson}>
            <FileJson className="mr-1 size-4" /> JSON
          </Button>
          <Button onClick={exportPdf}>
            <Download className="mr-1 size-4" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-card p-5">
          <p className="text-sm text-muted-foreground">Minutes studied</p>
          <p className="mt-2 text-3xl font-bold">{view.currentMinutes}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <TrendIcon className={view.change >= 0 ? "size-3.5 text-accent" : "size-3.5 text-destructive"} />
            {view.change}% vs previous {range} days
          </p>
        </div>
        <div className="surface-card p-5">
          <p className="text-sm text-muted-foreground">Average quiz score</p>
          <p className="mt-2 text-3xl font-bold">{view.avgScore}%</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-sm text-muted-foreground">Quiz attempts</p>
          <p className="mt-2 text-3xl font-bold">{data.attempts.length}</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-sm text-muted-foreground">Sessions logged</p>
          <p className="mt-2 text-3xl font-bold">{data.sessions.length}</p>
        </div>
      </div>

      <div className="surface-card p-6">
        <h2 className="text-lg font-semibold">Study minutes — this period vs previous</h2>
        <div className="mt-4 h-72">
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <MinutesTrendChart data={view.series} />
          </Suspense>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-6">
          <h2 className="text-lg font-semibold">Minutes by subject</h2>
          <div className="mt-4 h-64">
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              <SubjectMinutesChart data={view.bySubject} />
            </Suspense>
          </div>
        </div>
        <div className="surface-card p-6">
          <h2 className="text-lg font-semibold">Quiz accuracy over time</h2>
          <div className="mt-4 h-64">
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              <QuizAccuracyChart data={view.scored} />
            </Suspense>
          </div>
        </div>
      </div>

      <div className="surface-card p-6">
        <h2 className="text-lg font-semibold">Full quiz history</h2>
        {data.attempts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No attempts recorded yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Date</th>
                  <th>Score</th>
                  <th>Total</th>
                  <th>Accuracy</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...data.attempts].reverse().map((attempt) => (
                  <tr key={attempt.id}>
                    <td className="py-2">{new Date(attempt.created_at).toLocaleDateString()}</td>
                    <td>{attempt.score}</td>
                    <td>{attempt.total}</td>
                    <td>{Math.round((attempt.score / Math.max(attempt.total, 1)) * 100)}%</td>
                    <td>{attempt.seconds_taken}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}