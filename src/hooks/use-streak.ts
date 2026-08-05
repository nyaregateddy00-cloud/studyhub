import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { useAuth } from "@/lib/auth";
import { UserService } from "@/services/user.service";

/**
 * Marks the signed-in student as active today. Runs once per mounted session;
 * the database routine itself is idempotent per calendar day.
 */
export function useStreakHeartbeat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const done = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id || done.current === user.id) return;
    done.current = user.id;
    void UserService.touchStreak()
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ["profile-summary", user.id] });
        void queryClient.invalidateQueries({ queryKey: ["profile-page", user.id] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard", user.id] });
      })
      .catch(() => {
        /* a missed heartbeat must never break the app shell */
      });
  }, [user?.id, queryClient]);
}
