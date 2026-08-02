import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { AuthService } from "@/services/auth.service";

type AuthValue = {
  session: Session | null;
  user: Session["user"] | null;
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
    const unsubscribe = AuthService.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      if (resolvedInitial) setLoading(false);
    });

    AuthService.getSession().then((current) => {
      if (!active) return;
      resolvedInitial = true;
      setSession((existing) => existing ?? current);
      setLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
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
    await AuthService.signOut();
    navigate({ to: "/auth", replace: true });
  };
}
