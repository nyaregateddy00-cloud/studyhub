import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Layers, PartyPopper, RotateCcw, Shuffle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { generateFlashcards } from "@/services/ai.service";
import { FlashcardService, SRS_INTERVAL_DAYS } from "@/services/flashcard.service";

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
  const createCards = useServerFn(generateFlashcards);
  const [subject, setSubject] = useState("");
  const [source, setSource] = useState("");
  const [activeDeck, setActiveDeck] = useState<{ id: string; title: string } | null>(null);

  const decksQuery = useQuery({
    queryKey: ["decks", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => FlashcardService.listDecks(),
  });

  const generate = useMutation({
    mutationFn: async () => {
      const result = await createCards({
        data: { source, topic: subject || undefined, count: 8, difficulty: "medium" },
      });
      const deck = await FlashcardService.createDeck({
        user_id: user!.id,
        title: result.title,
        subject: subject || null,
      });
      await FlashcardService.addCards(
        result.cards.map((card) => ({
          deck_id: deck.id,
          user_id: user!.id,
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
    onError: () => toast.error("Couldn't build that deck. Try shorter material."),
  });

  if (activeDeck) {
    return <DeckReview deck={activeDeck} onExit={() => setActiveDeck(null)} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flashcards"
        description="Turn any material into a deck, then grade each card so the hard ones come back sooner."
      />

      <form
        className="surface-card space-y-4 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          generate.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="subject">Subject (optional)</Label>
          <Input
            id="subject"
            value={subject}
            maxLength={120}
            onChange={(event) => setSubject(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deck-source">Study material</Label>
          <Textarea
            id="deck-source"
            rows={6}
            maxLength={20000}
            required
            placeholder="Paste your notes here."
            value={source}
            onChange={(event) => setSource(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={generate.isPending || source.trim().length < 20}>
          {generate.isPending ? "Building deck..." : "Create deck"}
        </Button>
      </form>

      {decksQuery.isLoading ? (
        <Skeleton className="h-24" />
      ) : (decksQuery.data ?? []).length === 0 ? (
        <div className="surface-card p-10 text-center">
          <Layers className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No decks yet.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(decksQuery.data ?? []).map((deck) => (
            <button
              key={deck.id}
              className="surface-card lift p-5 text-left"
              onClick={() => setActiveDeck({ id: deck.id, title: deck.title })}
            >
              <p className="font-semibold">{deck.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{deck.subject ?? "General"}</p>
            </button>
          ))}
        </div>
      )}
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
      <PageHeader
        title={deck.title}
        description={
          cards.length
            ? `Card ${index + 1} of ${cards.length} · ${graded.size} reviewed`
            : "Loading cards"
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={shuffle} disabled={cards.length < 2}>
              <Shuffle className="size-4" />
              <span className="hidden sm:inline">Shuffle</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onExit}>
              Back
            </Button>
          </>
        }
      />

      {cards.length > 0 && <Progress value={(graded.size / cards.length) * 100} className="h-2" />}

      {cardsQuery.isLoading || !card ? (
        <Skeleton className="h-64" />
      ) : done ? (
        <div className="surface-card p-12 text-center">
          <PartyPopper className="mx-auto size-8 text-success" />
          <p className="mt-3 font-display text-lg font-semibold">Session complete</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You reviewed all {cards.length} cards in this deck.
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              setGraded(new Set());
              setIndex(0);
              setFlipped(false);
            }}
          >
            <RotateCcw className="size-4" />
            Review again
          </Button>
        </div>
      ) : (
        <>
          <div className="[perspective:1600px]">
            <button
              onClick={() => setFlipped((value) => !value)}
              aria-label={flipped ? "Show question" : "Reveal answer"}
              className="relative min-h-64 w-full transition-transform duration-500 [transform-style:preserve-3d]"
              style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
            >
              <span className="surface-card absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center [backface-visibility:hidden]">
                <span className="text-lg font-medium">{card.front}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RotateCcw className="size-3" /> Tap or press Space to reveal
                </span>
              </span>
              <span className="surface-card absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <span className="text-lg">{card.back}</span>
                <span className="text-xs text-muted-foreground">Grade how well you knew it</span>
              </span>
              <span className="invisible block min-h-64 p-8 text-lg">{card.back}</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFlipped(false);
                setIndex((value) => (value - 1 + cards.length) % cards.length);
              }}
            >
              <ChevronLeft className="size-4" /> Previous
            </Button>
            <span className="text-xs text-muted-foreground">← → to navigate</span>
            <Button variant="ghost" size="sm" onClick={advance}>
              Skip <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(["hard", "medium", "easy"] as const).map((difficulty) => (
              <Button
                key={difficulty}
                variant="outline"
                className="capitalize"
                onClick={() => {
                  grade.mutate({ card, difficulty });
                  setGraded((value) => new Set(value).add(card.id));
                  advance();
                }}
              >
                {difficulty}
                <span className="ml-1 text-xs text-muted-foreground">
                  {SRS_INTERVAL_DAYS[difficulty]}d
                </span>
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
