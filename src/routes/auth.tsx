import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BrandLock } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { AuthService } from "@/services/auth.service";

type Mode = "signin" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: "signup"; error?: string } => ({
    ...(search.mode === "signup" ? { mode: "signup" as const } : {}),
    ...(typeof search.error === "string" && search.error
      ? { error: search.error.slice(0, 300) }
      : {}),
  }),
  head: () => ({
    meta: [
      { title: "Sign in — StudyHub" },
      {
        name: "description",
        content:
          "Sign in or create your StudyHub account to reach your notes, quizzes and AI tutor.",
      },
      { property: "og:title", content: "Sign in — StudyHub" },
      { property: "og:description", content: "Access your StudyHub notes, quizzes and AI tutor." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: modeParam, error: authError } = Route.useSearch();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(modeParam === "signup" ? "signup" : "signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (authError) toast.error(authError);
  }, [authError]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        await AuthService.requestPasswordReset(email, `${window.location.origin}/reset-password`);
        toast.success("Check your inbox for the reset link.");
        setMode("signin");
        return;
      }

      if (mode === "signup") {
        await AuthService.signUp({ email, password, fullName });
        toast.success("Account created. Check your email to confirm, then sign in.");
        setMode("signin");
        return;
      }

      await AuthService.signIn({ email, password });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      // Supabase redirects the browser to Google; the /auth/callback route
      // finishes the session and forwards to the dashboard.
      await AuthService.signInWithGoogle(`${window.location.origin}/auth/callback`);
    } catch (error) {
      setBusy(false);
      toast.error(
        error instanceof Error ? error.message : "Google sign-in failed. Please try again.",
      );
    }
  }

  return (
    <div className="mesh-bg flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <Link to="/" className="mb-8">
        <BrandLock />
      </Link>

      <div className="surface-card w-full max-w-md p-7">
        <h1 className="text-2xl font-bold">
          {mode === "signup"
            ? "Create your account"
            : mode === "forgot"
              ? "Reset your password"
              : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "forgot"
            ? "We'll email you a link to set a new password."
            : "Learn smarter. Revise faster. Succeed together."}
        </p>

        {authError && (
          <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {authError}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                maxLength={80}
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={255}
              required
            />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "signup"
              ? "Create account"
              : mode === "forgot"
                ? "Send reset link"
                : "Sign in"}
          </Button>
        </form>

        {mode !== "forgot" && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
              Continue with Google
            </Button>
          </>
        )}

        <div className="mt-6 flex flex-col gap-1 text-sm text-muted-foreground">
          {mode === "signin" && (
            <>
              <button
                type="button"
                className="text-left hover:text-foreground"
                onClick={() => setMode("forgot")}
              >
                Forgot your password?
              </button>
              <Link
                to="/register"
                className="text-left hover:text-foreground"
              >
                New here? Create an account
              </Link>
            </>
          )}
          {mode !== "signin" && (
            <button
              type="button"
              className="text-left hover:text-foreground"
              onClick={() => setMode("signin")}
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
