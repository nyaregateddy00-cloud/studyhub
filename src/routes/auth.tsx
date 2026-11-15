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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-12">
      {/* Cinematic background */}
      <div className="pointer-events-none absolute inset-0 bg-[#071426] dark:bg-black">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/20 via-transparent to-transparent" />
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-green-500/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-blue-400/5 blur-3xl" />
        {/* Subtle grid */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="auth-grid" x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-grid)" />
        </svg>
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        {/* Brand */}
        <Link to="/" className="mb-8 transition-opacity hover:opacity-80">
          <BrandLock />
        </Link>

        {/* Card */}
        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl ring-1 ring-inset ring-white/5">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">
              {mode === "signup"
                ? "Create your account"
                : mode === "forgot"
                  ? "Reset your password"
                  : "Welcome back"}
            </h1>
            <p className="mt-1.5 text-sm text-white/60">
              {mode === "forgot"
                ? "We'll email you a link to set a new password."
                : "Learn Smarter. Revise Faster. Succeed Together."}
            </p>
          </div>

          {authError && (
            <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              {authError}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-white/80 text-sm font-medium">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  maxLength={80}
                  required
                  className="rounded-xl border-white/20 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-primary/50"
                  placeholder="Your full name"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-white/80 text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={255}
                required
                className="rounded-xl border-white/20 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-primary/50"
                placeholder="you@example.com"
              />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-white/80 text-sm font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  required
                  className="rounded-xl border-white/20 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-primary/50"
                  placeholder="••••••••"
                />
              </div>
            )}
            <Button
              type="submit"
              className="mt-2 w-full h-11 rounded-xl bg-gradient-to-r from-primary to-blue-600 font-semibold text-white shadow-lg shadow-primary/30 hover:from-primary/90 hover:to-blue-600/90 transition-all active:scale-[0.98]"
              disabled={busy}
            >
              {busy ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  {mode === "signup" ? "Creating account..." : mode === "forgot" ? "Sending link..." : "Signing in..."}
                </span>
              ) : mode === "signup"
                ? "Create account"
                : mode === "forgot"
                  ? "Send reset link"
                  : "Sign in"}
            </Button>
          </form>

          {mode !== "forgot" && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-white/40">
                <span className="h-px flex-1 bg-white/10" />
                or continue with
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <Button
                variant="outline"
                className="w-full h-11 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/15 hover:border-white/30 transition-all"
                onClick={handleGoogle}
                disabled={busy}
              >
                <svg className="mr-2 size-4" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </Button>
            </>
          )}

          <div className="mt-6 flex flex-col gap-1.5 text-sm text-white/50">
            {mode === "signin" && (
              <>
                <button
                  type="button"
                  className="text-left hover:text-white/80 transition-colors"
                  onClick={() => setMode("forgot")}
                >
                  Forgot your password?
                </button>
                <Link
                  to="/register"
                  className="text-left hover:text-white/80 transition-colors"
                >
                  New here? Create an account
                </Link>
              </>
            )}
            {mode !== "signin" && (
              <button
                type="button"
                className="text-left hover:text-white/80 transition-colors"
                onClick={() => setMode("signin")}
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-white/30">
          By signing in you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
