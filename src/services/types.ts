import type { Database } from "@/integrations/supabase/types";

/** Row/Insert/Update helpers for a given table, so services don't repeat this. */
export type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Insert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type Update<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

/**
 * Every service in `src/services` throws on failure the same way the
 * Supabase client does today (the raw PostgrestError/AuthError), so existing
 * `catch`/`onError`/`error.message` handling in routes keeps working
 * unchanged when a call site is migrated to a service.
 */
export type ServiceBackend = "supabase" | "local" | "firebase";
