import { supabase } from "@/integrations/supabase/client";
import type { Insert, Row } from "@/services/types";

export type FlashcardDeckRow = Row<"flashcard_decks">;
export type FlashcardRow = Row<"flashcards">;
export type NewDeckInput = Pick<Insert<"flashcard_decks">, "user_id" | "title" | "subject">;
export type NewCardInput = Pick<Insert<"flashcards">, "deck_id" | "user_id" | "front" | "back">;

/** Spaced-repetition intervals, in days, keyed by the grade the learner picks. */
export const SRS_INTERVAL_DAYS: Record<string, number> = {
  easy: 4,
  medium: 2,
  hard: 1,
};

export const FlashcardService = {
  async listDecks() {
    const { data, error } = await supabase
      .from("flashcard_decks")
      .select("id,title,subject,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async createDeck(deck: NewDeckInput) {
    const { data, error } = await supabase
      .from("flashcard_decks")
      .insert(deck)
      .select("id,title")
      .single();
    if (error) throw error;
    return data;
  },

  async removeDeck(deckId: string): Promise<void> {
    const { error } = await supabase.from("flashcard_decks").delete().eq("id", deckId);
    if (error) throw error;
  },

  /** Persists cards built by AIService.generateFlashcards() (or entered manually). */
  async addCards(cards: NewCardInput[]): Promise<void> {
    if (cards.length === 0) return;
    const { error } = await supabase.from("flashcards").insert(cards);
    if (error) throw error;
  },

  async listCards(deckId: string) {
    const { data, error } = await supabase
      .from("flashcards")
      .select("id,front,back,difficulty,review_count")
      .eq("deck_id", deckId)
      .order("next_review_at", { ascending: true });
    if (error) throw error;
    return data;
  },

  async gradeCard(
    cardId: string,
    grade: keyof typeof SRS_INTERVAL_DAYS,
    reviewCount: number,
  ): Promise<void> {
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + (SRS_INTERVAL_DAYS[grade] ?? 2));
    const { error } = await supabase
      .from("flashcards")
      .update({
        difficulty: grade,
        review_count: reviewCount + 1,
        next_review_at: nextReview.toISOString(),
      })
      .eq("id", cardId);
    if (error) throw error;
  },
};
