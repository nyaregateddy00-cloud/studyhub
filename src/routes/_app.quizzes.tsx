import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Award,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Flame,
  Gauge,
  ListChecks,
  RotateCcw,
  Sparkles,
  Sprout,
  Timer,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { extractText } from "unpdf";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { EmptyState } from "@/components/dashboard/primitives";
import { DIFFICULTY_CLASSES, type Difficulty } from "@/lib/design-tokens";
import { useAuth } from "@/lib/auth";
import { generateQuizAPI } from "@/services/ai.service";
import { QuizService } from "@/services/quiz.service";
import { NotesService } from "@/services/notes.service";

export const Route = createFileRoute("/_app/quizzes")({
  head: () => ({
    meta: [
      { title: "Quizzes — StudyHub" },
      {
        name: "description",
        content:
          "Generate timed practice quizzes from your notes or any text, and track your scores.",
      },
      { property: "og:title", content: "Quizzes — StudyHub" },
      {
        property: "og:description",
        content: "Generate timed practice quizzes and track your scores.",
      },
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
  const [topic, setTopic] = useState("");
  const [source, setSource] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState("6");
  const [active, setActive] = useState<ActiveQuiz | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [notesPickerOpen, setNotesPickerOpen] = useState(false);

  const notesQuery = useQuery({
    queryKey: ["notes-for-quiz", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => NotesService.list(),
  });

  async function handleFileUpload(file: File) {
    const isPdf =
      file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    setExtracting(true);
    const toastId = toast.loading(`Reading ${file.name}...`);
    try {
      let content = "";
      if (isPdf) {
        const arrayBuffer = await file.arrayBuffer();
        const extracted = await extractText(arrayBuffer);
        const pages = Array.isArray(extracted.text)
          ? extracted.text.join("\n\n")
          : String(extracted.text ?? "");
        content = pages.trim();
        if (!content) {
          throw new Error(
            "Could not extract readable text from this PDF. It may contain scanned images rather than text."
          );
        }
        toast.success(
          `Extracted text from ${file.name} (${extracted.totalPages} pages)`,
          { id: toastId }
        );
      } else {
        content = await file.text();
        toast.success(`Loaded ${file.name}`, { id: toastId });
      }

      const trimmed = content.slice(0, 20000);
      setSource(trimmed);
      setLoadedFileName(file.name);
      if (!topic.trim()) {
        const autoTopic = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]/g, " ")
          .trim();
        setTopic(autoTopic.slice(0, 120));
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to extract text from file.";
      toast.error(message, { id: toastId });
    } finally {
      setExtracting(false);
    }
  }

  const quizzesQuery = useQuery({
    queryKey: ["quizzes", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => QuizService.list(),
  });

  const generate = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("Please sign in to generate and save quizzes.");
      }
      if (!source.trim() && !topic.trim()) {
        throw new Error("Please enter a topic or paste study material.");
      }
      const result = await generateQuizAPI({
        source: source.trim() || undefined,
        topic: topic.trim() || undefined,
        count: Number(count),
        difficulty,
      });
      return QuizService.create({
        user_id: user.id,
        title: result.title,
        topic: topic || null,
        difficulty,
        questions: result.questions,
      });
    },
    onSuccess: (data) => {
      toast.success("Quiz ready");
      setSource("");
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      setActive({ id: data.id, title: data.title, questions: data.questions as Question[] });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: unknown }).message)
            : "Couldn't generate that quiz. Please try again.";
      toast.error(message);
    },
  });

  if (active) {
    return <QuizRunner quiz={active} onExit={() => setActive(null)} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quizzes"
        description="Generate timed practice quizzes from your notes, uploaded PDFs, or study material."
        actions={
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2 shadow-xs"
            disabled={extracting}
          >
            {extracting ? (
              <Sparkles className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            <span>Upload material</span>
          </Button>
        }
      />

      <form
        className="rounded-3xl border border-primary/20 bg-gradient-to-b from-card to-card/60 p-6 shadow-sm space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!source.trim() && !topic.trim()) {
            toast.error("Please enter a topic or paste study material to generate a quiz.");
            return;
          }
          generate.mutate();
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          accept=".pdf,.txt,.md,.markdown,.text,.json,.rtf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            e.target.value = "";
          }}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="topic">Topic (optional)</Label>
            <Input
              id="topic"
              value={topic}
              maxLength={120}
              placeholder="e.g. Thermodynamics, Cell Biology"
              onChange={(event) => setTopic(event.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">
                  <span className="flex items-center gap-1.5 text-success font-medium">
                    <Sprout className="size-3.5" /> Easy
                  </span>
                </SelectItem>
                <SelectItem value="medium">
                  <span className="flex items-center gap-1.5 text-warning font-medium">
                    <Gauge className="size-3.5" /> Medium
                  </span>
                </SelectItem>
                <SelectItem value="hard">
                  <span className="flex items-center gap-1.5 text-destructive font-medium">
                    <Flame className="size-3.5" /> Hard
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Questions</Label>
            <Select value={count} onValueChange={setCount}>
              <SelectTrigger className="rounded-xl">
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

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="source" className="text-sm font-medium">
              Study material
            </Label>
            <div className="flex items-center gap-2">
              {(notesQuery.data ?? []).filter((n) => Boolean(n.content)).length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setNotesPickerOpen(true)}
                >
                  <FileText className="size-3.5 text-primary" />
                  Choose from notes
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={extracting}
              >
                {extracting ? (
                  <Sparkles className="size-3.5 animate-spin text-primary" />
                ) : (
                  <Upload className="size-3.5 text-primary" />
                )}
                Upload file (PDF, TXT, MD)
              </Button>
            </div>
          </div>

          {loadedFileName && (
            <div className="flex items-center justify-between rounded-xl bg-primary/10 px-3 py-2 text-xs text-primary border border-primary/20">
              <span className="flex items-center gap-2 min-w-0 truncate">
                <FileText className="size-3.5 shrink-0" />
                <span>
                  Loaded: <strong className="font-semibold">{loadedFileName}</strong> ({source.length} characters)
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs hover:bg-primary/20"
                onClick={() => {
                  setLoadedFileName(null);
                  setSource("");
                }}
              >
                <X className="size-3 mr-1" /> Clear
              </Button>
            </div>
          )}

          <div
            className="relative"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileUpload(file);
            }}
          >
            <Textarea
              id="source"
              rows={6}
              maxLength={20000}
              placeholder="Paste your lecture notes, textbook excerpt, or revision summary here (or enter a Topic above), or click 'Upload file'."
              value={source}
              onChange={(event) => {
                setSource(event.target.value);
                if (loadedFileName) setLoadedFileName(null);
              }}
              className="rounded-xl leading-relaxed"
            />
            {source.length > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1.5 px-0.5">
                <span>{source.length} / 20,000 characters</span>
              </div>
            )}
            {!source && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 p-3 text-xs text-muted-foreground hover:border-primary/40 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <Upload className="size-3.5 text-primary" />
                <span>Drop a PDF or notes file here, or click to upload</span>
              </div>
            )}
          </div>
        </div>

        <Button
          type="submit"
          className="rounded-2xl shadow-md bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-primary-foreground h-11 px-6 font-semibold active:scale-[0.98] transition-all"
          disabled={generate.isPending}
        >
          {generate.isPending ? (
            <>
              <Sparkles className="mr-2 size-4 animate-spin" />
              Generating quiz...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-4" />
              Generate quiz with AI
            </>
          )}
        </Button>
      </form>

      <Dialog open={notesPickerOpen} onOpenChange={setNotesPickerOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              Choose Study Material from Notes
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {(notesQuery.data ?? []).filter((n) => Boolean(n.content)).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No saved notes with text content found. You can upload a file or write a note in the Notes space.
              </p>
            ) : (
              (notesQuery.data ?? [])
                .filter((n) => Boolean(n.content))
                .map((note) => (
                  <div
                    key={note.id}
                    onClick={() => {
                      setSource((note.content ?? "").slice(0, 20000));
                      setTopic(note.title.slice(0, 120));
                      setLoadedFileName(`Note: ${note.title}`);
                      setNotesPickerOpen(false);
                      toast.success(`Loaded "${note.title}" into quiz material`);
                    }}
                    className="group flex flex-col gap-1 rounded-xl border border-border/80 p-3 hover:border-primary/40 hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold group-hover:text-primary transition-colors">
                        {note.title}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {(note.content ?? "").length} chars
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {note.content}
                    </p>
                  </div>
                ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">Your practice quizzes</h2>
        {quizzesQuery.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        ) : (quizzesQuery.data ?? []).length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No quizzes yet"
            description="Paste notes or upload a PDF chapter above to generate your first timed practice quiz."
            action={
              <Button
                variant="outline"
                className="rounded-xl shadow-xs gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4" />
                Upload study material
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(quizzesQuery.data ?? []).map((quiz) => {
              const diffClass =
                DIFFICULTY_CLASSES[(quiz.difficulty as Difficulty) ?? "medium"]?.pill ??
                "bg-secondary text-muted-foreground";
              const qCount = (quiz.questions as Question[]).length;
              return (
                <button
                  key={quiz.id}
                  className="surface-card card-interactive flex flex-col p-5 text-left group border-border/80"
                  onClick={() =>
                    setActive({
                      id: quiz.id,
                      title: quiz.title,
                      questions: quiz.questions as Question[],
                    })
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display font-semibold text-base tracking-tight text-foreground transition-colors group-hover:text-primary">
                      {quiz.title}
                    </p>
                    <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-semibold capitalize shrink-0 ${diffClass}`}>
                      {quiz.difficulty ?? "medium"}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">{qCount} questions</span>
                    {quiz.topic && (
                      <>
                        <span>·</span>
                        <span className="truncate">{quiz.topic}</span>
                      </>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-end text-xs font-semibold text-primary group-hover:underline">
                    <span>Start quiz</span>
                    <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function isAnswerCorrect(given: string, answer: string, options: string[] = []): boolean {
  if (!given || !answer) return false;
  const g = given.trim().toLowerCase();
  const a = answer.trim().toLowerCase();
  if (g === a) return true;

  if (options && options.length > 0) {
    const letters = ["a", "b", "c", "d", "e", "f"];

    // User picked option text, answer is letter "a", "b", ...
    const givenIdx = options.findIndex((opt) => opt.trim().toLowerCase() === g);
    if (givenIdx !== -1 && letters[givenIdx] === a) return true;

    // User entered letter "a", "b", ..., answer is option text
    const answerIdx = options.findIndex((opt) => opt.trim().toLowerCase() === a);
    if (answerIdx !== -1 && letters[answerIdx] === g) return true;
  }
  return false;
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
      isAnswerCorrect(answers[index] ?? "", question.answer, question.options)
        ? total + 1
        : total,
    0,
  );

  const answered = quiz.questions.filter((_, index) => (answers[index] ?? "").trim()).length;
  const percent = Math.round((score / quiz.questions.length) * 100);

  function restart() {
    setAnswers({});
    setSubmitted(false);
    setSeconds(0);
  }

  async function submit() {
    setSubmitted(true);
    if (!user) {
      toast.info("Quiz completed! Sign in to save your score and track progress.");
      return;
    }
    try {
      await QuizService.submitAttempt({
        quiz_id: quiz.id,
        user_id: user.id,
        score,
        total: quiz.questions.length,
        seconds_taken: seconds,
        answers,
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch {
      toast.error("Score couldn't be saved.");
    }
  }

  const optionLetters = ["A", "B", "C", "D", "E", "F"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {quiz.title}
          </h1>
          <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-lg bg-secondary/80 px-2.5 py-0.5 font-mono text-xs font-semibold text-foreground">
              <Timer className="size-3.5 text-primary" />
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </span>
            <span>·</span>
            <span className="font-medium text-foreground/80">
              {answered} of {quiz.questions.length} answered
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {submitted && (
            <Button variant="outline" size="sm" className="rounded-xl" onClick={restart}>
              <RotateCcw className="mr-1.5 size-4" />
              Retry quiz
            </Button>
          )}
          <Button variant="outline" size="sm" className="rounded-xl" onClick={onExit}>
            Exit
          </Button>
        </div>
      </div>

      {!submitted && (
        <Progress value={(answered / quiz.questions.length) * 100} className="h-2 rounded-full" />
      )}

      {submitted && (
        <div className="surface-card p-6 sm:p-8 text-center border-border/80 shadow-xs">
          <div className="inline-grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary shadow-xs">
            <Award className="size-8" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {score} / {quiz.questions.length}
          </p>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            Score: <span className="text-foreground font-bold">{percent}%</span> in{" "}
            {Math.floor(seconds / 60)}m {seconds % 60}s
          </p>
          <Progress value={percent} className="mx-auto mt-4 h-2.5 max-w-sm rounded-full" />
          <p className="mt-3 text-sm font-semibold text-foreground">
            {percent >= 80
              ? "🎉 Outstanding! You've thoroughly mastered this material."
              : percent >= 50
                ? "👍 Good progress. Review the explanations below and try again."
                : "📚 Review time. Study the feedback below to strengthen key areas."}
          </p>
        </div>
      )}

      <ol className="space-y-4">
        {quiz.questions.map((question, index) => {
          const given = answers[index] ?? "";
          const isCorrect = isAnswerCorrect(given, question.answer, question.options);

          return (
            <li key={index} className="surface-card p-5 sm:p-6 border-border/80 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-base text-foreground leading-snug">
                  <span className="text-primary mr-1.5 font-bold">{index + 1}.</span>
                  {question.question}
                </p>
                {submitted && (
                  <Badge
                    variant="secondary"
                    className={
                      isCorrect
                        ? "bg-success/10 text-success border-success/20 shrink-0"
                        : "bg-destructive/10 text-destructive border-destructive/20 shrink-0"
                    }
                  >
                    {isCorrect ? "Correct" : "Missed"}
                  </Badge>
                )}
              </div>

              {question.options.length > 0 ? (
                <div className="mt-4 grid gap-2.5">
                  {question.options.map((option, optIdx) => {
                    const isOptionSelected = given === option;
                    const isAnswerOption = isAnswerCorrect(
                      option,
                      question.answer,
                      question.options,
                    );

                    let optionStyle =
                      "border-border/80 bg-surface hover:border-primary/40 hover:bg-secondary/30 text-foreground";
                    let letterStyle = "bg-secondary text-muted-foreground";

                    if (!submitted) {
                      if (isOptionSelected) {
                        optionStyle =
                          "border-primary bg-primary/10 text-primary ring-1 ring-primary/40 font-medium";
                        letterStyle = "bg-primary text-primary-foreground font-bold";
                      }
                    } else {
                      if (isAnswerOption) {
                        optionStyle =
                          "border-success/60 bg-success/15 text-success ring-1 ring-success/30 font-medium";
                        letterStyle = "bg-success text-success-foreground font-bold";
                      } else if (isOptionSelected && !isCorrect) {
                        optionStyle =
                          "border-destructive/60 bg-destructive/15 text-destructive ring-1 ring-destructive/30 font-medium";
                        letterStyle = "bg-destructive text-destructive-foreground font-bold";
                      } else {
                        optionStyle = "border-border/40 text-muted-foreground/60 opacity-60";
                        letterStyle = "bg-secondary/60 text-muted-foreground/50";
                      }
                    }

                    return (
                      <button
                        key={option}
                        disabled={submitted}
                        onClick={() => setAnswers({ ...answers, [index]: option })}
                        className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition-all duration-150 ${optionStyle}`}
                      >
                        <span
                          className={`grid size-6 shrink-0 place-items-center rounded-lg text-xs font-semibold ${letterStyle}`}
                        >
                          {optionLetters[optIdx] ?? String(optIdx + 1)}
                        </span>
                        <span className="flex-1 leading-snug">{option}</span>
                        {submitted && isAnswerOption && (
                          <Check className="size-4 shrink-0 text-success" />
                        )}
                        {submitted && isOptionSelected && !isCorrect && (
                          <X className="size-4 shrink-0 text-destructive" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Input
                  className="mt-4 rounded-xl"
                  disabled={submitted}
                  value={given}
                  maxLength={200}
                  placeholder="Type your answer here..."
                  onChange={(event) => setAnswers({ ...answers, [index]: event.target.value })}
                />
              )}

              {submitted && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-border/60 bg-secondary/50 p-3.5 text-sm leading-relaxed">
                  {isCorrect ? (
                    <CheckCircle2 className="size-4.5 shrink-0 text-success mt-0.5" />
                  ) : (
                    <XCircle className="size-4.5 shrink-0 text-destructive mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      Correct Answer:{" "}
                      <span className="text-primary font-bold">
                        {(() => {
                          if (question.options.length > 0) {
                            const matchingOpt = question.options.find((opt) =>
                              isAnswerCorrect(opt, question.answer, question.options),
                            );
                            if (matchingOpt) {
                              const optIdx = question.options.indexOf(matchingOpt);
                              const letter = optionLetters[optIdx];
                              return letter ? `${letter}. ${matchingOpt}` : matchingOpt;
                            }
                          }
                          return question.answer;
                        })()}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{question.explanation}</p>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {!submitted && (
        <div className="sticky bottom-4 z-20 rounded-2xl border border-border/80 bg-surface/95 p-3 shadow-lg backdrop-blur space-y-2">
          {answered < quiz.questions.length && (
            <p className="text-center text-xs text-muted-foreground font-medium">
              {quiz.questions.length - answered} question(s) remaining
            </p>
          )}
          <Button className="w-full rounded-xl shadow-xs" size="lg" onClick={submit}>
            Submit all answers
          </Button>
        </div>
      )}
    </div>
  );
}
