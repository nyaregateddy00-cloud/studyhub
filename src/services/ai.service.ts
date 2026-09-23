import { supabase } from "@/integrations/supabase/client";

export { generateFlashcards, generateQuiz, generateRevisionPlan } from "@/lib/study-ai.functions";

export async function generateQuizAPI(input: {
  source?: string;
  topic?: string;
  count?: number;
  difficulty?: string;
}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch("/api/quiz", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || json.message || "Failed to generate quiz.");
  }
  return json as {
    title: string;
    questions: Array<{
      type: "mcq" | "true_false" | "short";
      question: string;
      options: string[];
      answer: string;
      explanation: string;
    }>;
  };
}

export async function generateFlashcardsAPI(input: {
  source?: string;
  topic?: string;
  count?: number;
}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch("/api/flashcards", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || json.message || "Failed to generate flashcards.");
  }
  return json as {
    title: string;
    cards: Array<{ front: string; back: string }>;
  };
}

export const AIService = {
  generateQuiz: generateQuizAPI,
  generateFlashcards: generateFlashcardsAPI,
  implementedCapabilities: [
    "chat", // routes/api/chat.ts — AI Tutor
    "generateQuiz",
    "generateFlashcards",
    "generateRevisionPlan",
  ] as const,
};
