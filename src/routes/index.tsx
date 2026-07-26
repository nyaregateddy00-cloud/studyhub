import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Flame,
  Layers,
  ListChecks,
  Moon,
  Sun,
} from "lucide-react";

import { BrandLock } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudyHub — Learn Smarter. Revise Faster. Succeed Together." },
      {
        name: "description",
        content:
          "Share and search course notes, generate quizzes from any PDF, drill flashcards and ask an AI tutor — all in one student workspace.",
      },
      { property: "og:title", content: "StudyHub — Learn Smarter. Revise Faster." },
      {
        property: "og:description",
        content:
          "Share and search course notes, generate quizzes from any PDF, drill flashcards and ask an AI tutor.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: BookOpen,
    title: "Notes that stay organised",
    body: "Upload PDFs, slides and images or write rich notes, filed by institution, course, unit and topic.",
  },
  {
    icon: Bot,
    title: "An AI tutor on call",
    body: "Explain hard concepts, summarise a unit, build a revision plan or unpack a mistake after a quiz.",
  },
  {
    icon: ListChecks,
    title: "Quizzes from anything",
    body: "Turn a note or a block of text into timed multiple choice, true/false and short answer questions.",
  },
  {
    icon: Layers,
    title: "Flashcards with recall",
    body: "Flip, shuffle and grade cards easy/medium/hard so the ones you keep missing come back sooner.",
  },
];

function Landing() {
  const { session } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen mesh-bg">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <BrandLock />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle dark mode">
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          {session ? (
            <Button asChild>
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild>
                <Link to="/auth" search={{ mode: "signup" }}>
                  Create account
                </Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pt-14 pb-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <Flame className="size-3.5 text-accent" />
            Built for university and high school revision
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-5xl leading-[1.05] font-bold sm:text-6xl">
            Learn smarter. Revise faster.{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Succeed together.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            StudyHub keeps your notes, quizzes, flashcards and an AI tutor in one place, so revision
            week stops being a scramble.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start studying free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24">
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <article key={feature.title} className="surface-card lift p-6 text-left">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon className="size-5" />
                </span>
                <h2 className="mt-4 text-lg font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        StudyHub — Learn Smarter. Revise Faster. Succeed Together.
      </footer>
    </div>
  );
}
