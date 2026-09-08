import { supabase } from "@/integrations/supabase/client";

export type LeaderboardScope = "global" | "university" | "programme";

export type LeaderboardEntry = {
  user_id: string;
  rank: number;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  points: number;
  level: number;
  streak_days: number;
  university: string | null;
  programme: string | null;
};

export type MyRank = LeaderboardEntry & { total_users: number };

export type PublicProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  points: number;
  xp: number;
  level: number;
  streak_days: number;
  year_of_study: number | null;
  university: string | null;
  faculty: string | null;
  programme: string | null;
  joined_at: string;
  notes_count: number;
  quizzes_completed: number;
};

export type PointsEntry = {
  id: string;
  points: number;
  activity_type: string;
  created_at: string;
};

/** Human labels for the activity keys written by the database point triggers. */
export const activityLabels: Record<string, string> = {
  note_upload: "Uploaded a note",
  like_received: "Someone liked your note",
  download_received: "Someone downloaded your note",
  quiz_completed: "Completed a quiz",
  quiz_passed: "Passed a quiz",
  task_completed: "Completed a study task",
};

export const LeaderboardService = {
  async list(scope: LeaderboardScope, limit = 50): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase.rpc("leaderboard", { _scope: scope, _limit: limit });
    if (error) throw error;
    return (data ?? []) as LeaderboardEntry[];
  },

  async myRank(scope: LeaderboardScope): Promise<MyRank | null> {
    const { data, error } = await supabase.rpc("my_leaderboard_rank", { _scope: scope });
    if (error) throw error;
    return ((data as MyRank[] | null)?.[0] ?? null) as MyRank | null;
  },

  async publicProfile(userId: string): Promise<PublicProfile | null> {
    const { data, error } = await supabase.rpc("public_profile", { _user_id: userId });
    if (error) throw error;
    return ((data as PublicProfile[] | null)?.[0] ?? null) as PublicProfile | null;
  },

  async pointsHistory(userId: string, limit = 25): Promise<PointsEntry[]> {
    const { data, error } = await supabase
      .from("user_points")
      .select("id,points,activity_type,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },
};
