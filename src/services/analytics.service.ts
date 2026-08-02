import { supabase } from "@/integrations/supabase/client";

/**
 * Backs the Analytics route's daily/weekly/monthly reports, subject
 * performance and study heatmap. Kept as one aggregate call (mirroring the
 * existing route) rather than four separate service methods, since the
 * consumer always needs all four together.
 */
export const AnalyticsService = {
  async getStudyData(userId: string) {
    const [sessions, attempts, notes, tasks, profile] = await Promise.all([
      supabase
        .from("study_sessions")
        .select("id,subject,minutes,studied_on")
        .order("studied_on", { ascending: true }),
      supabase
        .from("quiz_attempts")
        .select("id,quiz_id,score,total,seconds_taken,created_at")
        .order("created_at", { ascending: true }),
      supabase.from("notes").select("id,title,course,created_at").eq("user_id", userId),
      supabase
        .from("study_tasks")
        .select("id,title,subject,due_date,duration_minutes,priority,completed,created_at"),
      supabase
        .from("profiles")
        .select("display_name,xp,level,streak_days")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    // Matches the original route's behavior: a failed table read degrades to
    // an empty result for that table rather than failing the whole page.
    return {
      sessions: sessions.data ?? [],
      attempts: attempts.data ?? [],
      notes: notes.data ?? [],
      tasks: tasks.data ?? [],
      profile: profile.data ?? null,
    };
  },

  async logStudyMinutes(
    userId: string,
    minutes: number,
    subject?: string | null,
    studiedOn?: string,
  ) {
    const { error } = await supabase.from("study_sessions").insert({
      user_id: userId,
      subject: subject ?? null,
      minutes,
      ...(studiedOn ? { studied_on: studiedOn } : {}),
    });
    if (error) throw error;
  },
};
