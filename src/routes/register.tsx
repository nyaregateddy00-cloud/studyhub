import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { BrandLock } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { AuthService } from "@/services/auth.service";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your account — StudyHub" },
      {
        name: "description",
        content: "Create a StudyHub account to organize your learning, track progress and use AI study tools.",
      },
      { property: "og:title", content: "Create your account — StudyHub" },
      {
        property: "og:description",
        content: "Join StudyHub to organize your learning, track progress and use AI study tools.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);

    try {
      await AuthService.signUp({ email, password, fullName });
      toast.success("Account created. Check your email to confirm, then sign in.");
      setFullName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
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
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start building better study habits with notes, flashcards and an AI tutor.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={busy}>
            Create account
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
          Continue with Google
        </Button>

        <div className="mt-6 text-sm text-muted-foreground">
          <Link to="/auth" className="text-left hover:text-foreground">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
