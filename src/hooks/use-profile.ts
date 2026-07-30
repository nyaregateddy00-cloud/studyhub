import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type ProfileSummary = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  streak_days: number;
};

/** Shared, cached profile summary used by the sidebar, header and hero. */
export function useProfileSummary() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile-summary", user?.id],
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url,xp,level,streak_days")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ProfileSummary | null;
    },
  });
}

export function initialsOf(name?: string | null, fallback = "S") {
  if (!name) return fallback;
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/** XP needed to reach the next level, mirroring the 500 XP/level curve. */
export function levelProgress(xp: number, level: number) {
  const span = 500;
  const base = (level - 1) * span;
  const into = Math.max(0, xp - base);
  return { into, span, percent: Math.min(100, Math.round((into / span) * 100)) };
}