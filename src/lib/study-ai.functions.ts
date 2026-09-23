import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getActiveProvider } from "./ai/provider.server";

const GenerateInput = z.object({
  source: z.string().trim().max(20000).optional(),
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

function chatModel() {
  return getActiveProvider().chatModel();
}

async function generateStructured<T>({
  schema,
  system,
  prompt,
  schemaJsonExample,
}: {
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  schemaJsonExample: string;
}): Promise<T> {
  const model = chatModel();
  try {
    const { output } = await generateText({
      model,
      output: Output.object({ schema }),
      system,
      prompt,
    });
    return output as T;
  } catch (err) {
    console.warn("[AIService] Output.object parsing failed, falling back to raw JSON format:", err);
    const jsonPrompt = `${prompt}\n\nRespond ONLY with a valid raw JSON object matching this structure:\n${schemaJsonExample}\nDo not include any explanation or markdown code block fences.`;
    const res = await generateText({
      model,
      system: `${system}\nReturn pure, valid JSON strictly matching the requested structure.`,
      prompt: jsonPrompt,
    });
    const cleaned = res.text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Could not parse AI response into the required format.");
    }
    const parsed = JSON.parse(match[0]);
    return schema.parse(parsed);
  }
}

export async function executeQuizGeneration(data: {
  source?: string;
  topic?: string;
  count?: number;
  difficulty?: "easy" | "medium" | "hard";
}) {
  const count = data.count ?? 6;
  const difficulty = data.difficulty ?? "medium";
  const hasSource = Boolean(data.source?.trim());
  const hasTopic = Boolean(data.topic?.trim());

  let prompt = "";
  if (hasSource && hasTopic) {
    prompt = `Create a ${difficulty} quiz of ${count} questions about "${data.topic}" from this study material:\n\n${data.source}`;
  } else if (hasSource) {
    prompt = `Create a ${difficulty} quiz of ${count} questions from this study material:\n\n${data.source}`;
  } else if (hasTopic) {
    prompt = `Create a comprehensive, exam-style ${difficulty} practice quiz of ${count} questions covering the fundamental concepts, key terminology, mechanisms, and real-world examples of: "${data.topic}".`;
  } else {
    throw new Error("Please provide either study material or a topic.");
  }

  const raw = await generateStructured({
    schema: QuizSchema,
    system:
      'You write fair, exam-style study quizzes. Mix multiple choice, true/false and short answer. For mcq give 4 options; for true_false give ["True","False"]; for short give an empty options array. For mcq and true_false, the answer field MUST be the full exact text of one of the options (do not just return "A", "B", "C", or "D").',
    prompt,
    schemaJsonExample:
      '{"title": "string", "questions": [{"type": "mcq", "question": "What is the primary function of mitochondria in a cell?", "options": ["Protein synthesis", "Cellular energy production (ATP)", "DNA storage", "Waste filtration"], "answer": "Cellular energy production (ATP)", "explanation": "Mitochondria generate most of the chemical energy needed by cellular biochemical reactions."}]}',
  });

  const questions = raw.questions.map((q) => {
    if (q.options && q.options.length > 0) {
      const direct = q.options.find(
        (opt) => opt.trim().toLowerCase() === q.answer.trim().toLowerCase(),
      );
      if (direct) return { ...q, answer: direct };

      const letterMatch = q.answer.trim().match(/^[\(\[]?([A-Fa-f])[\)\]\.\:]?\s*(.*)$/);
      if (letterMatch) {
        const letter = letterMatch[1].toUpperCase();
        const idx = letter.charCodeAt(0) - 65;
        if (idx >= 0 && idx < q.options.length) {
          const rest = letterMatch[2].trim();
          if (rest) {
            const restMatch = q.options.find(
              (opt) => opt.trim().toLowerCase() === rest.toLowerCase(),
            );
            if (restMatch) return { ...q, answer: restMatch };
          }
          return { ...q, answer: q.options[idx] };
        }
      }

      const numMatch = q.answer.trim().match(/^[\(\[]?(\d+)[\)\]\.\:]?\s*(.*)$/);
      if (numMatch) {
        const idx = parseInt(numMatch[1], 10) - 1;
        if (idx >= 0 && idx < q.options.length) {
          return { ...q, answer: q.options[idx] };
        }
      }

      const fuzzy = q.options.find(
        (opt) =>
          opt.toLowerCase().includes(q.answer.toLowerCase()) ||
          q.answer.toLowerCase().includes(opt.toLowerCase()),
      );
      if (fuzzy) return { ...q, answer: fuzzy };
    }
    return q;
  });

  return { ...raw, questions };
}

export async function executeFlashcardGeneration(data: {
  source?: string;
  topic?: string;
  count?: number;
  difficulty?: "easy" | "medium" | "hard";
}) {
  const count = data.count ?? 8;
  const hasSource = Boolean(data.source?.trim());
  const hasTopic = Boolean(data.topic?.trim());

  let prompt = "";
  if (hasSource && hasTopic) {
    prompt = `Create ${count} flashcards about "${data.topic}" from this study material:\n\n${data.source}`;
  } else if (hasSource) {
    prompt = `Create ${count} flashcards from this study material:\n\n${data.source}`;
  } else if (hasTopic) {
    prompt = `Create ${count} concise active-recall flashcards covering key definitions, principles, formulas, and concepts about: "${data.topic}".`;
  } else {
    throw new Error("Please provide either study material or a topic/subject.");
  }

  return generateStructured({
    schema: FlashcardSchema,
    system:
      "You write concise active-recall flashcards. Fronts are short prompts or questions; backs are one to three sentences.",
    prompt,
    schemaJsonExample:
      '{"title": "string", "cards": [{"front": "string", "back": "string"}]}',
  });
}

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data }) => {
    return executeQuizGeneration(data);
  });

export const generateFlashcards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data }) => {
    return executeFlashcardGeneration(data);
  });

export const generateRevisionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PlanInput.parse(input))
  .handler(async ({ data }) => {
    return generateStructured({
      schema: PlanSchema,
      system:
        "You are a study coach. Build realistic, spaced revision schedules. day_offset is days from today (0 = today). Keep sessions between 25 and 90 minutes and spread topics using spaced repetition. Return 8-20 tasks.",
      prompt: `Subjects/topics: ${data.subjects}\nExam or deadline: ${
        data.examDate ?? "not specified"
      }\nAvailable hours per week: ${data.hoursPerWeek}\nWeak areas: ${
        data.weaknesses ?? "not specified"
      }`,
      schemaJsonExample:
        '{"title": "string", "summary": "string", "tasks": [{"title": "string", "subject": "string", "day_offset": 0, "duration_minutes": 45, "priority": "medium", "notes": "string"}]}',
    });
  });
