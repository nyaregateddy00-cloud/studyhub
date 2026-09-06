import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Check,
  FileUp,
  ListChecks,
  Sparkles,
  Timer,
} from "lucide-react";

import { BrandLock } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const BASE_URL = "https://studyhubke-site.lovable.app";
const PAGE_PATH = "/features/quiz-generator-from-pdf";
const PAGE_URL = `${BASE_URL}${PAGE_PATH}`;
const TITLE = "Quiz Generator from PDF — StudyHub";
const DESCRIPTION =
  "Upload any PDF — lecture notes, slides or a textbook chapter — and StudyHub's AI turns it into timed multiple choice, true/false and short answer quizzes in seconds.";

export const Route = createFileRoute("/features/quiz-generator-from-pdf")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              name: TITLE,
              url: PAGE_URL,
              description: DESCRIPTION,
              isPartOf: { "@type": "WebSite", name: "StudyHub", url: `${BASE_URL}/` },
            },
            {
              "@type": "SoftwareApplication",
              name: "StudyHub Quiz Generator",
              applicationCategory: "EducationalApplication",
              operatingSystem: "Web",
              url: PAGE_URL,
              description:
                "AI quiz generator that converts PDF study materials into interactive multiple choice, true/false and short answer quizzes.",
              offers: { "@type": "Offer", price: "0", priceCurrency: "KES" },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: `${BASE_URL}/` },
                { "@type": "ListItem", position: 2, name: "Quiz Generator from PDF", item: PAGE_URL },
              ],
            },
          ],
        }),
      },
    ],
  }),
  component: QuizGeneratorPage,
});

const steps = [
  {
    icon: FileUp,
    title: "1. Upload your PDF",
    body: "Drop in lecture notes, presentation slides, a past paper or a textbook chapter. PDF, DOCX, PPTX and plain text all work.",
  },
  {
    icon: Sparkles,
    title: "2. AI builds your quiz",
    body: "StudyHub reads the material and writes questions from it — multiple choice, true/false or short answer — at the difficulty you choose.",
  },
  {
    icon: Timer,
    title: "3. Sit a timed test",
    body: "Answer under exam-style timing, get instant marking, and review every question with an explanation of what you missed.",
  },
  {
    icon: BookOpen,
    title: "4. Fix your weak spots",
    body: "Your attempts feed analytics so you can see topics improving over time — or ask the AI tutor to unpack any question you got wrong.",
  },
];

const benefits = [
  "Multiple choice, true/false and short answer questions",
  "Difficulty control — from quick recall to exam level",
  "Timed mode that mirrors real exam pressure",
  "Instant marking with per-question explanations",
  "Attempt history and trend charts over time",
  "Works on notes you upload or notes shared by classmates",
];

function QuizGeneratorPage() {
  const { session } = useAuth();
  const ctaTo = session ? "/quizzes" : "/auth";

  return (
    <div className="min-h-screen mesh-bg">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <BrandLock />
        <div className="flex items-center gap-2">
          {session ? (
            <Button asChild>
              <Link to="/quizzes">Open quizzes</Link>
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

      <main className="mx-auto max-w-6xl px-5">
        <section className="pt-10 pb-14 sm:pt-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ListChecks className="size-3.5" />
            AI Quiz Generator
          </span>
          <h1 className="mt-6 max-w-3xl text-balance text-4xl leading-[1.05] font-bold sm:text-5xl">
            Turn any PDF into a{" "}
            <span className="gradient-text">practice quiz</span> in seconds
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Stop re-reading the same notes. Upload your study material and let StudyHub's AI quiz
            generator from PDF test you on what actually matters — so you walk into the exam
            already knowing your weak spots.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to={ctaTo} search={session ? undefined : { mode: "signup" }}>
                Generate a quiz free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/">Explore all features</Link>
            </Button>
          </div>
        </section>

        <section aria-labelledby="how-it-works" className="pb-14">
          <h2 id="how-it-works" className="text-2xl font-bold sm:text-3xl">
            How the PDF quiz generator works
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <article key={step.title} className="surface-card lift p-6">
                <span className="brand-tint flex size-11 items-center justify-center rounded-xl text-primary">
                  <step.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="what-you-get" className="pb-14">
          <div className="surface-card grid gap-8 p-8 lg:grid-cols-2">
            <div>
              <h2 id="what-you-get" className="text-2xl font-bold sm:text-3xl">
                Built for real revision, not busywork
              </h2>
              <p className="mt-3 text-muted-foreground">
                A good quiz generator from PDF does more than copy sentences into questions.
                StudyHub writes questions that test understanding, marks them instantly, and keeps
                score of how your revision is trending.
              </p>
              <Button asChild className="mt-6">
                <Link to={ctaTo} search={session ? undefined : { mode: "signup" }}>
                  Try it with your notes
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <ul className="grid gap-3 self-center">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-sm">
                  <span className="success-tint mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-success">
                    <Check className="size-3" />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        StudyHub — Learn Smarter. Revise Faster. Succeed Together.
      </footer>
    </div>
  );
}
