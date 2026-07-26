import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Layers, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { generateFlashcards } from "@/lib/study-ai.functions";

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

const INTERVALS: Record<string, number> = { easy: 4, medium: 2, hard: 1 };

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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flashcard_decks")
        .select("id,title,subject,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const result = await createCards({
        data: { source, topic: subject || undefined, count: 8, difficulty: "medium" },
      });
      const { data: deck, error } = await supabase
        .from("flashcard_decks")
        .insert({ user_id: user!.id, title: result.title, subject: subject || null })
        .select("id,title")
        .single();
      if (error) throw error;
      const { error: cardsError } = await supabase.from("flashcards").insert(
        result.cards.map((card) => ({
          deck_id: deck.id,
          user_id: user!.id,
          front: card.front,
          back: card.back,
        })),
      );
      if (cardsError) throw cardsError;
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
      <div>
        <h1 className="text-2xl font-bold">Flashcards</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Turn any material into a deck, then grade each card so the hard ones come back sooner.
        </p>
      </div>

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

function DeckReview({
  deck,
  onExit,
}: {
  deck: { id: string; title: string };
  onExit: () => void;
}) {
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const cardsQuery = useQuery({
    queryKey: ["cards", deck.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flashcards")
        .select("id,front,back,difficulty,review_count")
        .eq("deck_id", deck.id)
        .order("next_review_at", { ascending: true });
      if (error) throw error;
      return data as Card[];
    },
  });

  const grade = useMutation({
    mutationFn: async ({ card, difficulty }: { card: Card; difficulty: string }) => {
      const next = new Date();
      next.setDate(next.getDate() + INTERVALS[difficulty]);
      const { error } = await supabase
        .from("flashcards")
        .update({
          difficulty,
          review_count: card.review_count + 1,
          next_review_at: next.toISOString(),
        })
        .eq("id", card.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cards", deck.id] }),
    onError: () => toast.error("Couldn't save that review."),
  });

  const cards = cardsQuery.data ?? [];
  const card = cards[index];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{deck.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {cards.length ? `Card ${index + 1} of ${cards.length}` : "Loading cards"}
          </p>
        </div>
        <Button variant="outline" onClick={onExit}>
          Back
        </Button>
      </div>

      {cardsQuery.isLoading || !card ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <button
            onClick={() => setFlipped((value) => !value)}
            className="surface-card flex min-h-64 w-full items-center justify-center p-8 text-center transition-transform duration-200 hover:scale-[1.01]"
            style={{ transform: flipped ? "rotateX(0deg)" : undefined }}
          >
            <span className="text-lg">
              {flipped ? card.back : card.front}
              <span className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <RotateCcw className="size-3" />
                {flipped ? "Showing answer" : "Tap to reveal"}
              </span>
            </span>
          </button>

          <div className="grid grid-cols-3 gap-2">
            {(["hard", "medium", "easy"] as const).map((difficulty) => (
              <Button
                key={difficulty}
                variant="outline"
                className="capitalize"
                onClick={() => {
                  grade.mutate({ card, difficulty });
                  setFlipped(false);
                  setIndex((value) => (value + 1) % cards.length);
                }}
              >
                {difficulty}
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}