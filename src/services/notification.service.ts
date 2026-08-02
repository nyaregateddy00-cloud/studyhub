import { supabase } from "@/integrations/supabase/client";
import type { Row } from "@/services/types";

export type NotificationRow = Row<"notifications">;
const NOTIFICATION_COLUMNS = "id,title,body,type,link,is_read,created_at";

export const NotificationService = {
  async list(limit = 30) {
    const { data, error } = await supabase
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async markRead(userId: string, ids?: string[]): Promise<void> {
    let query = supabase.from("notifications").update({ is_read: true }).eq("user_id", userId);
    query = ids?.length ? query.in("id", ids) : query.eq("is_read", false);
    const { error } = await query;
    if (error) throw error;
  },

  /**
   * Inserts a notification for the signed-in user. Cross-user notifications
   * are created by database triggers (e.g. new answers), because RLS on
   * `notifications` intentionally scopes inserts to `auth.uid()`.
   */
  async push(input: {
    userId: string;
    title: string;
    body?: string;
    type?: string;
    link?: string;
  }) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user || auth.user.id !== input.userId) return;
    const { error } = await supabase.from("notifications").insert({
      user_id: input.userId,
      title: input.title,
      body: input.body ?? null,
      type: input.type ?? "info",
      link: input.link ?? null,
    });
    if (error) throw error;
  },

  subscribeToChanges(userId: string, onChange: () => void) {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        onChange,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  },
};
