import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { BrandLock } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Signing you in — StudyHub" },
      { name: "description", content: "Completing your StudyHub sign-in." },
      { property: "og:title", content: "Signing you in — StudyHub" },
      { property: "og:description", content: "Completing your StudyHub sign-in." },
    ],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function complete() {
      const url = new URL(window.location.href);
      const oauthError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
      if (oauthError) {
        if (active) setError(oauthError);
        return;
      }

      // PKCE flow returns ?code=...; implicit flow leaves tokens in the hash and
      // the client picks them up automatically via detectSessionInUrl.
      const code = url.searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (active) setError(exchangeError.message);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else navigate({ to: "/auth", replace: true });
    }

    void complete();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="mesh-bg flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
      <BrandLock />
      <p className="text-sm text-muted-foreground">
        {error ? `Sign-in failed: ${error}` : "Completing sign-in…"}
      </p>
    </div>
  );
}