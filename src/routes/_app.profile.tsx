import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Award, Flame, Medal, Save, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { getLeaderboard } from "@/lib/leaderboard.functions";
import { cn } from "@/lib/utils";
import { levelProgress, UserService } from "@/services/user.service";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Badges — StudyHub" },
      {
        name: "description",
        content: "Your study stats, XP level, earned badges and the StudyHub leaderboard.",
      },
      { property: "og:title", content: "Profile & Badges — StudyHub" },
      {
        property: "og:description",
        content: "Track XP, badges and how you rank against other students.",
      },
    ],
  }),
  component: ProfilePage,
});

const badgeCatalog = [
  { key: "first_note", label: "First note", hint: "Save your first note" },
  { key: "quiz_rookie", label: "Quiz rookie", hint: "Complete a quiz" },
  { key: "streak_7", label: "7-day streak", hint: "Study 7 days in a row" },
  { key: "planner_pro", label: "Planner pro", hint: "Complete 10 planned sessions" },
  { key: "helper", label: "Community helper", hint: "Answer a classmate" },
  { key: "level_5", label: "Level 5", hint: "Reach level 5" },
];

function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [institution, setInstitution] = useState("");
  const [course, setCourse] = useState("");
  const [bio, setBio] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["profile-page", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const [profile, badges, leaderboard, counts] = await Promise.all([
        UserService.getExtendedProfile(user!.id),
        UserService.getBadges(user!.id),
        getLeaderboard(),
        UserService.getActivityCounts(user!.id),
      ]);
      return { profile, badges, leaderboard, ...counts };
    },
  });

  useEffect(() => {
    if (!data?.profile) return;
    setDisplayName(data.profile.display_name ?? "");
    setUsername(data.profile.username ?? "");
    setInstitution(data.profile.institution ?? "");
    setCourse(data.profile.course ?? "");
    setBio(data.profile.bio ?? "");
  }, [data?.profile]);

  const save = useMutation({
    mutationFn: async () => {
      const cleaned = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (cleaned.length < 3) throw new Error("Username needs at least 3 letters or numbers.");
      const free = await UserService.isUsernameAvailable(cleaned, user!.id);
      if (!free) throw new Error("That username is already taken.");
      setUsername(cleaned);
      return UserService.updateProfile(user!.id, {
        display_name: displayName.trim().slice(0, 80) || null,
        username: cleaned,
        institution: institution.trim().slice(0, 120) || null,
        course: course.trim().slice(0, 120) || null,
        bio: bio.trim().slice(0, 500) || null,
      });
    },
    onSuccess: async () => {
      toast.success("Profile updated");
      await queryClient.invalidateQueries({ queryKey: ["profile-page", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["profile-summary", user?.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Award badges the student has clearly earned.
  useEffect(() => {
    if (!data || !user) return;
    const earned = new Set(data.badges.map((badge) => badge.badge_key));
    const shouldHave: string[] = [];
    if (data.noteCount > 0) shouldHave.push("first_note");
    if (data.attemptCount > 0) shouldHave.push("quiz_rookie");
    if ((data.profile?.streak_days ?? 0) >= 7) shouldHave.push("streak_7");
    if (data.completedTasks >= 10) shouldHave.push("planner_pro");
    if (data.answerCount > 0) shouldHave.push("helper");
    if ((data.profile?.level ?? 1) >= 5) shouldHave.push("level_5");
    const missing = shouldHave.filter((key) => !earned.has(key));
    if (missing.length === 0) return;
    void UserService.awardBadges(user.id, missing).then(() =>
      queryClient.invalidateQueries({ queryKey: ["profile-page", user.id] }),
    );
  }, [data, user, queryClient]);

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const xp = data.profile?.xp ?? 0;
  const level = data.profile?.level ?? 1;
  const earned = new Set(data.badges.map((badge) => badge.badge_key));

  return (
    <div className="space-y-8">
      <div className="surface-card flex flex-wrap items-center gap-5 p-6">
        <Avatar className="size-16">
          <AvatarImage src={data.profile?.avatar_url ?? undefined} alt="" />
          <AvatarFallback>{(displayName || "S").slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{displayName || "Student"}</h1>
          {username && <p className="text-sm font-medium text-primary">@{username}</p>}
          <p className="text-sm text-muted-foreground">
            {course || "Course not set"} · {institution || "Institution not set"}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Badge variant="secondary">
              <Trophy className="mr-1 size-3" /> Level {level}
            </Badge>
            <Badge variant="secondary">
              <Flame className="mr-1 size-3" /> {data.profile?.streak_days ?? 0} day streak
            </Badge>
            <Badge variant="secondary">{xp} XP</Badge>
          </div>
          <Progress value={levelProgress(xp, level).percent} className="mt-3 max-w-sm" />
        </div>
      </div>

      <Tabs defaultValue="badges">
        <TabsList>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="edit">Edit profile</TabsTrigger>
        </TabsList>

        <TabsContent value="badges" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {badgeCatalog.map((badge) => {
            const has = earned.has(badge.key);
            return (
              <div key={badge.key} className={cn("surface-card p-5", !has && "opacity-50")}>
                <Award className={cn("size-6", has ? "text-warning" : "text-muted-foreground")} />
                <p className="mt-3 font-semibold">{badge.label}</p>
                <p className="text-xs text-muted-foreground">{badge.hint}</p>
                {has && (
                  <Badge className="mt-3 bg-success/15 text-success" variant="secondary">
                    Earned
                  </Badge>
                )}
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-6">
          <ul className="surface-card divide-y divide-border">
            {data.leaderboard.map((row, index) => (
              <li key={row.id} className="flex items-center gap-3 p-4">
                <span className="w-6 text-sm font-semibold text-muted-foreground">{index + 1}</span>
                {index < 3 && <Medal className="size-4 text-warning" />}
                <Avatar className="size-8">
                  <AvatarImage src={row.avatar_url ?? undefined} alt="" />
                  <AvatarFallback>
                    {(row.display_name ?? "S").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "flex-1 truncate text-sm",
                    row.id === user?.id && "font-semibold text-primary",
                  )}
                >
                  {row.display_name ?? "Student"}
                </span>
                <span className="text-xs text-muted-foreground">Lv {row.level}</span>
                <span className="text-sm font-semibold">{row.xp} XP</span>
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="edit" className="mt-6">
          <div className="surface-card grid gap-4 p-6 md:grid-cols-2">
            <div>
              <Label htmlFor="p-name">Display name</Label>
              <Input
                id="p-name"
                maxLength={80}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="p-username">Username</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">@</span>
                <Input
                  id="p-username"
                  maxLength={24}
                  placeholder="janedoe"
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                  }
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Letters, numbers and underscores. Shown to classmates instead of your email.
              </p>
            </div>
            <div>
              <Label htmlFor="p-inst">Institution</Label>
              <Input
                id="p-inst"
                maxLength={120}
                value={institution}
                onChange={(event) => setInstitution(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="p-course">Course</Label>
              <Input
                id="p-course"
                maxLength={120}
                value={course}
                onChange={(event) => setCourse(event.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="p-bio">Bio</Label>
              <Textarea
                id="p-bio"
                rows={3}
                maxLength={500}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
              />
            </div>
            <Button
              className="md:col-span-2 md:w-fit"
              disabled={save.isPending}
              onClick={() => save.mutate()}
            >
              <Save className="mr-1 size-4" /> Save profile
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
