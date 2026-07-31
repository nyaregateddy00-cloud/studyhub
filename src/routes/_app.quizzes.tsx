import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ListChecks, RotateCcw, Timer, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { generateQuiz } from "@/lib/study-ai.functions";

export const Route = createFileRoute("/_app/quizzes")({
  head: () => ({
    meta: [
      { title: "Quizzes — StudyHub" },
      {
        name: "description",
        content: "Generate timed practice quizzes from your notes or any text, and track your scores.",
      },
      { property: "og:title", content: "Quizzes — StudyHub" },
      { property: "og:description", content: "Generate timed practice quizzes and track your scores." },
    ],
  }),
  component: QuizzesPage,
});

type Question = {
  type: "mcq" | "true_false" | "short";
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

type ActiveQuiz = { id: string; title: string; questions: Question[] };

function QuizzesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const createQuiz = useServerFn(generateQuiz);
  const [topic, setTopic] = useState("");
  const [source, setSource] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState("6");
  const [active, setActive] = useState<ActiveQuiz | null>(null);

  const quizzesQuery = useQuery({
    queryKey: ["quizzes", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("id,title,topic,questions,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const result = await createQuiz({
        data: { source, topic: topic || undefined, count: Number(count), difficulty },
      });
      const { data, error } = await supabase
        .from("quizzes")
        .insert({
          user_id: user!.id,
          title: result.title,
          topic: topic || null,
          difficulty,
          questions: result.questions,
        })
        .select("id,title,questions")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Quiz ready");
      setSource("");
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      setActive({ id: data.id, title: data.title, questions: data.questions as Question[] });
    },
    onError: () => toast.error("Couldn't generate that quiz. Try shorter material."),
  });

  if (active) {
    return <QuizRunner quiz={active} onExit={() => setActive(null)} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quizzes"
        description="Paste lecture material and get a timed practice quiz in seconds."
      />

      <form
        className="surface-card space-y-4 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          generate.mutate();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="topic">Topic (optional)</Label>
            <Input
              id="topic"
              value={topic}
              maxLength={120}
              placeholder="e.g. Thermodynamics"
              onChange={(event) => setTopic(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Questions</Label>
            <Select value={count} onValueChange={setCount}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["5", "6", "10", "15"].map((value) => (
                  <SelectItem key={value} value={value}>
                    {value} questions
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="source">Study material</Label>
          <Textarea
            id="source"
            rows={7}
            maxLength={20000}
            required
            placeholder="Paste your notes, a summary or a chapter here (at least a paragraph)."
            value={source}
            onChange={(event) => setSource(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={generate.isPending || source.trim().length < 20}>
          {generate.isPending ? "Generating..." : "Generate quiz"}
        </Button>
      </form>

      <div>
        <h2 className="text-lg font-semibold">Your quizzes</h2>
        {quizzesQuery.isLoading ? (
          <Skeleton className="mt-4 h-24" />
        ) : (quizzesQuery.data ?? []).length === 0 ? (
          <div className="surface-card mt-4 p-10 text-center">
            <ListChecks className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No quizzes yet.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(quizzesQuery.data ?? []).map((quiz) => (
              <button
                key={quiz.id}
                className="surface-card lift p-5 text-left"
                onClick={() =>
                  setActive({
                    id: quiz.id,
                    title: quiz.title,
                    questions: quiz.questions as Question[],
                  })
                }
              >
                <p className="font-semibold">{quiz.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(quiz.questions as Question[]).length} questions
                  {quiz.topic ? ` · ${quiz.topic}` : ""}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuizRunner({ quiz, onExit }: { quiz: ActiveQuiz; onExit: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (submitted) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [submitted]);

  const score = quiz.questions.reduce(
    (total, question, index) =>
      (answers[index] ?? "").trim().toLowerCase() === question.answer.trim().toLowerCase()
        ? total + 1
        : total,
    0,
  );

  async function submit() {
    setSubmitted(true);
    const { error } = await supabase.from("quiz_attempts").insert({
      quiz_id: quiz.id,
      user_id: user!.id,
      score,
      total: quiz.questions.length,
      seconds_taken: seconds,
      answers,
    });
    if (error) toast.error("Score couldn't be saved.");
    else queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{quiz.title}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Timer className="size-4" />
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </p>
        </div>
        <Button variant="outline" onClick={onExit}>
          Back
        </Button>
      </div>

      {submitted && (
        <div className="surface-card p-6 text-center">
          <p className="text-4xl font-bold">
            {score}/{quiz.questions.length}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {Math.round((score / quiz.questions.length) * 100)}% in {seconds}s
          </p>
        </div>
      )}

      <ol className="space-y-4">
        {quiz.questions.map((question, index) => {
          const given = answers[index] ?? "";
          const correct = given.trim().toLowerCase() === question.answer.trim().toLowerCase();
          return (
            <li key={index} className="surface-card p-5">
              <p className="font-medium">
                {index + 1}. {question.question}
              </p>
              {question.options.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {question.options.map((option) => (
                    <button
                      key={option}
                      disabled={submitted}
                      onClick={() => setAnswers({ ...answers, [index]: option })}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        given === option
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-secondary"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <Input
                  className="mt-3"
                  disabled={submitted}
                  value={given}
                  maxLength={200}
                  onChange={(event) => setAnswers({ ...answers, [index]: event.target.value })}
                />
              )}
              {submitted && (
                <div className="mt-3 flex gap-2 rounded-lg bg-secondary p-3 text-sm">
                  {correct ? (
                    <CheckCircle2 className="size-4 shrink-0 text-accent" />
                  ) : (
                    <XCircle className="size-4 shrink-0 text-destructive" />
                  )}
                  <span>
                    <strong>{question.answer}</strong> — {question.explanation}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {!submitted && (
        <Button className="w-full" onClick={submit}>
          Submit answers
        </Button>
      )}
    </div>
  );
}