import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers,
  PartyPopper,
  RotateCcw,
  Shuffle,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/dashboard/primitives";
import { useAuth } from "@/lib/auth";
import { generateFlashcardsAPI } from "@/services/ai.service";
import { FlashcardService, SRS_INTERVAL_DAYS } from "@/services/flashcard.service";
import { NotesService } from "@/services/notes.service";

export const Route = createFileRoute("/_app/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards — StudyHub" },
      {
        name: "description",
        content: "Build AI flashcard decks from your notes and drill them with spaced repetition.",
      },
      { property: "og:title", content: "Flashcards — StudyHub" },
      { property: "og:description", content: "AI flashcard decks with spaced repetition review." },
    ],
  }),
  component: FlashcardsPage,
});

type Card = { id: string; front: string; back: string; difficulty: string; review_count: number };

function FlashcardsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [source, setSource] = useState("");
  const [activeDeck, setActiveDeck] = useState<{ id: string; title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [notesPickerOpen, setNotesPickerOpen] = useState(false);

  const notesQuery = useQuery({
    queryKey: ["notes-for-deck", user?.id],
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
          `Extracted flashcard material from ${file.name} (${extracted.totalPages} pages)`,
          { id: toastId }
        );
      } else {
        content = await file.text();
        toast.success(`Loaded ${file.name}`, { id: toastId });
      }

      const trimmed = content.slice(0, 20000);
      setSource(trimmed);
      setLoadedFileName(file.name);
      if (!subject.trim()) {
        const autoSubject = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]/g, " ")
          .trim();
        setSubject(autoSubject.slice(0, 120));
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to extract text from file.";
      toast.error(message, { id: toastId });
    } finally {
      setExtracting(false);
    }
  }

  const decksQuery = useQuery({
    queryKey: ["decks", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => FlashcardService.listDecks(),
  });

  const generate = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("Please sign in to generate and save flashcard decks.");
      }
      if (!source.trim() && !subject.trim()) {
        throw new Error("Please enter a subject or paste study material.");
      }
      const result = await generateFlashcardsAPI({
        source: source.trim() || undefined,
        topic: subject.trim() || undefined,
        count: 8,
      });
      const deck = await FlashcardService.createDeck({
        user_id: user.id,
        title: result.title,
        subject: subject || null,
      });
      await FlashcardService.addCards(
        result.cards.map((card) => ({
          deck_id: deck.id,
          user_id: user.id,
          front: card.front,
          back: card.back,
        })),
      );
      return deck;
    },
    onSuccess: (deck) => {
      toast.success("Deck created");
      setSource("");
      queryClient.invalidateQueries({ queryKey: ["decks"] });
      setActiveDeck(deck);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: unknown }).message)
            : "Couldn't build that deck. Please try again.";
      toast.error(message);
    },
  });

  if (activeDeck) {
    return <DeckReview deck={activeDeck} onExit={() => setActiveDeck(null)} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flashcards"
        description="Turn any material into a deck, then grade each card so the hard ones come back sooner."
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
          if (!source.trim() && !subject.trim()) {
            toast.error("Please enter a subject or paste study material to generate flashcards.");
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

        <div className="space-y-1.5">
          <Label htmlFor="subject">Subject or course (optional)</Label>
          <Input
            id="subject"
            value={subject}
            maxLength={120}
            placeholder="e.g. Organic Chemistry, Macroeconomics"
            onChange={(event) => setSubject(event.target.value)}
            className="rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="deck-source" className="text-sm font-medium">
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
              id="deck-source"
              rows={5}
              maxLength={20000}
              placeholder="Paste your lecture notes, key definitions, or formulas here (or enter a Subject above), or click 'Upload file'."
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
              Building flashcard deck...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-4" />
              Generate flashcard deck with AI
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
                      setSubject(note.title.slice(0, 120));
                      setLoadedFileName(`Note: ${note.title}`);
                      setNotesPickerOpen(false);
                      toast.success(`Loaded "${note.title}" into deck material`);
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
        <h2 className="font-display text-lg font-semibold tracking-tight">Your flashcard decks</h2>
        {decksQuery.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        ) : (decksQuery.data ?? []).length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No decks yet"
            description="Paste your lecture notes or upload a PDF chapter above to automatically generate a smart flashcard deck with active recall."
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(decksQuery.data ?? []).map((deck) => (
              <button
                key={deck.id}
                className="surface-card card-interactive flex flex-col p-5 text-left group border-border/80"
                onClick={() => setActiveDeck({ id: deck.id, title: deck.title })}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display font-semibold text-base tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {deck.title}
                  </p>
                  <span className="inline-flex items-center rounded-lg border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary shrink-0">
                    <BookOpen className="mr-1 size-3" />
                    {deck.subject ?? "General"}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border/70 pt-3">
                  <span className="font-medium">Active recall deck</span>
                  <span className="font-semibold text-primary flex items-center gap-1 group-hover:underline">
                    Drill deck <ChevronRight className="size-3.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DeckReview({ deck, onExit }: { deck: { id: string; title: string }; onExit: () => void }) {
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [order, setOrder] = useState<string[] | null>(null);
  const [graded, setGraded] = useState<Set<string>>(new Set());

  const cardsQuery = useQuery({
    queryKey: ["cards", deck.id],
    queryFn: () => FlashcardService.listCards(deck.id) as Promise<Card[]>,
  });

  const grade = useMutation({
    mutationFn: ({ card, difficulty }: { card: Card; difficulty: string }) =>
      FlashcardService.gradeCard(
        card.id,
        difficulty as keyof typeof SRS_INTERVAL_DAYS,
        card.review_count,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cards", deck.id] }),
    onError: () => toast.error("Couldn't save that review."),
  });

  const cards = useMemo(() => {
    const list = cardsQuery.data ?? [];
    if (!order) return list;
    return [...list].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  }, [cardsQuery.data, order]);
  const card = cards[index];
  const done = cards.length > 0 && graded.size >= cards.length;

  const advance = useCallback(() => {
    setFlipped(false);
    setIndex((value) => (cards.length ? (value + 1) % cards.length : 0));
  }, [cards.length]);

  function shuffle() {
    const ids = (cardsQuery.data ?? []).map((item) => item.id);
    for (let i = ids.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    setOrder(ids);
    setIndex(0);
    setFlipped(false);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return;
      if (event.code === "Space") {
        event.preventDefault();
        setFlipped((value) => !value);
      }
      if (event.key === "ArrowRight") advance();
      if (event.key === "ArrowLeft") {
        setFlipped(false);
        setIndex((value) => (cards.length ? (value - 1 + cards.length) % cards.length : 0));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cards.length, advance]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {deck.title}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground font-medium">
            {cards.length ? (
              <>
                Card <span className="text-foreground font-semibold">{index + 1}</span> of{" "}
                <span className="text-foreground font-semibold">{cards.length}</span> ·{" "}
                <span className="text-primary font-semibold">{graded.size}</span> reviewed
              </>
            ) : (
              "Loading cards..."
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={shuffle} disabled={cards.length < 2}>
            <Shuffle className="size-4 mr-1.5" />
            Shuffle
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={onExit}>
            Back to decks
          </Button>
        </div>
      </div>

      {cards.length > 0 && (
        <Progress value={(graded.size / cards.length) * 100} className="h-2 rounded-full" />
      )}

      {cardsQuery.isLoading || !card ? (
        <Skeleton className="h-72 rounded-3xl" />
      ) : done ? (
        <div className="surface-card p-10 sm:p-12 text-center border-border/80 shadow-xs">
          <div className="inline-grid size-16 place-items-center rounded-2xl bg-success/15 text-success shadow-xs">
            <PartyPopper className="size-8" />
          </div>
          <p className="mt-4 font-display text-2xl font-bold text-foreground sm:text-3xl">
            Session complete!
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground font-medium max-w-sm mx-auto">
            You've reviewed all {cards.length} cards in this deck. Spaced repetition scheduled your next review.
          </p>
          <Button
            className="mt-6 rounded-xl shadow-xs"
            onClick={() => {
              setGraded(new Set());
              setIndex(0);
              setFlipped(false);
            }}
          >
            <RotateCcw className="mr-1.5 size-4" />
            Review again
          </Button>
        </div>
      ) : (
        <>
          <div className="[perspective:1600px] cursor-pointer" onClick={() => setFlipped((v) => !v)}>
            <div
              className="relative min-h-72 w-full transition-transform duration-500 [transform-style:preserve-3d]"
              style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
            >
              {/* Front side */}
              <div className="surface-card absolute inset-0 flex flex-col items-center justify-between p-8 text-center [backface-visibility:hidden] rounded-3xl border-border/80 shadow-sm hover:border-primary/40 transition-colors">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Question
                </span>
                <p className="text-xl font-medium tracking-tight text-foreground sm:text-2xl max-w-xl">
                  {card.front}
                </p>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <RotateCcw className="size-3.5 text-primary" /> Tap card or press Space to reveal answer
                </span>
              </div>

              {/* Back side */}
              <div className="surface-card absolute inset-0 flex flex-col items-center justify-between p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-3xl border-border/80 shadow-sm bg-secondary/30">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Answer
                </span>
                <p className="text-xl tracking-tight text-foreground sm:text-2xl max-w-xl leading-relaxed">
                  {card.back}
                </p>
                <span className="text-xs text-muted-foreground font-medium">
                  Grade how well you remembered below
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 px-1">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-xs"
              onClick={() => {
                setFlipped(false);
                setIndex((value) => (value - 1 + cards.length) % cards.length);
              }}
            >
              <ChevronLeft className="mr-1 size-4" /> Previous
            </Button>
            <span className="text-xs text-muted-foreground font-medium">
              Space to flip · ← → to navigate
            </span>
            <Button variant="ghost" size="sm" className="rounded-xl text-xs" onClick={advance}>
              Skip <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="rounded-2xl h-12 flex-col gap-0.5 border-destructive/30 hover:border-destructive/60 hover:bg-destructive/10 text-destructive font-semibold"
              onClick={() => {
                grade.mutate({ card, difficulty: "hard" });
                setGraded((value) => new Set(value).add(card.id));
                advance();
              }}
            >
              <span>Hard</span>
              <span className="text-[10px] text-destructive/80 font-normal">
                review in {SRS_INTERVAL_DAYS.hard}d
              </span>
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl h-12 flex-col gap-0.5 border-warning/30 hover:border-warning/60 hover:bg-warning/10 text-warning font-semibold"
              onClick={() => {
                grade.mutate({ card, difficulty: "medium" });
                setGraded((value) => new Set(value).add(card.id));
                advance();
              }}
            >
              <span>Medium</span>
              <span className="text-[10px] text-warning/80 font-normal">
                review in {SRS_INTERVAL_DAYS.medium}d
              </span>
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl h-12 flex-col gap-0.5 border-success/30 hover:border-success/60 hover:bg-success/10 text-success font-semibold"
              onClick={() => {
                grade.mutate({ card, difficulty: "easy" });
                setGraded((value) => new Set(value).add(card.id));
                advance();
              }}
            >
              <span>Easy</span>
              <span className="text-[10px] text-success/80 font-normal">
                review in {SRS_INTERVAL_DAYS.easy}d
              </span>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
