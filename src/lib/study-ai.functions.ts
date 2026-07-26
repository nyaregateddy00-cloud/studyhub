import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

import { CHAT_MODEL, createLovableAiGatewayProvider } from "./ai-gateway.server";

const GenerateInput = z.object({
  source: z.string().trim().min(20).max(20000),
  topic: z.string().trim().max(120).optional(),
  count: z.number().int().min(3).max(15).default(6),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
});

const QuizSchema = z.object({
  title: z.string(),
  questions: z.array(
    z.object({
      type: z.enum(["mcq", "true_false", "short"]),
      question: z.string(),
      options: z.array(z.string()),
      answer: z.string(),
      explanation: z.string(),
    }),
  ),
});

const FlashcardSchema = z.object({
  title: z.string(),
  cards: z.array(z.object({ front: z.string(), back: z.string() })),
});

const PlanInput = z.object({
  subjects: z.string().trim().min(3).max(2000),
  examDate: z.string().trim().max(40).optional(),
  hoursPerWeek: z.number().int().min(1).max(60).default(8),
  weaknesses: z.string().trim().max(2000).optional(),
});

const PlanSchema = z.object({
  title: z.string(),
  summary: z.string(),
  tasks: z.array(
    z.object({
      title: z.string(),
      subject: z.string(),
      day_offset: z.number(),
      duration_minutes: z.number(),
      priority: z.enum(["low", "medium", "high"]),
      notes: z.string(),
    }),
  ),
});

function gateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured");
  return createLovableAiGatewayProvider(key);
}

export const generateQuiz = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data }) => {
    const { output } = await generateText({
      model: gateway()(CHAT_MODEL),
      output: Output.object({ schema: QuizSchema }),
      system:
        "You write fair, exam-style study quizzes. Mix multiple choice, true/false and short answer. For mcq give 4 options; for true_false give [\"True\",\"False\"]; for short give an empty options array. The answer must exactly match one option for mcq and true_false.",
      prompt: `Create a ${data.difficulty} quiz of ${data.count} questions${
        data.topic ? ` about "${data.topic}"` : ""
      } from this study material:\n\n${data.source}`,
    });
    return output;
  });

export const generateFlashcards = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data }) => {
    const { output } = await generateText({
      model: gateway()(CHAT_MODEL),
      output: Output.object({ schema: FlashcardSchema }),
      system:
        "You write concise active-recall flashcards. Fronts are short prompts or questions; backs are one to three sentences.",
      prompt: `Create ${data.count} flashcards${
        data.topic ? ` about "${data.topic}"` : ""
      } from this study material:\n\n${data.source}`,
    });
    return output;
  });