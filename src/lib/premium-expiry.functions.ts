import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Moves lapsed premium and expired-trial accounts back to the free plan.
 * The UI already derives live status from the end dates, so this only keeps
 * the stored `plan` / `premium_status` columns honest for reporting.
 * Admin-only: the caller's role is verified before privileged access.
 */
export const runPremiumExpirySweep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ expired: number }> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("expire_premium_accounts");
    if (error) throw new Error("Could not run the expiry sweep right now.");
    return { expired: Number(data ?? 0) };
  });