import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LeaderboardRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  streak_days: number;
};

/**
 * Public leaderboard projection. Runs server-side with an explicit safe-column
 * selection so private profile fields (bio, institution, course, activity)
 * are never exposed to other users.
 */
export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<LeaderboardRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id,display_name,avatar_url,xp,level,streak_days")
      .order("xp", { ascending: false })
      .limit(20);
    if (error) throw new Error("Unable to load the leaderboard right now.");
    return data ?? [];
  });
