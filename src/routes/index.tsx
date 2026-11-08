import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  BookOpen,
  Bot,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  FileText,
  Flame,
  GraduationCap,
  Layers,
  ListChecks,
  MessageSquare,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  TrendingUp,
  UploadCloud,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
          "Everything you need to learn, revise, collaborate and succeed — all in one intelligent student platform with AI tutoring, shared course notes, practice quizzes, and spaced flashcards.",
      },
      { property: "og:title", content: "StudyHub — Your Learning Journey, Reimagined" },
      {
        property: "og:description",
        content:
          "Everything you need to learn, revise, collaborate and succeed — all in one intelligent student platform.",
      },
      { property: "og:url", content: "https://studyhubke-site.lovable.app/" },
      { name: "twitter:title", content: "StudyHub — Your Learning Journey, Reimagined" },
      {
        name: "twitter:description",
        content:
          "Everything you need to learn, revise, collaborate and succeed — all in one intelligent student platform.",
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
                "AI-powered study workspace with shared course notes, quiz generation, flashcards, and an AI tutor.",
            },
            {
              "@type": "WebSite",
              name: "StudyHub",
              url: "https://studyhubke-site.lovable.app/",
              description:
                "Share and search course notes, generate quizzes from any PDF, drill flashcards, and ask an AI tutor.",
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
    title: "Course Notes That Stay Organised",
    body: "Upload PDFs, lecture slides, and handwritten notes categorized seamlessly by university, school, programme, and course unit.",
    badge: "Smart Library",
    accent: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    gradient: "from-blue-500/10 via-transparent to-transparent",
  },
  {
    icon: Bot,
    title: "24/7 AI Academic Tutor",
    body: "Ask questions anytime. Unpack difficult textbook problems, request step-by-step math breakdowns, or summarize 50-page slides in seconds.",
    badge: "AI Powered",
    accent: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    gradient: "from-emerald-500/10 via-transparent to-transparent",
  },
  {
    icon: ListChecks,
    title: "Instant AI Quiz Generator",
    body: "Turn any uploaded document, lecture slide, or curriculum unit into timed multiple-choice and short-answer exams with instant feedback.",
    badge: "Active Recall",
    accent: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    gradient: "from-blue-400/10 via-transparent to-transparent",
  },
  {
    icon: Layers,
    title: "Spaced Repetition Flashcards",
    body: "Master key definitions, formulas, and concepts. Our scientifically backed Leitner memory engine surfaces tricky cards right before you forget them.",
    badge: "Memory Engine",
    accent: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    gradient: "from-emerald-400/10 via-transparent to-transparent",
  },
  {
    icon: CalendarDays,
    title: "Adaptive Study Planner",
    body: "Plan daily study blocks, keep track of semester exam dates, submit assignments on time, and protect your study streak.",
    badge: "Productivity",
    accent: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    gradient: "from-blue-500/10 via-transparent to-transparent",
  },
  {
    icon: Users,
    title: "Collaborative Student Community",
    body: "Connect with classmates in your course, ask tough exam questions, share vetted revision materials, and climb campus leaderboards.",
    badge: "Community",
    accent: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    gradient: "from-emerald-500/10 via-transparent to-transparent",
  },
];

const metrics = [
  { value: "50,000+", label: "Verified Study Notes", hint: "From 50+ universities" },
  { value: "120,000+", label: "AI Practice Quizzes", hint: "Instant exam preparation" },
  { value: "94.8%", label: "Exam Success Rate", hint: "Reported grade improvement" },
  { value: "100% Free", label: "Open To Every Student", hint: "No credit card required" },
];

const testimonials = [
  {
    quote:
      "StudyHub completely changed how I prepare for exams. I uploaded my 80-page Biochemistry slides and had a 20-question practice quiz ready in 10 seconds. My GPA went from 3.1 to 3.8.",
    author: "David Kipkorir",
    role: "Biomedical Science · Year 3",
    university: "University of Nairobi",
    initials: "DK",
  },
  {
    quote:
      "Having my past papers, course units, and the 24/7 AI tutor in one clean workspace saves me hours every week. The spaced flashcards are magic for remembering Law case precedents.",
    author: "Amina Wanjiku",
    role: "Bachelor of Laws (LL.B) · Year 2",
    university: "Strathmore University",
    initials: "AW",
  },
  {
    quote:
      "The best part is finding notes and questions specifically tailored to my exact university units. It feels like having a private study group with the top 5% of students.",
    author: "Brian Otieno",
    role: "Computer Science · Year 4",
    university: "JKUAT",
    initials: "BO",
  },
];

type PreviewTab = "tutor" | "quiz" | "flashcard" | "notes";

function Landing() {
  const { session } = useAuth();
  const { theme, toggle } = useTheme();
  const [activeTab, setActiveTab] = useState<PreviewTab>("tutor");

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col justify-between overflow-x-hidden selection:bg-primary/20 selection:text-primary">
      {/* Background ambient lighting accents — deep rich blue #155EEF and fresh green #16A34A */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-primary/18 blur-[140px] rounded-full" />
        <div className="absolute top-[35%] -right-48 w-[550px] h-[400px] bg-emerald-500/12 blur-[150px] rounded-full" />
        <div className="absolute top-[70%] -left-48 w-[600px] h-[450px] bg-primary/12 blur-[150px] rounded-full" />
        <div className="hero-grid-pattern absolute inset-0 opacity-40 dark:opacity-25" />
      </div>

      {/* Cinematic Navigation Header */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-background/80 border-b border-border/60 transition-colors">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2 group">
            <BrandLock className="transition-transform duration-200 group-hover:scale-102" />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Capabilities
            </a>
            <a href="#preview" className="hover:text-foreground transition-colors">
              Interface
            </a>
            <a href="#ai-engine" className="hover:text-foreground transition-colors">
              AI Study Tools
            </a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">
              Student Stories
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Toggle dark mode"
              className="size-9 rounded-xl border border-border/60 hover:bg-secondary transition-all active:scale-95"
            >
              {theme === "dark" ? (
                <Sun className="size-4 text-emerald-400 transition-transform" />
              ) : (
                <Moon className="size-4 text-muted-foreground transition-transform" />
              )}
            </Button>

            {session ? (
              <Button
                asChild
                className="h-9 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all"
              >
                <Link to="/dashboard">
                  Open Dashboard
                  <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" className="h-9 px-4 rounded-xl text-sm font-medium">
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button
                  asChild
                  className="h-9 px-4 sm:px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all"
                >
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Get Started Free
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-8 sm:pt-24 text-center">
          {/* Tagline Pill */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/8 px-4 py-1.5 text-xs font-semibold text-primary shadow-xs glow-pill mb-6"
          >
            <Sparkles className="size-3.5 text-primary" />
            <span>Learn Smarter. Revise Faster. Succeed Together.</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto max-w-4xl text-balance text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-[1.08] text-foreground font-display"
          >
            Your Learning Journey,{" "}
            <span className="bg-gradient-to-r from-primary via-blue-500 to-emerald-500 bg-clip-text text-transparent">
              Reimagined.
            </span>
          </motion.h1>

          {/* Supporting Text */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-xl font-normal leading-relaxed"
          >
            Everything you need to learn, revise, collaborate and succeed — all in one intelligent student platform.
          </motion.p>

          {/* Primary CTA Row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Button
              asChild
              size="lg"
              className="h-12 px-8 rounded-2xl bg-primary hover:bg-primary/95 text-primary-foreground text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              <Link to="/auth" search={{ mode: "signup" }}>
                Start Learning Free
                <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-7 rounded-2xl border-border/80 bg-card/60 backdrop-blur-md hover:bg-secondary text-base font-medium shadow-xs hover:-translate-y-0.5 transition-all"
            >
              <a href="#preview">Explore Platform Demo</a>
            </Button>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-muted-foreground"
          >
            <div className="flex text-amber-400" aria-hidden>
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className="size-4 fill-current" />
              ))}
            </div>
            <span className="font-semibold text-foreground">4.9/5 Student Rating</span>
            <span className="text-muted-foreground/40">·</span>
            <span>Loved by thousands of university students across East Africa and beyond</span>
          </motion.div>

          {/* Interactive Cinematic Preview Console */}
          <motion.div
            id="preview"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="mt-16 mx-auto max-w-5xl rounded-3xl border border-border/80 bg-card/85 backdrop-blur-2xl p-4 sm:p-7 shadow-2xl card-glow-hover text-left"
          >
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-red-500/80" />
                <span className="size-3 rounded-full bg-amber-500/80" />
                <span className="size-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  StudyHub Intelligent Studio
                </span>
              </div>

              {/* Console Tabs */}
              <div className="flex flex-wrap items-center gap-1 rounded-xl bg-secondary/80 p-1 border border-border/50">
                {(
                  [
                    { id: "tutor", label: "AI Tutor", icon: Bot },
                    { id: "quiz", label: "AI Quiz Maker", icon: ListChecks },
                    { id: "flashcard", label: "Smart Flashcards", icon: Layers },
                    { id: "notes", label: "Course Notes", icon: BookOpen },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? "bg-card text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Console Body */}
            <div className="pt-6 min-h-[300px]">
              <AnimatePresence mode="wait">
                {activeTab === "tutor" && (
                  <motion.div
                    key="tutor"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-secondary text-foreground text-xs font-bold">
                        You
                      </div>
                      <div className="rounded-2xl rounded-tl-sm bg-secondary/70 px-4 py-2.5 text-sm">
                        Can you explain the difference between Mitosis and Meiosis simply for my upcoming Genetics exam?
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground font-bold shadow-xs">
                        <Bot className="size-4" />
                      </div>
                      <div className="flex-1 space-y-3 rounded-2xl rounded-tl-sm border border-border/60 bg-background/80 p-4 text-sm leading-relaxed">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-primary">StudyHub AI Tutor</span>
                          <span className="rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-0.2 border border-emerald-500/20">
                            Instant Verified
                          </span>
                        </div>
                        <p className="text-foreground/90">
                          Here is the clearest way to remember it for exam day:
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2 text-xs">
                          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                            <p className="font-bold text-blue-500">1. Mitosis (Body Cells)</p>
                            <p className="mt-1 text-muted-foreground">
                              Produces <strong>2 identical diploid cells</strong>. Used for growth, repair, and tissue regeneration. Same chromosome count.
                            </p>
                          </div>
                          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                            <p className="font-bold text-emerald-500">2. Meiosis (Sex Cells)</p>
                            <p className="mt-1 text-muted-foreground">
                              Produces <strong>4 unique haploid gametes</strong>. Involves crossing-over for genetic diversity. Half the chromosome count.
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <span className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground">
                            <Sparkles className="size-3 text-primary" /> Generated 5-card deck
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground">
                            <ListChecks className="size-3 text-emerald-500" /> Practice quiz ready
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "quiz" && (
                  <motion.div
                    key="quiz"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-border/50 pb-3">
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground uppercase">
                          Question 3 of 10 · Timed Mock Exam
                        </span>
                        <h4 className="text-sm font-bold text-foreground">
                          What is the time complexity of searching in a Balanced Binary Search Tree?
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-500 border border-emerald-500/20">
                        <Clock className="size-3" /> 00:45 left
                      </div>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
                      <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3 font-medium text-muted-foreground">
                        <span>A) O(n)</span>
                        <span className="text-muted-foreground/60">Worst-case linear</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-emerald-500 bg-emerald-500/10 p-3 font-semibold text-emerald-500 shadow-xs">
                        <span>B) O(log n)</span>
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3 font-medium text-muted-foreground">
                        <span>C) O(1)</span>
                        <span className="text-muted-foreground/60">Constant</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3 font-medium text-muted-foreground">
                        <span>D) O(n log n)</span>
                        <span className="text-muted-foreground/60">Linearithmic</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
                      <strong className="text-emerald-500">Correct! Explanation: </strong>
                      In a balanced BST like an AVL or Red-Black Tree, each comparison divides the remaining search space in half, resulting in O(log n) logarithmic time.
                    </div>
                  </motion.div>
                )}

                {activeTab === "flashcard" && (
                  <motion.div
                    key="flashcard"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="grid place-items-center py-4"
                  >
                    <div className="w-full max-w-md rounded-2xl border border-primary/30 bg-gradient-to-br from-card to-secondary/30 p-6 shadow-md text-center">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                        <span className="font-semibold text-primary">Card 12 / 48 · Spaced Review</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary font-bold">Leitner Level 3</span>
                      </div>
                      <h3 className="text-lg font-bold text-foreground">
                        What is Amdahl&apos;s Law used for in Computer Architecture?
                      </h3>
                      <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                        Formula that predicts the theoretical maximum speedup in latency of an execution task when fixed workloads are enhanced by parallel processors.
                      </p>
                      <div className="mt-6 flex justify-center gap-2">
                        <button type="button" className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-1.5 text-xs font-semibold">
                          Again (&lt;10m)
                        </button>
                        <button type="button" className="rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 px-4 py-1.5 text-xs font-semibold">
                          Hard (1d)
                        </button>
                        <button type="button" className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-4 py-1.5 text-xs font-semibold">
                          Easy (4d)
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "notes" && (
                  <motion.div
                    key="notes"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-primary" />
                        <span className="font-bold text-sm text-foreground">
                          Database Systems & SQL Optimization.pdf
                        </span>
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                          18 pages
                        </span>
                      </div>
                      <span className="text-muted-foreground">Unit: CSC 3102</span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 pt-2">
                      <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
                        <p className="font-bold text-foreground">Key Concept 1: Indexing</p>
                        <p className="mt-1 text-muted-foreground">B-Trees vs Hash indexes; clustered vs secondary index structures.</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
                        <p className="font-bold text-foreground">Key Concept 2: ACID Rules</p>
                        <p className="mt-1 text-muted-foreground">Atomicity, Consistency, Isolation, and Durability transaction locks.</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
                        <p className="font-bold text-foreground">Key Concept 3: Normalization</p>
                        <p className="mt-1 text-muted-foreground">Eliminating redundancy with 1NF, 2NF, 3NF, and Boyce-Codd normal forms.</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-muted-foreground">Tagged by University of Nairobi · Verified 4.9 ★</span>
                      <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg">
                        Download &amp; Ask AI
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </section>

        {/* Live Metrics Row */}
        <section className="border-y border-border/60 bg-card/40 backdrop-blur-md py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 text-center">
              {metrics.map((metric, index) => (
                <div key={index} className="space-y-1">
                  <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-display">
                    {metric.value}
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-foreground/80">{metric.label}</p>
                  <p className="text-[11px] text-muted-foreground">{metric.hint}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Bento Grid */}
        <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-primary border border-primary/20">
              Core Ecosystem
            </span>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-5xl text-foreground font-display tracking-tight">
              Built for how students truly learn
            </h2>
            <p className="mt-3 text-base text-muted-foreground leading-relaxed">
              Consolidate disjointed PDFs, disconnected flashcard apps, and disorganized chat groups into one cohesive workspace.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group relative rounded-3xl border border-border/80 bg-gradient-to-b from-card to-card/50 p-7 shadow-xs hover:shadow-xl hover:border-primary/40 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 h-32 w-32 bg-gradient-to-bl ${feature.gradient} rounded-bl-full pointer-events-none`} />
                  <div className="flex items-center justify-between mb-5">
                    <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary transition-transform duration-200 group-hover:scale-110 shadow-xs">
                      <Icon className="size-6" />
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${feature.accent}`}>
                      {feature.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Deep Dive Section: The AI Study Engine */}
        <section id="ai-engine" className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
          <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-emerald-500/10 p-8 sm:p-12 shadow-xl">
            <div className="grid gap-8 lg:grid-cols-2 items-center">
              <div className="space-y-5 text-left">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-500 uppercase tracking-wider">
                  <BrainCircuit className="size-3.5" /> High Performance AI Engine
                </span>
                <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-display">
                  From 100-page lecture PDF to exam readiness in minutes
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Traditional revision involves spending 70% of your time summarizing notes and only 30% actually testing recall. StudyHub flips that ratio:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/20 text-primary mt-0.5">
                      <CheckCircle2 className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Extract &amp; Outline Key Topics</p>
                      <p className="text-xs text-muted-foreground">
                        Our engine analyzes slides, formulas, and diagrams to extract syllabus-aligned themes.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/20 text-primary mt-0.5">
                      <CheckCircle2 className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Auto-Generate Timed Mock Exams</p>
                      <p className="text-xs text-muted-foreground">
                        Instant practice tests categorized by difficulty with automated solution explanations.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/20 text-primary mt-0.5">
                      <CheckCircle2 className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Smart Spaced Repetition Drill</p>
                      <p className="text-xs text-muted-foreground">
                        Never experience the forgetfulness curve again before final examinations.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Card representation */}
              <div className="rounded-2xl border border-border/80 bg-background/90 backdrop-blur-xl p-6 shadow-lg space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Document AI Pipeline
                    </span>
                  </div>
                  <span className="text-[10px] rounded-full bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5">
                    Completed in 4.2s
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-2.5">
                    <span className="text-muted-foreground">Lecture Notes Analyzed</span>
                    <span className="font-bold text-foreground">64 Slides</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-2.5">
                    <span className="text-muted-foreground">Practice Questions Synthesized</span>
                    <span className="font-bold text-primary">15 Questions</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-2.5">
                    <span className="text-muted-foreground">Active Recall Cards</span>
                    <span className="font-bold text-emerald-500">32 Flashcards</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-2.5">
                    <span className="text-muted-foreground">Predicted Exam High Yield</span>
                    <span className="font-bold text-foreground">92% Coverage</span>
                  </div>
                </div>
                <Button asChild className="w-full rounded-xl bg-primary hover:bg-primary/90 text-xs font-semibold h-10 shadow-sm">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Try It With Your Notes
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Student Testimonials */}
        <section id="testimonials" className="mx-auto max-w-7xl px-4 py-20 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-500 border border-emerald-500/20">
              Student Endorsements
            </span>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl text-foreground font-display tracking-tight">
              Trusted by top students across campuses
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Real feedback from learners using StudyHub to graduate at the top of their class.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 text-left">
            {testimonials.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-6 shadow-xs hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex text-amber-400 mb-4" aria-hidden>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="size-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground italic">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-3 border-t border-border/60 pt-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-primary to-emerald-500 text-xs font-bold text-white shadow-xs">
                    {item.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{item.author}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.role}</p>
                    <p className="truncate text-[11px] text-primary font-medium">{item.university}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cinematic Call to Action Banner */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-r from-primary via-blue-600 to-emerald-600 p-8 sm:p-14 text-center text-white shadow-2xl">
            <div className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-emerald-400/20 blur-3xl" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <span className="inline-block rounded-full bg-white/15 px-3.5 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                Get Ahead This Semester
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display">
                Ready to transform how you study?
              </h2>
              <p className="text-sm sm:text-base text-white/90 leading-relaxed">
                Join thousands of students who study smarter, finish revision faster, and achieve top grades with StudyHub.
              </p>
              <div className="pt-4 flex flex-wrap justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-8 rounded-2xl bg-white text-primary hover:bg-white/90 text-base font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Create Free Account
                    <ArrowRight className="size-4 ml-1.5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 px-7 rounded-2xl border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-md text-base font-semibold"
                >
                  <Link to="/auth">Sign In</Link>
                </Button>
              </div>
              <p className="text-xs text-white/70 pt-2">
                Free for all learners · No credit card required · Instant setup in 30 seconds
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Professional Footer */}
      <footer className="border-t border-border/70 bg-card/60 backdrop-blur-xl py-12 text-sm text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 pb-10 border-b border-border/60">
            <div className="lg:col-span-2 space-y-3">
              <BrandLock />
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
                StudyHub is the all-in-one AI learning platform for students. Learn smarter, revise faster, and succeed together.
              </p>
              <div className="pt-2 text-xs font-semibold text-primary">
                &ldquo;Learn Smarter. Revise Faster. Succeed Together.&rdquo;
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">Learning Suite</p>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <Link to="/notes" className="hover:text-foreground transition-colors">
                    Course Notes Library
                  </Link>
                </li>
                <li>
                  <Link to="/quizzes" className="hover:text-foreground transition-colors">
                    AI Quiz Generator
                  </Link>
                </li>
                <li>
                  <Link to="/flashcards" className="hover:text-foreground transition-colors">
                    Spaced Flashcards
                  </Link>
                </li>
                <li>
                  <Link to="/assistant" className="hover:text-foreground transition-colors">
                    24/7 AI Tutor
                  </Link>
                </li>
                <li>
                  <Link to="/planner" className="hover:text-foreground transition-colors">
                    Adaptive Planner
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">Community</p>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <Link to="/community" className="hover:text-foreground transition-colors">
                    Student Q&amp;A
                  </Link>
                </li>
                <li>
                  <Link to="/leaderboard" className="hover:text-foreground transition-colors">
                    Campus Leaderboard
                  </Link>
                </li>
                <li>
                  <Link to="/groups" className="hover:text-foreground transition-colors">
                    Study Groups
                  </Link>
                </li>
                <li>
                  <Link to="/premium" className="hover:text-foreground transition-colors">
                    Free Access Initiative
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">Platform</p>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <Link to="/features/quiz-generator-from-pdf" className="hover:text-foreground transition-colors">
                    PDF Quiz Maker
                  </Link>
                </li>
                <li>
                  <Link to="/settings" className="hover:text-foreground transition-colors">
                    Account Settings
                  </Link>
                </li>
                <li>
                  <Link to="/auth" className="hover:text-foreground transition-colors">
                    Sign In / Register
                  </Link>
                </li>
                <li>
                  <a href="mailto:support@studyhub.com" className="hover:text-foreground transition-colors">
                    Contact &amp; Support
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} StudyHub Technologies Inc. All rights reserved.</p>
            <p className="flex items-center gap-1">
              Crafted for university, college and high school learners worldwide.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
