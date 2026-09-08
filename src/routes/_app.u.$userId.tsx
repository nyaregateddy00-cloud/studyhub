import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Flame, ListChecks, Trophy } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { LeaderboardService } from "@/services/leaderboard.service";
import { initialsOf, levelProgress } from "@/services/user.service";

export const Route = createFileRoute("/_app/u/$userId")({
  head: () => ({
    meta: [
      { title: "Student profile — StudyHub" },
      {
        name: "description",
        content: "View a StudyHub student's points, level, streak and study activity.",
      },
      { property: "og:title", content: "Student profile — StudyHub" },
      {
        property: "og:description",
        content: "Points, level, streak and contributions of a StudyHub student.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { userId } = Route.useParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: () => LeaderboardService.publicProfile(userId),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="surface-card p-8 text-center">
        <p className="text-sm text-muted-foreground">We couldn&apos;t load this profile.</p>
        <Button className="mt-3" variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="surface-card p-8 text-center">
        <p className="font-semibold">Student not found</p>
        <Button className="mt-3" variant="outline" asChild>
          <Link to="/leaderboard">Back to leaderboard</Link>
        </Button>
      </div>
    );
  }

  const progress = levelProgress(data.xp, data.level);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/leaderboard">
          <ArrowLeft className="mr-1 size-4" /> Leaderboard
        </Link>
      </Button>

      <div className="surface-card flex flex-wrap items-center gap-5 p-6">
        <Avatar className="size-16">
          <AvatarImage src={data.avatar_url ?? undefined} alt="" />
          <AvatarFallback>{initialsOf(data.display_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{data.display_name ?? "Student"}</h1>
          {data.username && <p className="text-sm font-medium text-primary">@{data.username}</p>}
          <p className="text-sm text-muted-foreground">
            {data.programme ?? "Programme not set"} · {data.university ?? "University not set"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              <Trophy className="mr-1 size-3" /> Level {data.level}
            </Badge>
            <Badge variant="secondary">
              <Flame className="mr-1 size-3" /> {data.streak_days} day streak
            </Badge>
            <Badge variant="secondary">{data.points} points</Badge>
          </div>
          <Progress value={progress.percent} className="mt-3 max-w-sm" />
        </div>
      </div>

      {data.bio && <p className="surface-card p-6 text-sm leading-relaxed">{data.bio}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={BookOpen} label="Notes shared" value={data.notes_count} />
        <Stat icon={ListChecks} label="Quizzes completed" value={data.quizzes_completed} />
        <Stat
          icon={Trophy}
          label="Joined"
          value={new Date(data.joined_at).toLocaleDateString(undefined, {
            month: "short",
            year: "numeric",
          })}
        />
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string | number;
}) {
  return (
    <div className="surface-card p-5">
      <Icon className="size-5 text-muted-foreground" />
      <p className="mt-3 text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
