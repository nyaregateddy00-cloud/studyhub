import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CalendarDays,
  Layers,
  ListChecks,
  Moon,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Users,
} from "lucide-react";

import { BrandLock } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudyHub — AI study workspace for students" },
      {
        name: "description",
        content:
          "Share and search course notes, generate quizzes from any PDF, drill flashcards and ask an AI tutor — all in one student workspace.",
      },
      { property: "og:title", content: "StudyHub — AI study workspace for students" },
      {
        property: "og:description",
        content:
          "Share and search course notes, generate quizzes from any PDF, drill flashcards and ask an AI tutor — all in one student workspace.",
      },
      { property: "og:url", content: "https://studyhubke-site.lovable.app/" },
      { name: "twitter:title", content: "StudyHub — AI study workspace for students" },
      {
        name: "twitter:description",
        content:
          "Share and search course notes, generate quizzes from any PDF, drill flashcards and ask an AI tutor — all in one student workspace.",
      },
    ],
    links: [{ rel: "canonical", href: "https://studyhubke-site.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "StudyHub",
              url: "https://studyhubke-site.lovable.app/",
              description:
                "AI-powered study workspace with shared course notes, quiz generation, flashcards and an AI tutor.",
            },
            {
              "@type": "WebSite",
              name: "StudyHub",
              url: "https://studyhubke-site.lovable.app/",
              description:
                "Share and search course notes, generate quizzes from any PDF, drill flashcards and ask an AI tutor.",
            },
          ],
        }),
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

const highlights = [
  { icon: ShieldCheck, title: "All-in-one platform", body: "Everything you need" },
  { icon: Sparkles, title: "AI powered", body: "Study smarter" },
  { icon: Users, title: "Learn together", body: "Collaborate & grow" },
  { icon: Star, title: "Trusted by students", body: "Join thousands" },
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
        <section className="mx-auto max-w-6xl px-5 pt-12 pb-16 sm:pt-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" />
            Powered by AI · Built for students
          </span>
          <h1 className="mt-6 max-w-3xl text-balance text-4xl leading-[1.05] font-bold sm:text-6xl">
            Learn Smarter.{" "}
            <span className="gradient-text">Revise Faster.</span>{" "}
            Succeed Together.
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            The all-in-one study platform for university and high school. Notes, AI tutor, quizzes,
            flashcards and a planner — everything you need to ace exams, in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start learning free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#features">
                See features
                <ArrowRight className="size-4" />
              </a>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex text-warning" aria-hidden>
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className="size-4 fill-current" />
              ))}
            </span>
            Trusted by students revising every day
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-5 pb-14">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className="surface-card lift p-6 text-left">
                <span className="brand-tint flex size-11 items-center justify-center rounded-xl text-primary">
                  <feature.icon className="size-5" />
                </span>
                <h2 className="mt-4 text-lg font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
              </article>
            ))}
            <article className="surface-card lift p-6 text-left">
              <span className="brand-tint flex size-11 items-center justify-center rounded-xl text-primary">
                <CalendarDays className="size-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">A planner that keeps pace</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Schedule study blocks, track assignments and exams, and keep your streak alive.
              </p>
            </article>
          </div>

          <div className="surface-card mt-6 grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((item) => (
              <div key={item.title} className="flex items-center gap-3">
                <span className="success-tint flex size-10 shrink-0 items-center justify-center rounded-xl text-success">
                  <item.icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.body}</p>
                </div>
              </div>
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
