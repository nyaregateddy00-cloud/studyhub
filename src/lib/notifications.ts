import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth";
import { NotificationService, type NotificationRow } from "@/services/notification.service";

export type AppNotification = NotificationRow;

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Realtime replaces aggressive polling; the interval below is only a
  // low-frequency safety net and pauses whenever the tab is hidden.
  useEffect(() => {
    if (!user?.id) return;
    return NotificationService.subscribeToChanges(user.id, () =>
      queryClient.invalidateQueries({ queryKey: ["notifications", user.id] }),
    );
  }, [user?.id, queryClient]);

  return useQuery({
    queryKey: ["notifications", user?.id],
    enabled: Boolean(user?.id),
    staleTime: 15_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
    queryFn: () => NotificationService.list(30),
  });
}

export function useMarkNotificationsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids?: string[]) => NotificationService.markRead(user!.id, ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });
}

/**
 * Fire-and-forget: matches the previous behavior of this helper exactly, so
 * callers in the planner (task/session completion) don't start failing if a
 * notification insert has a transient error.
 */
export async function pushNotification(input: {
  userId: string;
  title: string;
  body?: string;
  type?: string;
  link?: string;
}) {
  try {
    await NotificationService.push(input);
  } catch {
    // Intentionally swallowed — see doc comment above.
  }
}
