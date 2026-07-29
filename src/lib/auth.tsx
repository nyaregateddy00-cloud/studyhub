import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

type AuthValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthValue>({ session: null, user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let resolvedInitial = false;

    // Subscribe first so no auth event is missed, but do not resolve the
    // initial loading state until getSession() has answered — otherwise an
    // early INITIAL_SESSION(null) can flash signed-out UI at a signed-in user.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      if (resolvedInitial) setLoading(false);
    });

    supabase.auth.getSession().then(({ data: current }) => {
      if (!active) return;
      resolvedInitial = true;
      setSession((existing) => existing ?? current.session);
      setLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}