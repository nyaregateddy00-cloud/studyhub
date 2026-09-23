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
    title: "Notes That Stay Organised",
    body: "Upload PDFs, lecture slides, and images or write rich notes filed neatly by course, unit, and topic.",
    badge: "Smart Sync",
    badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  {
    icon: Bot,
    title: "AI Tutor On Call 24/7",
    body: "Explain complex concepts in simple terms, unpack tricky exam questions, and generate revision plans.",
    badge: "Instant AI",
    badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  {
    icon: ListChecks,
    title: "Timed AI Quizzes",
    body: "Turn any notes or syllabus into multiple choice, true/false, and short answer practice tests with instant grading.",
    badge: "Active Recall",
    badgeColor: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  },
  {
    icon: Layers,
    title: "Spaced Repetition Flashcards",
    body: "Flip, shuffle, and grade cards easy, medium, or hard so the concepts you struggle with appear more often.",
    badge: "Memory Engine",
    badgeColor: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  },
  {
    icon: CalendarDays,
    title: "Adaptive Study Planner",
    body: "Schedule study blocks, track assignment deadlines, and keep your daily study streak alive.",
    badge: "Stay Consistent",
    badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  {
    icon: Users,
    title: "Peer Community & Q&A",
    body: "Connect with classmates, share verified notes, ask questions, and climb the university leaderboard.",
    badge: "Collaborative",
    badgeColor: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  },
];

const highlights = [
  { icon: ShieldCheck, title: "All-in-one platform", body: "Notes, AI tutor, quizzes, planner" },
  { icon: Sparkles, title: "AI powered", body: "State-of-the-art study intelligence" },
  { icon: Users, title: "Learn together", body: "Join thousands of active students" },
  { icon: Star, title: "Grade booster", body: "Built for exam-tested results" },
];

function Landing() {
  const { session } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <div className="relative min-h-screen aurora-bg overflow-hidden flex flex-col justify-between">
      {/* Ambient background glow orbs */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-primary/20 blur-[130px] rounded-full -z-10" />
      <div className="pointer-events-none absolute top-[30%] -right-40 w-[500px] h-[350px] bg-indigo-500/15 blur-[120px] rounded-full -z-10" />
      <div className="pointer-events-none absolute bottom-10 -left-40 w-[500px] h-[350px] bg-emerald-500/10 blur-[120px] rounded-full -z-10" />

      {/* Header */}
      <header className="sticky top-0 z-40 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 backdrop-blur-md bg-background/70 border-b border-border/50 rounded-b-2xl">
        <BrandLock />
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="size-9 rounded-xl border border-border/50 hover:bg-secondary/80 transition-all active:scale-95 shadow-2xs"
          >
            {theme === "dark" ? (
              <Sun className="size-4 text-warning transition-transform" />
            ) : (
              <Moon className="size-4 text-muted-foreground transition-transform" />
            )}
          </Button>
          {session ? (
            <Button asChild className="rounded-xl shadow-sm bg-gradient-to-r from-primary to-indigo-600 hover:opacity-95">
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="rounded-xl">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild className="rounded-xl shadow-sm bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground hover:opacity-95">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get started
                </Link>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Main Hero & Content */}
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-5 pt-16 pb-20 sm:pt-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary shadow-xs glow-pill mb-6">
            <Sparkles className="size-3.5" />
            Powered by AI · Designed for Students
          </div>

          <h1 className="mx-auto max-w-4xl text-balance text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-[1.08]">
            Master your studies with the{" "}
            <span className="gradient-text bg-gradient-to-r from-primary via-indigo-500 to-emerald-400 bg-clip-text text-transparent">
              intelligent study workspace
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-xl font-normal leading-relaxed">
            Upload course notes, drill active-recall flashcards, generate instant practice quizzes from your syllabus, and ask your 24/7 AI tutor — all in one unified workspace.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="h-12 px-7 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              <Link to="/auth" search={{ mode: "signup" }}>
                Start learning free
                <ArrowRight className="size-4 ml-1.5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-6 rounded-2xl border-border/80 bg-background/60 backdrop-blur-md hover:bg-secondary/70 text-base font-medium shadow-xs"
            >
              <a href="#features">
                Explore features
              </a>
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            <div className="flex text-amber-500" aria-hidden>
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className="size-4 fill-current" />
              ))}
            </div>
            <span className="font-medium text-foreground/80">4.9/5 student rating</span>
            <span className="text-muted-foreground/50">·</span>
            <span>Trusted by thousands of university & high school learners</span>
          </div>

          {/* Interactive Feature Teaser Bento Mockup */}
          <div className="mt-16 mx-auto max-w-5xl rounded-3xl border border-border/80 bg-card/60 backdrop-blur-xl p-4 sm:p-6 shadow-xl card-glow-hover">
            <div className="grid gap-4 sm:grid-cols-3 text-left">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-xs">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="grid size-8 place-items-center rounded-lg bg-amber-500/10 text-amber-500 font-bold">
                    <Bot className="size-4" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Tutor</span>
                </div>
                <p className="text-sm font-semibold text-foreground">“Explain photosynthesis simply”</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  Photosynthesis is how plants use sunlight, water, and CO₂ to create glucose and oxygen...
                </p>
                <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                  <span>Ask anything 24/7</span>
                  <ArrowRight className="size-3" />
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-xs">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="grid size-8 place-items-center rounded-lg bg-violet-500/10 text-violet-500 font-bold">
                    <ListChecks className="size-4" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Quiz Maker</span>
                </div>
                <p className="text-sm font-semibold text-foreground">From PDF to Practice Exam</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  Generated 10 timed questions with answers, explanations, and instant feedback scoring.
                </p>
                <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-violet-500">
                  <span>Generate in seconds</span>
                  <ArrowRight className="size-3" />
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-xs">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="grid size-8 place-items-center rounded-lg bg-rose-500/10 text-rose-500 font-bold">
                    <Layers className="size-4" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Smart Flashcards</span>
                </div>
                <p className="text-sm font-semibold text-foreground">Spaced Repetition Engine</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  Active recall drills that automatically resurface hard cards before you forget them.
                </p>
                <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-rose-500">
                  <span>Boost retention</span>
                  <ArrowRight className="size-3" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Bento Grid */}
        <section id="features" className="mx-auto max-w-6xl px-5 py-16">
          <div className="text-center mb-12">
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              Core Capabilities
            </span>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl text-foreground">
              Everything you need to score top marks
            </h2>
            <p className="mt-2 text-base text-muted-foreground max-w-xl mx-auto">
              Replace multiple disjointed study tools with one fluid, connected workspace.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="group relative rounded-3xl border border-border/80 bg-card p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                    <feature.icon className="size-6" />
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${feature.badgeColor}`}>
                    {feature.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
              </article>
            ))}
          </div>

          {/* Value highlights grid */}
          <div className="mt-12 grid gap-4 rounded-3xl border border-border/70 bg-card/60 backdrop-blur-md p-6 sm:grid-cols-2 lg:grid-cols-4 shadow-sm">
            {highlights.map((item) => (
              <div key={item.title} className="flex items-center gap-3.5 p-2">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-success/10 text-success shadow-2xs">
                  <item.icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/70 bg-background/80 py-10 text-center text-sm text-muted-foreground backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BrandLock />
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs font-medium">
            <Link to="/features/quiz-generator-from-pdf" className="hover:text-foreground transition-colors">
              Quiz Generator from PDF
            </Link>
            <Link to="/notes" className="hover:text-foreground transition-colors">
              Course Notes
            </Link>
            <Link to="/assistant" className="hover:text-foreground transition-colors">
              AI Tutor
            </Link>
            <Link to="/premium" className="hover:text-foreground transition-colors">
              Free Access
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} StudyHub. Learn Smarter. Revise Faster.
          </p>
        </div>
      </footer>
    </div>
  );
}
