import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  FileStack,
  Layers,
  Sparkles,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/premium")({
  head: () => ({
    meta: [
      { title: "Free Access — StudyHub" },
      {
        name: "description",
        content:
          "StudyHub is completely free for all students. Enjoy unlimited AI tutoring, notes downloads, quizzes, and revision tools.",
      },
      { property: "og:title", content: "100% Free Access — StudyHub" },
      {
        property: "og:description",
        content: "Unlimited AI tutoring, downloads, and quizzes — completely free for all students.",
      },
    ],
  }),
  component: FreeAccessPage,
});

const features = [
  {
    icon: Bot,
    title: "Unlimited AI Tutor",
    description: "Ask detailed questions, summarize lecture slides, and get step-by-step solutions without any message limits.",
    link: "/assistant",
    cta: "Chat with AI",
  },
  {
    icon: BookOpen,
    title: "Unlimited Document Downloads",
    description: "Download verified lecture notes, revision booklets, and past papers instantly with zero restrictions.",
    link: "/notes",
    cta: "Explore Notes",
  },
  {
    icon: FileStack,
    title: "Unlimited Quizzes & Tests",
    description: "Generate tailored quizzes from any course material to test your knowledge ahead of exams.",
    link: "/quizzes",
    cta: "Take a Quiz",
  },
  {
    icon: Layers,
    title: "Smart Flashcards & Spaced Repetition",
    description: "Master difficult definitions and concepts with interactive flashcards and study decks.",
    link: "/flashcards",
    cta: "View Flashcards",
  },
  {
    icon: Users,
    title: "Collaborative Study Groups",
    description: "Join university study groups, ask questions in the community forum, and share knowledge with peers.",
    link: "/community",
    cta: "Join Community",
  },
  {
    icon: Sparkles,
    title: "Academic Revision Planner",
    description: "Organize upcoming exam deadlines, revision sessions, and keep track of your daily learning streak.",
    link: "/planner",
    cta: "Open Planner",
  },
];

function FreeAccessPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader
        title="100% Free for Every Student"
        description="No subscriptions, no fees, no paywalls. Everything on StudyHub is open and unrestricted."
      />

      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-secondary/30 p-8 shadow-sm">
        <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5 px-3 py-1 font-semibold text-xs">
            <CheckCircle2 className="size-3.5" /> All Features Unlocked
          </Badge>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Study without limits. We believe high-quality learning tools should be accessible to all students.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Every account on StudyHub comes with unlimited access to the AI tutor, comprehensive course notes, past exams, quiz generators, and study tools at zero cost.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-xl shadow-xs">
              <Link to="/dashboard">
                Go to Dashboard <ArrowRight className="size-4 ml-1.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl">
              <Link to="/assistant">Start AI Tutoring</Link>
            </Button>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h3 className="font-display text-xl font-bold tracking-tight">Included Features</h3>
          <p className="text-sm text-muted-foreground">
            Everything you need to excel in your academic journey.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3.5 group-hover:scale-105 transition-transform">
                  <feature.icon className="size-5" />
                </div>
                <h4 className="font-semibold text-base tracking-tight mb-1.5">{feature.title}</h4>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
              <div className="pt-4 mt-auto">
                <Button asChild variant="ghost" size="sm" className="p-0 h-auto text-primary hover:text-primary/80 font-medium text-xs">
                  <Link to={feature.link} className="flex items-center gap-1">
                    {feature.cta} <ArrowRight className="size-3" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}