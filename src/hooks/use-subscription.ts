import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth";
import {
  deriveStatus,
  FREE_LIMITS,
  SubscriptionService,
  type SubscriptionStatus,
  type UsageKind,
} from "@/services/subscription.service";

export type { SubscriptionStatus };

/** Cached subscription state — used by the gate, dashboard, premium page and limits. */
export function useSubscription() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["subscription", user?.id],
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    queryFn: () => SubscriptionService.get(user!.id),
  });

  return { ...query, status: deriveStatus(query.data ?? null) };
}

/**
 * Daily quota for one premium-gated action. Premium and trial users are
 * unlimited; free users get FREE_LIMITS[kind] per day.
 */
export function useUsageGate(kind: UsageKind) {
  const { user } = useAuth();
  const { status } = useSubscription();
  const queryClient = useQueryClient();

  const usedQuery = useQuery({
    queryKey: ["usage", kind, user?.id],
    enabled: Boolean(user?.id) && !status.isPremium,
    staleTime: 30_000,
    queryFn: () => SubscriptionService.countUsageToday(user!.id, kind),
  });

  const limit = FREE_LIMITS[kind];
  const used = usedQuery.data ?? 0;
  const remaining = status.isPremium ? Infinity : Math.max(0, limit - used);

  return {
    unlimited: status.isPremium,
    limit,
    used,
    remaining,
    allowed: status.isPremium || remaining > 0,
    /** Call after a successful action so the quota stays accurate. */
    async consume() {
      if (status.isPremium || !user?.id) return;
      await SubscriptionService.recordUsage(user.id, kind);
      await queryClient.invalidateQueries({ queryKey: ["usage", kind, user.id] });
    },
  };
}
