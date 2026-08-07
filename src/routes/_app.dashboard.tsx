import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { SubscriptionBanner } from "@/components/premium/subscription-banner";
import { UsageMeter } from "@/components/premium/usage-meter";
import {
  BarChart3,
  BellRing,
  BookOpen,
  Flame,
  Layers,
  LineChart,
  ListChecks,
  PanelRightOpen,
  Quote,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

import { QuizPerformanceChart, WeeklyHoursChart } from "@/components/dashboard/charts";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { quoteOfTheDay } from "@/components/dashboard/mock-data";
import {
  DashboardCard,
  EmptyState,
  SectionHeader,
  StatTile,
} from "@/components/dashboard/primitives";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { DashboardRightRail } from "@/components/dashboard/right-rail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { levelProgress } from "@/services/user.service";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — StudyHub" },
      {
        name: "description",
        content: "Your streak, XP, recent notes and quiz activity in StudyHub.",
      },
      { property: "og:title", content: "Dashboard — StudyHub" },
      { property: "og:description", content: "Track your streak, XP and recent study activity." },
    ],
  }),
  component: Dashboard,
});

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function relativeDate(value: string) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Dashboard() {
  const { user } = useAuth();
  const [hoursRange, setHoursRange] = useState<"7" | "14">("7");
  const [quizRange, setQuizRange] = useState<"5" | "8">("5");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const since = new Date(Date.now() - 13 * 86_400_000).toISOString().slice(0, 10);
      const [
        profile,
        notes,
        quizzes,
        quizCount,
        attempts,
        decks,
        deckCount,
        cards,
        sessions,
        tasks,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,display_name,avatar_url,institution,course,xp,level,streak_days")
          .eq("id", user!.id)
          .maybeSingle(),
        supabase
          .from("notes")
          .select("id,title,course,created_at")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("quizzes")
          .select("id,title,topic,difficulty,created_at")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("quizzes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id),
        supabase
          .from("quiz_attempts")
          .select("score,total,created_at")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("flashcard_decks")
          .select("id,title,subject,created_at")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("flashcard_decks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id),
        supabase
          .from("flashcards")
          .select("id,deck_id,next_review_at")
          .eq("user_id", user!.id)
          .limit(500),
        supabase
          .from("study_sessions")
          .select("minutes,subject,studied_on")
          .eq("user_id", user!.id)
          .gte("studied_on", since),
        supabase
          .from("study_tasks")
          .select("id,title,subject,due_date,completed")
          .eq("user_id", user!.id)
          .eq("completed", false)
          .order("due_date", { ascending: true })
          .limit(5),
      ]);

      return {
        profile: profile.data,
        notes: notes.data ?? [],
        quizzes: quizzes.data ?? [],
        quizCount: quizCount.count ?? 0,
        attempts: attempts.data ?? [],
        decks: decks.data ?? [],
        deckCount: deckCount.count ?? 0,
        cards: cards.data ?? [],
        sessions: sessions.data ?? [],
        tasks: tasks.data ?? [],
      };
    },
  });

  const derived = useMemo(() => {
    if (!data) return null;

    const days = Number(hoursRange);
    const weekly = Array.from({ length: days }, (_, index) => {
      const date = new Date(Date.now() - (days - 1 - index) * 86_400_000);
      const key = date.toISOString().slice(0, 10);
      const minutes = data.sessions
        .filter((session) => session.studied_on === key)
        .reduce((sum, session) => sum + (session.minutes ?? 0), 0);
      return {
        day: dayLabels[date.getDay()],
        hours: Math.round((minutes / 60) * 10) / 10,
        caption: date.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
      };
    });

    const quizSeries = [...data.attempts]
      .reverse()
      .slice(-Number(quizRange))
      .map((attempt, index) => ({
        label: `#${index + 1}`,
        score: Math.round((attempt.score / Math.max(attempt.total, 1)) * 100),
        caption: `Attempt ${index + 1} · ${new Date(attempt.created_at).toLocaleDateString(
          undefined,
          {
            month: "short",
            day: "numeric",
          },
        )}`,
      }));

    const subjectTotals = new Map<string, number>();
    for (const session of data.sessions) {
      const key = session.subject ?? "General";
      subjectTotals.set(key, (subjectTotals.get(key) ?? 0) + (session.minutes ?? 0));
    }
    const maxSubject = Math.max(1, ...subjectTotals.values());
    const subjects = [...subjectTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, minutes]) => ({
        name,
        minutes,
        percent: Math.round((minutes / maxSubject) * 100),
      }));

    const weekMinutes = data.sessions.reduce((sum, session) => sum + (session.minutes ?? 0), 0);
    const avgScore = data.attempts.length
      ? Math.round(
          data.attempts.reduce((sum, a) => sum + (a.score / Math.max(a.total, 1)) * 100, 0) /
            data.attempts.length,
        )
      : null;
    const dueCards = data.cards.filter(
      (card) => new Date(card.next_review_at).getTime() <= Date.now(),
    ).length;

    return { weekly, quizSeries, subjects, weekMinutes, avgScore, dueCards };
  }, [data, hoursRange, quizRange]);

  if (isLoading || !data || !derived) return <DashboardSkeleton />;

  const xp = data.profile?.xp ?? 0;
  const level = data.profile?.level ?? 1;
  const xpInLevel = levelProgress(xp, level).into;
  const quote = quoteOfTheDay();
  const name = data.profile?.display_name ?? user?.email?.split("@")[0] ?? "there";
  const initials = name.slice(0, 2).toUpperCase();
  const completion = Math.min(
    100,
    Math.round(
      ((data.notes.length ? 25 : 0) +
        (data.quizCount ? 25 : 0) +
        (data.deckCount ? 25 : 0) +
        (data.tasks.length ? 25 : 0)) *
        1,
    ),
  );

  return (
    <div className="space-y-6">
      <SubscriptionBanner />
      <UsageMeter />
      <DashboardCard className="mesh-bg">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-12 shrink-0 border border-border">
              <AvatarImage src={data.profile?.avatar_url ?? undefined} alt={name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold sm:text-2xl">
                Welcome back, {name.split(" ")[0]} 👋
              </h1>
              <p className="truncate text-sm text-muted-foreground">
                {data.profile?.course ?? "Ready for a focused session?"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Zap className="size-3 text-warning" /> Level {level}
            </Badge>
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="xl:hidden"
                  aria-label="Open highlights"
                >
                  <PanelRightOpen className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[92vw] max-w-sm overflow-y-auto p-4">
                <SheetHeader className="p-0 pb-3">
                  <SheetTitle>Highlights</SheetTitle>
                </SheetHeader>
                <DashboardRightRail deadlines={data.tasks} />
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-secondary/60 p-3">
          <Quote className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm italic text-muted-foreground">
              “{quote.text}” — {quote.author}
            </p>
            <p className="mt-1 text-xs text-muted-foreground/80">Quote for {quote.dateLabel}</p>
          </div>
        </div>
      </DashboardCard>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Day streak"
          value={data.profile?.streak_days ?? 0}
          hint="Keep it alive today"
          icon={Flame}
          tone="success-tint text-warning"
          delay={0}
        />
        <StatTile
          label="Total XP"
          value={xp}
          hint={`${xpInLevel} / 500 to level ${level + 1}`}
          icon={Trophy}
          tone="brand-tint text-primary"
          delay={60}
        />
        <StatTile
          label="Studied this fortnight"
          value={`${Math.round((derived.weekMinutes / 60) * 10) / 10} h`}
          icon={LineChart}
          tone="success-tint text-success"
          delay={120}
        />
        <StatTile
          label="Cards due now"
          value={derived.dueCards}
          hint={`${data.deckCount} decks`}
          icon={Layers}
          tone="brand-tint text-chart-5"
          delay={180}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <DashboardCard>
            <SectionHeader title="Quick actions" icon={Sparkles} />
            <div className="mt-4">
              <QuickActions />
            </div>
          </DashboardCard>

          <DashboardCard>
            <SectionHeader title="Learning progress" icon={Target} />
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Level {level} progress</span>
                  <span className="font-medium">{xpInLevel} / 500 XP</span>
                </div>
                <Progress value={(xpInLevel / 500) * 100} className="mt-2" />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Toolkit set up</span>
                  <span className="font-medium">{completion}%</span>
                </div>
                <Progress value={completion} className="mt-2" />
              </div>
              {derived.avgScore !== null && (
                <p className="text-sm text-muted-foreground">
                  Average recent quiz score:{" "}
                  <span className="font-semibold text-foreground">{derived.avgScore}%</span>
                </p>
              )}
            </div>
          </DashboardCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <DashboardCard>
              <SectionHeader
                title="Study hours"
                icon={LineChart}
                action={
                  <ToggleGroup
                    type="single"
                    size="sm"
                    value={hoursRange}
                    onValueChange={(value) => value && setHoursRange(value as "7" | "14")}
                    variant="outline"
                  >
                    <ToggleGroupItem value="7" aria-label="Last 7 days">
                      7d
                    </ToggleGroupItem>
                    <ToggleGroupItem value="14" aria-label="Last 14 days">
                      14d
                    </ToggleGroupItem>
                  </ToggleGroup>
                }
              />
              <div className="mt-4">
                <WeeklyHoursChart data={derived.weekly} />
              </div>
            </DashboardCard>
            <DashboardCard>
              <SectionHeader
                title="Quiz performance"
                icon={BarChart3}
                action={
                  <ToggleGroup
                    type="single"
                    size="sm"
                    value={quizRange}
                    onValueChange={(value) => value && setQuizRange(value as "5" | "8")}
                    variant="outline"
                  >
                    <ToggleGroupItem value="5" aria-label="Last 5 attempts">
                      5
                    </ToggleGroupItem>
                    <ToggleGroupItem value="8" aria-label="Last 8 attempts">
                      8
                    </ToggleGroupItem>
                  </ToggleGroup>
                }
              />
              <div className="mt-4">
                {derived.quizSeries.length === 0 ? (
                  <EmptyState
                    icon={ListChecks}
                    title="No attempts yet"
                    description="Take a quiz and your scores will chart here."
                    action={
                      <Button asChild size="sm" className="mt-2">
                        <Link to="/quizzes">Generate a quiz</Link>
                      </Button>
                    }
                  />
                ) : (
                  <QuizPerformanceChart data={derived.quizSeries} />
                )}
              </div>
            </DashboardCard>
          </div>

          <DashboardCard>
            <SectionHeader title="Subject progress" icon={BookOpen} />
            {derived.subjects.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={BookOpen}
                  title="No study time logged"
                  description="Log sessions in the planner to see subject breakdowns."
                />
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {derived.subjects.map((subject) => (
                  <div key={subject.name} className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-medium">{subject.name}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {Math.round((subject.minutes / 60) * 10) / 10} h
                      </span>
                    </div>
                    <Progress value={subject.percent} className="mt-3" />
                  </div>
                ))}
              </div>
            )}
          </DashboardCard>

          <DashboardCard>
            <SectionHeader
              title="Upcoming reminders"
              icon={BellRing}
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link to="/planner">Planner</Link>
                </Button>
              }
            />
            {data.tasks.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={BellRing}
                  title="No reminders"
                  description="Schedule study tasks and they'll appear here."
                  action={
                    <Button asChild size="sm" className="mt-2">
                      <Link to="/planner">Plan a session</Link>
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {data.tasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.subject ?? "General"}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {task.due_date
                        ? new Date(task.due_date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        : "No date"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>

          <div className="grid gap-4 lg:grid-cols-3">
            <DashboardCard>
              <SectionHeader
                title="Recent notes"
                icon={BookOpen}
                action={
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/notes">All</Link>
                  </Button>
                }
              />
              {data.notes.length === 0 ? (
                <div className="mt-3">
                  <EmptyState
                    icon={BookOpen}
                    title="No notes yet"
                    description="Upload a lecture PDF or write your first note."
                  />
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {data.notes.map((note) => (
                    <li key={note.id} className="rounded-lg p-2 hover:bg-secondary/60">
                      <p className="truncate text-sm font-medium">{note.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {note.course ?? "General"} · {relativeDate(note.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardCard>

            <DashboardCard>
              <SectionHeader
                title="Recent quizzes"
                icon={ListChecks}
                action={
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/quizzes">All</Link>
                  </Button>
                }
              />
              {data.quizzes.length === 0 ? (
                <div className="mt-3">
                  <EmptyState
                    icon={ListChecks}
                    title="No quizzes yet"
                    description="Turn any note into a quiz in seconds."
                  />
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {data.quizzes.map((quiz) => (
                    <li key={quiz.id} className="rounded-lg p-2 hover:bg-secondary/60">
                      <p className="truncate text-sm font-medium">{quiz.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {quiz.topic ?? quiz.difficulty} · {relativeDate(quiz.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardCard>

            <DashboardCard>
              <SectionHeader
                title="Recent flashcards"
                icon={Layers}
                action={
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/flashcards">All</Link>
                  </Button>
                }
              />
              {data.decks.length === 0 ? (
                <div className="mt-3">
                  <EmptyState
                    icon={Layers}
                    title="No decks yet"
                    description="Generate a deck from your notes to start revising."
                  />
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {data.decks.map((deck) => (
                    <li key={deck.id} className="rounded-lg p-2 hover:bg-secondary/60">
                      <p className="truncate text-sm font-medium">{deck.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {deck.subject ?? "General"} ·{" "}
                        {data.cards.filter((card) => card.deck_id === deck.id).length} cards
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardCard>
          </div>
        </div>

        <div className="hidden xl:block">
          <DashboardRightRail deadlines={data.tasks} />
        </div>
      </div>
    </div>
  );
}
