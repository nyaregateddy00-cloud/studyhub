import { supabase } from "@/integrations/supabase/client";
import type { Insert, Row } from "@/services/types";

const QUIZ_COLUMNS = "id,title,topic,questions,created_at";

export type QuizRow = Row<"quizzes">;
export type NewQuizInput = Pick<
  Insert<"quizzes">,
  "user_id" | "title" | "topic" | "difficulty" | "questions"
>;
export type QuizAttemptInput = Pick<
  Insert<"quiz_attempts">,
  "quiz_id" | "user_id" | "score" | "total" | "seconds_taken" | "answers"
>;

export const QuizService = {
  async list() {
    const { data, error } = await supabase
      .from("quizzes")
      .select(QUIZ_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  /** Persists a quiz built by AIService.generateQuiz(). */
  async create(input: NewQuizInput) {
    const { data, error } = await supabase
      .from("quizzes")
      .insert(input)
      .select("id,title,questions")
      .single();
    if (error) throw error;
    return data;
  },

  async remove(quizId: string): Promise<void> {
    const { error } = await supabase.from("quizzes").delete().eq("id", quizId);
    if (error) throw error;
  },

  async submitAttempt(input: QuizAttemptInput): Promise<void> {
    const { error } = await supabase.from("quiz_attempts").insert(input);
    if (error) throw error;
  },

  async listAttempts(userId: string) {
    const { data, error } = await supabase
      .from("quiz_attempts")
      .select("id,quiz_id,score,total,seconds_taken,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};
