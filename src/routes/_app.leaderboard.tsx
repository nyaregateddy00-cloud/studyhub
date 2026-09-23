import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Crown, Flame, Medal, Trophy } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { initialsOf } from "@/services/user.service";
import {
  LeaderboardService,
  type LeaderboardEntry,
  type LeaderboardScope,
} from "@/services/leaderboard.service";

export const Route = createFileRoute("/_app/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — StudyHub" },
      {
        name: "description",
        content:
          "See how you rank against other StudyHub students by points earned from notes, quizzes and study tasks.",
      },
      { property: "og:title", content: "Leaderboard — StudyHub" },
      {
        property: "og:description",
        content: "Live student rankings by points, level and study streak.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeaderboardPage,
});

const scopes: { value: LeaderboardScope; label: string }[] = [
  { value: "global", label: "Everyone" },
  { value: "university", label: "My university" },
  { value: "programme", label: "My programme" },
];

function LeaderboardPage() {
  const { user } = useAuth();
  const [scope, setScope] = useState<LeaderboardScope>("global");

  const boardQuery = useQuery({
    queryKey: ["leaderboard", scope],
    queryFn: () => LeaderboardService.list(scope, 50),
    staleTime: 30_000,
  });

  const rankQuery = useQuery({
    queryKey: ["leaderboard-me", scope],
    queryFn: () => LeaderboardService.myRank(scope),
    staleTime: 30_000,
  });

  const rows = boardQuery.data ?? [];
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  const me = rankQuery.data;

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Leaderboard"
        description="Points come from uploading notes, helping classmates, finishing quizzes and completing study tasks."
      />

      <Tabs value={scope} onValueChange={(value) => setScope(value as LeaderboardScope)}>
        <TabsList className="grid w-full grid-cols-3 sm:w-auto rounded-xl">
          {scopes.map((item) => (
            <TabsTrigger key={item.value} value={item.value} className="truncate px-3 rounded-lg font-medium">
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {me && (
        <div className="surface-card flex flex-wrap items-center gap-4 p-5 rounded-2xl border-primary/30 bg-primary/5 shadow-xs">
          <div className="flex size-13 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-display text-xl font-bold shadow-xs">
            #{me.rank}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display font-semibold text-base text-foreground">Your position</p>
            <p className="text-sm text-muted-foreground font-medium">
              <span className="text-foreground font-bold">{me.points} points</span> · Level {me.level} · out of {me.total_users} students
            </p>
          </div>
          <Badge variant="secondary" className="px-3 py-1 font-semibold text-amber-500 bg-amber-500/10 border-amber-500/20">
            <Flame className="mr-1.5 size-3.5 fill-amber-500 text-amber-500" /> {me.streak_days} day streak
          </Badge>
        </div>
      )}

      {boardQuery.isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      )}

      {boardQuery.isError && (
        <div className="surface-card p-6 text-center rounded-2xl">
          <p className="text-sm text-muted-foreground">We couldn&apos;t load the rankings.</p>
          <Button className="mt-3 rounded-xl" variant="outline" onClick={() => boardQuery.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!boardQuery.isLoading && !boardQuery.isError && rows.length === 0 && (
        <div className="surface-card p-8 text-center rounded-2xl">
          <Trophy className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">No rankings yet</p>
          <p className="text-sm text-muted-foreground">
            {scope === "global"
              ? "Earn your first points by uploading a note or finishing a quiz."
              : "Add your university and programme in your profile to see this ranking."}
          </p>
        </div>
      )}

      {podium.length > 0 && (
        <div className="grid grid-cols-3 items-end gap-2.5 sm:gap-4 pt-2">
          {podium.map((row, index) => (
            <PodiumCard key={row.user_id} row={row} place={index + 1} isMe={row.user_id === user?.id} />
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <ul className="surface-card divide-y divide-border/70 rounded-2xl border-border/80 shadow-xs overflow-hidden">
          {rest.map((row) => (
            <li
              key={row.user_id}
              className={cn(
                "flex items-center gap-3 p-3 sm:p-4 transition-colors hover:bg-secondary/40",
                row.user_id === user?.id && "bg-primary/5 font-semibold",
              )}
            >
              <span className="w-8 text-sm font-bold text-muted-foreground tabular-nums">#{row.rank}</span>
              <Avatar className="size-9 ring-1 ring-border">
                <AvatarImage src={row.avatar_url ?? undefined} alt="" />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initialsOf(row.display_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <Link
                  to="/u/$userId"
                  params={{ userId: row.user_id }}
                  className={cn(
                    "truncate text-sm font-semibold hover:underline block",
                    row.user_id === user?.id && "text-primary",
                  )}
                >
                  {row.display_name ?? row.username ?? "Student"}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {row.university ?? "University not set"}
                  {row.programme ? ` · ${row.programme}` : ""}
                </p>
              </div>
              <span className="hidden text-xs text-muted-foreground sm:inline font-medium">Lv {row.level}</span>
              <span className="text-sm font-bold text-foreground tabular-nums">{row.points} pts</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PodiumCard({
  row,
  place,
  isMe,
}: {
  row: LeaderboardEntry;
  place: number;
  isMe: boolean;
}) {
  const order = place === 1 ? "order-2" : place === 2 ? "order-1" : "order-3";
  const podiumStyles =
    place === 1
      ? "podium-gold border-amber-400/60 shadow-md sm:-translate-y-2"
      : place === 2
        ? "podium-silver border-slate-300/60 shadow-sm"
        : "podium-bronze border-amber-600/60 shadow-sm";

  return (
    <Link
      to="/u/$userId"
      params={{ userId: row.user_id }}
      className={cn(
        "surface-card flex min-w-0 flex-col items-center p-3 text-center transition-all duration-200 hover:-translate-y-1 sm:p-6 rounded-3xl",
        order,
        podiumStyles,
        isMe && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      <div className="flex items-center justify-center">
        {place === 1 ? (
          <span className="grid size-8 place-items-center rounded-full bg-amber-400 text-amber-950 font-bold text-xs shadow-xs">
            <Crown className="size-4.5 fill-amber-950" />
          </span>
        ) : place === 2 ? (
          <span className="grid size-7 place-items-center rounded-full bg-slate-300 dark:bg-slate-400 text-slate-900 font-bold text-xs shadow-xs">
            2
          </span>
        ) : (
          <span className="grid size-7 place-items-center rounded-full bg-amber-600 text-white font-bold text-xs shadow-xs">
            3
          </span>
        )}
      </div>

      <Avatar className={cn("mt-2.5 ring-2 ring-offset-2 ring-offset-background", place === 1 ? "size-14 sm:size-18 ring-amber-400" : "size-11 sm:size-14 ring-border")}>
        <AvatarImage src={row.avatar_url ?? undefined} alt="" />
        <AvatarFallback className="font-bold text-sm bg-primary/10 text-primary">
          {initialsOf(row.display_name)}
        </AvatarFallback>
      </Avatar>

      <p className="mt-2 w-full truncate font-display text-xs font-bold text-foreground sm:text-sm">
        {row.display_name ?? row.username ?? "Student"}
      </p>
      <p className="hidden w-full truncate text-[11px] text-muted-foreground sm:block font-medium">
        {row.university ?? "StudyHub"}
      </p>
      <p className="mt-1 text-sm font-bold text-foreground sm:text-lg tabular-nums">
        {row.points} <span className="text-xs font-semibold text-muted-foreground">pts</span>
      </p>
      <Badge className="mt-1 hidden sm:inline-flex text-[10px] px-2 py-0" variant="secondary">
        Level {row.level}
      </Badge>
    </Link>
  );
}
