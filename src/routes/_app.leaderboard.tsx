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
    <div className="space-y-8">
      <PageHeader
        title="Leaderboard"
        description="Points come from uploading notes, helping classmates, finishing quizzes and completing study tasks."
      />

      <Tabs value={scope} onValueChange={(value) => setScope(value as LeaderboardScope)}>
        <TabsList className="grid w-full grid-cols-3 sm:w-auto">
          {scopes.map((item) => (
            <TabsTrigger key={item.value} value={item.value} className="truncate px-2">
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {me && (
        <div className="surface-card flex flex-wrap items-center gap-4 p-5">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
            #{me.rank}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Your position</p>
            <p className="text-sm text-muted-foreground">
              {me.points} points · Level {me.level} · out of {me.total_users} students
            </p>
          </div>
          <Badge variant="secondary">
            <Flame className="mr-1 size-3" /> {me.streak_days} day streak
          </Badge>
        </div>
      )}

      {boardQuery.isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      )}

      {boardQuery.isError && (
        <div className="surface-card p-6 text-center">
          <p className="text-sm text-muted-foreground">We couldn&apos;t load the rankings.</p>
          <Button className="mt-3" variant="outline" onClick={() => boardQuery.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!boardQuery.isLoading && !boardQuery.isError && rows.length === 0 && (
        <div className="surface-card p-8 text-center">
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
        <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
          {podium.map((row, index) => (
            <PodiumCard key={row.user_id} row={row} place={index + 1} isMe={row.user_id === user?.id} />
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <ul className="surface-card divide-y divide-border">
          {rest.map((row) => (
            <li
              key={row.user_id}
              className={cn(
                "flex items-center gap-3 p-4",
                row.user_id === user?.id && "bg-primary/5",
              )}
            >
              <span className="w-8 text-sm font-semibold text-muted-foreground">#{row.rank}</span>
              <Avatar className="size-9">
                <AvatarImage src={row.avatar_url ?? undefined} alt="" />
                <AvatarFallback>{initialsOf(row.display_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <Link
                  to="/u/$userId"
                  params={{ userId: row.user_id }}
                  className={cn(
                    "truncate text-sm font-medium hover:underline",
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
              <span className="hidden text-xs text-muted-foreground sm:inline">Lv {row.level}</span>
              <span className="text-sm font-semibold">{row.points} pts</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const medals = ["🥇", "🥈", "🥉"] as const;

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
  return (
    <Link
      to="/u/$userId"
      params={{ userId: row.user_id }}
      className={cn(
        "surface-card flex min-w-0 flex-col items-center p-3 text-center transition hover:-translate-y-0.5 sm:p-6",
        order,
        place === 1 && "sm:-translate-y-2",
        isMe && "ring-2 ring-primary/40",
      )}
    >
      <span className="text-xl sm:text-2xl" aria-hidden>
        {medals[place - 1]}
      </span>
      <Avatar className={cn("mt-2", place === 1 ? "size-12 sm:size-16" : "size-10 sm:size-14")}>
        <AvatarImage src={row.avatar_url ?? undefined} alt="" />
        <AvatarFallback>{initialsOf(row.display_name)}</AvatarFallback>
      </Avatar>
      <p className="mt-2 w-full truncate text-xs font-semibold sm:text-sm">
        {row.display_name ?? row.username ?? "Student"}
      </p>
      <p className="hidden w-full truncate text-xs text-muted-foreground sm:block">
        {row.university ?? "StudyHub"}
      </p>
      <p className="mt-1 text-sm font-bold sm:text-lg">{row.points} pts</p>
      <Badge className="mt-1 hidden sm:inline-flex" variant="secondary">
        Level {row.level}
      </Badge>
    </Link>
  );
}
