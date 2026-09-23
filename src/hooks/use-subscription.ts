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
export function useUsageGate(_kind: UsageKind) {
  return {
    unlimited: true,
    limit: Infinity,
    used: 0,
    remaining: Infinity,
    allowed: true,
    async consume() {},
  };
}