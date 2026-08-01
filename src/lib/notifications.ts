import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type AppNotification = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

const NOTIFICATION_COLUMNS = "id,title,body,type,link,is_read,created_at";

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Realtime replaces aggressive polling; the interval below is only a
  // low-frequency safety net and pauses whenever the tab is hidden.
  useEffect(() => {
    if (!user?.id) return;
    const channelName = `notifications:${user.id}:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["notifications", user.id] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return useQuery({
    queryKey: ["notifications", user?.id],
    enabled: Boolean(user?.id),
    staleTime: 15_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select(NOTIFICATION_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
  });
}

export function useMarkNotificationsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids?: string[]) => {
      let query = supabase.from("notifications").update({ is_read: true }).eq("user_id", user!.id);
      if (ids?.length) query = query.in("id", ids);
      else query = query.eq("is_read", false);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });
}

/**
 * Inserts a notification for the signed-in user. Cross-user notifications are
 * created by database triggers (e.g. new answers) because RLS on
 * `notifications` intentionally scopes inserts to `auth.uid()`.
 */
export async function pushNotification(input: {
  userId: string;
  title: string;
  body?: string;
  type?: string;
  link?: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || auth.user.id !== input.userId) return;
  await supabase.from("notifications").insert({
    user_id: input.userId,
    title: input.title,
    body: input.body ?? null,
    type: input.type ?? "info",
    link: input.link ?? null,
  });
}