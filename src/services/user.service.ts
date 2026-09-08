import { supabase } from "@/integrations/supabase/client";
import { StorageService } from "@/services/storage.service";
import type { Row, Update } from "@/services/types";

export type ProfileSummary = Pick<
  Row<"profiles">,
  "id" | "display_name" | "avatar_url" | "xp" | "level" | "streak_days"
>;

const PROFILE_SUMMARY_COLUMNS = "id,display_name,avatar_url,xp,level,streak_days";
/** Private bucket; avatars are shared as long-lived signed URLs. */
const AVATAR_BUCKET = "avatars";
const AVATAR_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 5;

export type ExtendedProfile = Pick<
  Row<"profiles">,
  | "id"
  | "display_name"
  | "username"
  | "avatar_url"
  | "bio"
  | "institution"
  | "course"
  | "year_of_study"
  | "xp"
  | "level"
  | "points"
  | "streak_days"
>;

const EXTENDED_PROFILE_COLUMNS =
  "id,display_name,username,avatar_url,bio,institution,course,year_of_study,xp,level,points,streak_days";

export const UserService = {
  /**
   * Records today's activity: extends the streak on consecutive days, resets
   * after a gap, and awards daily XP. Safe to call repeatedly — the database
   * routine is a no-op once the day is already counted.
   */
  async touchStreak(): Promise<{ streak_days: number; xp: number; level: number } | null> {
    const { data, error } = await supabase.rpc("touch_streak");
    if (error) throw error;
    return (data?.[0] ?? null) as { streak_days: number; xp: number; level: number } | null;
  },

  /** Usernames are unique, lowercase and URL-safe. */
  async isUsernameAvailable(username: string, currentUserId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();
    if (error) throw error;
    return !data || data.id === currentUserId;
  },

  async getProfileSummary(userId: string): Promise<ProfileSummary | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_SUMMARY_COLUMNS)
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as ProfileSummary | null;
  },

  async getExtendedProfile(userId: string): Promise<ExtendedProfile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select(EXTENDED_PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as ExtendedProfile | null;
  },

  async updateProfile(userId: string, patch: Update<"profiles">): Promise<void> {
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) throw error;
  },

  async uploadAvatar(userId: string, file: File): Promise<string> {
    const path = StorageService.buildUserPath(userId, file.name);
    await StorageService.replace(AVATAR_BUCKET, path, file);
    return StorageService.getPublicUrl(AVATAR_BUCKET, path);
  },

  async getBadges(userId: string) {
    const { data, error } = await supabase
      .from("user_badges")
      .select("id,badge_key,earned_at")
      .eq("user_id", userId);
    if (error) throw error;
    return data ?? [];
  },

  /** Badges are validated and recorded server-side by the award_badge RPC. */
  async awardBadges(userId: string, badgeKeys: string[]): Promise<void> {
    void userId; // the RPC always awards to the signed-in caller
    for (const badgeKey of badgeKeys) {
      const { error } = await supabase.rpc("award_badge", { _badge_key: badgeKey });
      if (error) throw error;
    }
  },

  /** Lightweight counts used on the profile page (notes authored, quizzes taken). */
  async getUserStats(userId: string) {
    const [notes, quizAttempts] = await Promise.all([
      supabase.from("notes").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("quiz_attempts").select("id", { count: "exact", head: true }),
    ]);
    if (notes.error) throw notes.error;
    if (quizAttempts.error) throw quizAttempts.error;
    return { noteCount: notes.count ?? 0, quizAttemptCount: quizAttempts.count ?? 0 };
  },

  /** The four activity counts the profile page uses to auto-award badges. */
  async getActivityCounts(userId: string) {
    const [notes, attempts, completedTasks, answers] = await Promise.all([
      supabase.from("notes").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("quiz_attempts").select("id", { count: "exact", head: true }),
      supabase
        .from("study_tasks")
        .select("id", { count: "exact", head: true })
        .eq("completed", true),
      supabase.from("answers").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    if (notes.error) throw notes.error;
    if (attempts.error) throw attempts.error;
    if (completedTasks.error) throw completedTasks.error;
    if (answers.error) throw answers.error;
    return {
      noteCount: notes.count ?? 0,
      attemptCount: attempts.count ?? 0,
      completedTasks: completedTasks.count ?? 0,
      answerCount: answers.count ?? 0,
    };
  },
};

/** Same 500-XP-per-level curve used across the dashboard, profile and sidebar. */
export function levelProgress(xp: number, level: number) {
  const span = 500;
  const base = (level - 1) * span;
  const into = Math.max(0, xp - base);
  return { into, span, percent: Math.min(100, Math.round((into / span) * 100)) };
}

export function initialsOf(name?: string | null, fallback = "S") {
  if (!name) return fallback;
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
