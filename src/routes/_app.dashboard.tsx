import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { BookOpen, Flame, Layers, ListChecks, Sparkles, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — StudyHub" },
      { name: "description", content: "Your streak, XP, recent notes and quiz activity in StudyHub." },
      { property: "og:title", content: "Dashboard — StudyHub" },
      { property: "og:description", content: "Track your streak, XP and recent study activity." },
    ],
  }),
  component: Dashboard,
});

const quotes = [
  "Small daily progress beats one heroic all-nighter.",
  "You don't have to be brilliant today, just consistent.",
  "Recall beats re-reading. Test yourself.",
  "Twenty focused minutes is a real study session.",
];

function Dashboard() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const [profile, notes, quizzes, attempts, decks] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        supabase
          .from("notes")
          .select("id,title,course,created_at")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("quizzes").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase
          .from("quiz_attempts")
          .select("score,total,created_at")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("flashcard_decks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id),
      ]);

      return {
        profile: profile.data,
        notes: notes.data ?? [],
        quizCount: quizzes.count ?? 0,
        attempts: attempts.data ?? [],
        deckCount: decks.count ?? 0,
      };
    },
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-56" />
      </div>
    );
  }

  const xp = data.profile?.xp ?? 0;
  const level = data.profile?.level ?? 1;
  const xpInLevel = xp % 500;
  const quote = quotes[new Date().getDate() % quotes.length];
  const bestScore = data.attempts.length
    ? Math.max(...data.attempts.map((a) => Math.round((a.score / Math.max(a.total, 1)) * 100)))
    : null;

  const stats = [
    { label: "Day streak", value: data.profile?.streak_days ?? 0, icon: Flame, tone: "text-warning" },
    { label: "Notes saved", value: data.notes.length, icon: BookOpen, tone: "text-primary" },
    { label: "Quizzes made", value: data.quizCount, icon: ListChecks, tone: "text-accent" },
    { label: "Card decks", value: data.deckCount, icon: Layers, tone: "text-chart-5" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Hey {data.profile?.display_name?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">{quote}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="surface-card p-5">
            <stat.icon className={`size-5 ${stat.tone}`} />
            <p className="mt-3 text-3xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent notes</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/notes">View all</Link>
            </Button>
          </div>
          {data.notes.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              No notes yet — upload your first lecture PDF or write one.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {data.notes.map((note) => (
                <li key={note.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="truncate text-sm font-medium">{note.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {note.course ?? "General"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="surface-card p-6">
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-warning" />
              <h2 className="text-lg font-semibold">Level {level}</h2>
            </div>
            <Progress value={(xpInLevel / 500) * 100} className="mt-4" />
            <p className="mt-2 text-xs text-muted-foreground">{xpInLevel} / 500 XP to next level</p>
            {bestScore !== null && (
              <p className="mt-3 text-sm text-muted-foreground">
                Best recent quiz: <span className="font-semibold text-foreground">{bestScore}%</span>
              </p>
            )}
          </div>

          <div className="surface-card p-6">
            <Sparkles className="size-5 text-primary" />
            <h2 className="mt-3 text-lg font-semibold">Stuck on something?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask the AI tutor to explain it, or turn a note into a quiz.
            </p>
            <Button asChild className="mt-4 w-full">
              <Link to="/assistant">Ask the tutor</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}