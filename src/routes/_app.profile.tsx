import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Award, Camera, Flame, Save, Sparkles, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AcademicPicker, emptyAcademicSelection, type AcademicSelection } from "@/components/academic/academic-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { LeaderboardService, activityLabels } from "@/services/leaderboard.service";
import { initialsOf, levelProgress, UserService } from "@/services/user.service";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Badges — StudyHub" },
      {
        name: "description",
        content: "Your study stats, points, XP level, earned badges and profile details.",
      },
      { property: "og:title", content: "Profile & Badges — StudyHub" },
      {
        property: "og:description",
        content: "Track points, XP, badges and how you rank against other students.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
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
  const fileInput = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [institution, setInstitution] = useState("");
  const [course, setCourse] = useState("");
  const [bio, setBio] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState<string>("none");
  const [academic, setAcademic] = useState<AcademicSelection>(emptyAcademicSelection);

  const { data, isLoading } = useQuery({
    queryKey: ["profile-page", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const [profile, badges, rank, points, counts, stats] = await Promise.all([
        UserService.getExtendedProfile(user!.id),
        UserService.getBadges(user!.id),
        LeaderboardService.myRank("global"),
        LeaderboardService.pointsHistory(user!.id),
        UserService.getActivityCounts(user!.id),
        UserService.getProfileStats(user!.id),
      ]);
      return { profile, badges, rank, points, stats, ...counts };
    },
  });

  useEffect(() => {
    if (!data?.profile) return;
    setDisplayName(data.profile.display_name ?? "");
    setUsername(data.profile.username ?? "");
    setInstitution(data.profile.institution ?? "");
    setCourse(data.profile.course ?? "");
    setBio(data.profile.bio ?? "");
    setYearOfStudy(data.profile.year_of_study ? String(data.profile.year_of_study) : "none");
    setAcademic({
      universityId: data.profile.university_id ?? null,
      facultyId: data.profile.faculty_id ?? null,
      programmeId: data.profile.programme_id ?? null,
      unitId: null,
    });
  }, [data?.profile]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["profile-page", user?.id] });
    await queryClient.invalidateQueries({ queryKey: ["profile-summary", user?.id] });
  };

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
        university_id: academic.universityId,
        faculty_id: academic.facultyId,
        programme_id: academic.programmeId,
        year_of_study: yearOfStudy === "none" ? null : Number(yearOfStudy),
      });
    },
    onSuccess: async () => {
      toast.success("Profile updated");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
      if (file.size > 5 * 1024 * 1024) throw new Error("Images must be under 5 MB.");
      const url = await UserService.uploadAvatar(user!.id, file);
      await UserService.updateProfile(user!.id, { avatar_url: url });
    },
    onSuccess: async () => {
      toast.success("Profile picture updated");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message || "Could not upload that picture."),
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
  const points = data.profile?.points ?? 0;
  const earned = new Set(data.badges.map((badge) => badge.badge_key));

  return (
    <div className="space-y-8">
      <div className="surface-card flex flex-wrap items-center gap-6 p-6 sm:p-8 rounded-3xl border-border/80 shadow-xs">
        <div className="relative">
          <Avatar className="size-20 ring-4 ring-primary/20 ring-offset-2 ring-offset-background shadow-xs">
            <AvatarImage src={data.profile?.avatar_url ?? undefined} alt="" />
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
              {initialsOf(displayName)}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            aria-label="Change profile picture"
            disabled={uploadAvatar.isPending}
            onClick={() => fileInput.current?.click()}
            className="absolute -bottom-1 -right-1 rounded-full border-2 border-background bg-primary p-2 text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95"
          >
            <Camera className="size-3.5" />
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) uploadAvatar.mutate(file);
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {displayName || "Student"}
            </h1>
            {username && (
              <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                @{username}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            {course || "Course not set"} · {institution || "Institution not set"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {user?.email}
            {data.profile?.created_at &&
              ` · Joined ${new Date(data.profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })}`}
          </p>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="px-2.5 py-1 bg-warning/10 text-warning border-warning/20 font-semibold gap-1">
              <Trophy className="size-3.5" /> Level {level}
            </Badge>
            <Badge variant="secondary" className="px-2.5 py-1 bg-amber-500/10 text-amber-500 border-amber-500/20 font-semibold gap-1">
              <Flame className="size-3.5 fill-amber-500" /> {data.profile?.streak_days ?? 0} day streak
            </Badge>
            <Badge variant="secondary" className="px-2.5 py-1 font-semibold">
              {points} points
            </Badge>
            <Badge variant="secondary" className="px-2.5 py-1 font-semibold">
              {xp} XP
            </Badge>
            {data.rank && (
              <Badge variant="secondary" className="px-2.5 py-1 bg-primary/10 text-primary border-primary/20 font-semibold gap-1">
                <Sparkles className="size-3.5" /> Rank #{data.rank.rank} of {data.rank.total_users}
              </Badge>
            )}
          </div>
          <div className="mt-3 max-w-sm">
            <Progress value={levelProgress(xp, level).percent} className="h-2 rounded-full" />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {levelProgress(xp, level).into} / {levelProgress(xp, level).span} XP to Level {level + 1}
            </p>
          </div>
        </div>
        <Button variant="outline" className="rounded-xl shadow-xs" asChild>
          <Link to="/leaderboard">View leaderboard</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total Points", value: points, tone: "text-primary" },
          { label: "Quizzes Completed", value: data.stats.quizzesCompleted, tone: "text-foreground" },
          { label: "Quizzes Passed", value: data.stats.quizzesPassed, tone: "text-success" },
          { label: "Notes Uploaded", value: data.stats.materialsUploaded, tone: "text-foreground" },
          { label: "Downloads Got", value: data.stats.downloadsReceived, tone: "text-foreground" },
          { label: "Saved Notes", value: data.stats.bookmarks, tone: "text-foreground" },
        ].map((stat) => (
          <div key={stat.label} className="surface-card card-interactive p-4 rounded-2xl border-border/80 shadow-2xs">
            <p className={`font-display text-2xl font-bold tracking-tight tabular-nums ${stat.tone}`}>
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="badges">
        <TabsList className="rounded-xl">
          <TabsTrigger value="badges" className="rounded-lg font-medium">Badges</TabsTrigger>
          <TabsTrigger value="points" className="rounded-lg font-medium">Points History</TabsTrigger>
          <TabsTrigger value="edit" className="rounded-lg font-medium">Edit Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="badges" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {badgeCatalog.map((badge) => {
            const has = earned.has(badge.key);
            return (
              <div
                key={badge.key}
                className={cn(
                  "surface-card card-interactive p-5 rounded-2xl border-border/80 transition-all",
                  has ? "border-amber-400/30 bg-amber-400/5 shadow-xs" : "opacity-50 grayscale",
                )}
              >
                <div className="flex items-start justify-between">
                  <span className={cn("grid size-11 place-items-center rounded-2xl", has ? "bg-amber-400/15 text-amber-500" : "bg-secondary text-muted-foreground")}>
                    <Award className="size-6" />
                  </span>
                  {has ? (
                    <Badge className="bg-success/15 text-success border-success/20 font-semibold" variant="secondary">
                      Earned
                    </Badge>
                  ) : (
                    <span className="text-[11px] font-medium text-muted-foreground">Locked</span>
                  )}
                </div>
                <p className="mt-3.5 font-display font-semibold text-base text-foreground tracking-tight">
                  {badge.label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{badge.hint}</p>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="points" className="mt-6">
          {data.points.length === 0 ? (
            <div className="surface-card p-8 text-center">
              <Trophy className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-3 font-semibold">No points yet</p>
              <p className="text-sm text-muted-foreground">
                Upload a note (25), complete a quiz (20), pass it (30) or tick off a study task (5).
              </p>
            </div>
          ) : (
            <ul className="surface-card divide-y divide-border">
              {data.points.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 p-4">
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {activityLabels[entry.activity_type] ?? entry.activity_type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-sm font-semibold text-success">+{entry.points}</span>
                </li>
              ))}
            </ul>
          )}
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
              <Label className="mb-2 block">University, school and programme</Label>
              <AcademicPicker
                value={academic}
                onChange={(next) => setAcademic({ ...next, unitId: null })}
              />
            </div>
            <div>
              <Label htmlFor="p-year">Year of study</Label>
              <Select value={yearOfStudy} onValueChange={setYearOfStudy}>
                <SelectTrigger id="p-year" className="w-full">
                  <SelectValue placeholder="Not specified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {[1, 2, 3, 4, 5, 6].map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      Year {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
