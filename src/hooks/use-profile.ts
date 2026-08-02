import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth";
import {
  initialsOf,
  levelProgress,
  UserService,
  type ProfileSummary,
} from "@/services/user.service";

export type { ProfileSummary };

/** Shared, cached profile summary used by the sidebar, header and hero. */
export function useProfileSummary() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile-summary", user?.id],
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    queryFn: () => UserService.getProfileSummary(user!.id),
  });
}

export { initialsOf, levelProgress };
