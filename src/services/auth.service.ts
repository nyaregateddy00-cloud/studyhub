import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type SignUpInput = { email: string; password: string; fullName: string };
export type SignInInput = { email: string; password: string };

/**
 * Every route/hook that touches authentication (sign in, sign up, session
 * state, password reset) should go through AuthService rather than calling
 * `supabase.auth` directly. That keeps `lib/auth.tsx` (session state) and
 * the `/auth` and `/reset-password` routes free of backend-specific calls,
 * so swapping to Firebase Auth later means rewriting this one file.
 */
export const AuthService = {
  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    const { data } = supabase.auth.onAuthStateChange(callback);
    return () => data.subscription.unsubscribe();
  },

  async signIn({ email, password }: SignInInput): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  },

  async signUp({ email, password, fullName }: SignUpInput): Promise<void> {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        data: { full_name: fullName.trim() },
      },
    });
    if (error) throw error;
  },

  async signInWithGoogle(redirectTo?: string) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          redirectTo ??
          (typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : undefined),
      },
    });
    if (error) throw error;
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async requestPasswordReset(email: string, redirectTo: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) throw error;
  },

  async updatePassword(password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },
};
