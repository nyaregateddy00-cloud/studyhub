import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getActiveProvider } from "./ai/provider.server";

const GenerateInput = z.object({
  source: z.string().trim().max(20000).optional(),
  topic: z.string().trim().max(120).optional(),
  count: z.number().int().min(3).max(15).default(6),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
});

const PlanInput = z.object({
  subjects: z.string().trim().min(3).max(2000),
  examDate: z.string().trim().max(40).optional(),
  hoursPerWeek: z.number().int().min(1).max(60).default(8),
  weaknesses: z.string().trim().max(2000).optional(),
});

function chatModel() {
  return getActiveProvider().chatModel();
}

/**
 * Safely converts Python-style or single-quoted JSON strings into valid JSON.
 */
function convertPythonLikeJson(str: string): string {
  let out = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (escaped) {
      out += c;
      escaped = false;
      continue;
    }
    if (c === "\\") {
      escaped = true;
      out += c;
      continue;
    }
    if (c === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      out += c;
    } else if (c === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      out += '"';
    } else if (inSingleQuote && c === '"') {
      out += '\\"';
    } else {
      out += c;
    }
  }

  // Remove trailing commas before } or ]
  return out.replace(/,\s*([}\]])/g, "$1");
}

/**
 * Robustly parses AI responses into JSON, handling:
 * - Markdown fences (```json ... ```)
 * - Single-quoted dictionaries/lists from LLaMA
 * - Multiple newline-separated JSON chunks
 * - Substring matching between outermost brackets/braces
 */
function parseRobustJson<T = unknown>(rawText: string): T {
  const clean = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

  // 1. Direct parse attempt
  try {
    return JSON.parse(clean);
  } catch {}

  // 2. Handle multiple bracketed arrays separated by newlines e.g. [{...}]\n\n[{...}]
  let combined = clean;
  if (/\]\s*[\r\n]+\s*\[/.test(combined)) {
    combined = "[" + combined.replace(/\]\s*[\r\n]+\s*\[/g, ",") + "]";
    combined = combined.replace(/^\[+/, "[").replace(/\]+$/, "]");
  }

  // 3. Convert single quotes and python-like dict syntax
  const converted = convertPythonLikeJson(combined);
  try {
    return JSON.parse(converted);
  } catch {}

  // 4. Try extracting from outermost braces or brackets
  const firstBrace = converted.indexOf("{");
  const firstBracket = converted.indexOf("[");
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    const lastBrace = converted.lastIndexOf("}");
    if (lastBrace > firstBrace) {
      try {
        return JSON.parse(converted.slice(firstBrace, lastBrace + 1));
      } catch {}
    }
  } else if (firstBracket !== -1) {
    const lastBracket = converted.lastIndexOf("]");
    if (lastBracket > firstBracket) {
      try {
        return JSON.parse(converted.slice(firstBracket, lastBracket + 1));
      } catch {}
    }
  }

  throw new Error(`Unable to extract valid JSON from AI response: ${clean.slice(0, 150)}...`);
}

/**
 * Normalizes any parsed JSON into the standard StudyHub quiz structure,
 * guaranteeing all required fields (type, question, options, answer, explanation).
 */
function normalizeQuizOutput(
  parsed: unknown,
  fallbackTopic: string,
): {
  title: string;
  questions: Array<{
    type: "mcq" | "true_false" | "short";
    question: string;
    options: string[];
    answer: string;
    explanation: string;
  }>;
} {
  const obj = (typeof parsed === "object" && parsed !== null ? parsed : {}) as Record<string, unknown>;
  const title =
    typeof obj.title === "string" && obj.title.trim()
      ? obj.title.trim()
      : `${fallbackTopic || "Revision"} Practice Quiz`;

  let rawList: unknown[] = [];
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (Array.isArray(obj.questions)) {
    rawList = obj.questions;
  } else if (Array.isArray(obj.quiz)) {
    rawList = obj.quiz;
  } else if (Array.isArray(obj.items)) {
    rawList = obj.items;
  } else {
    const values = Object.values(obj);
    const arr = values.find(Array.isArray);
    if (arr) rawList = arr as unknown[];
  }

  const questions = rawList.map((rawItem, index) => {
    const item = (typeof rawItem === "object" && rawItem !== null ? rawItem : {}) as Record<string, unknown>;

    // 1. Resolve question text
    const questionText =
      String(item.question ?? item.text ?? item.prompt ?? item.questionText ?? item.q ?? `Question ${index + 1}`).trim();

    // 2. Resolve question type
    let type: "mcq" | "true_false" | "short" = "mcq";
    const rawType = String(item.type ?? "").toLowerCase();
    if (rawType.includes("true") || rawType.includes("false") || rawType.includes("bool")) {
      type = "true_false";
    } else if (rawType.includes("short") || rawType.includes("open") || rawType.includes("free")) {
      type = "short";
    } else if (rawType.includes("mcq") || rawType.includes("multi")) {
      type = "mcq";
    } else if (
      Array.isArray(item.options) &&
      item.options.length === 2 &&
      item.options.some((o) => String(o).toLowerCase() === "true")
    ) {
      type = "true_false";
    } else if (!item.options || (Array.isArray(item.options) && item.options.length === 0)) {
      type = "short";
    }

    // 3. Resolve options
    let options: string[] = [];
    if (type === "true_false") {
      options = ["True", "False"];
    } else if (type === "short") {
      options = [];
    } else {
      if (Array.isArray(item.options)) {
        options = item.options.map(String).filter((o) => o.trim().length > 0);
      }
      if (options.length === 0 && item.answer) {
        options = [String(item.answer), "None of the above"];
      }
    }

    // 4. Resolve answer
    let answer = String(item.answer ?? "").trim();
    if (type === "true_false") {
      const lower = answer.toLowerCase();
      answer = lower.includes("false") ? "False" : "True";
    } else if (type === "mcq") {
      if (!options.includes(answer)) {
        const letterMatch = answer.match(/^[A-Da-d][\.\)]?$/);
        if (letterMatch && options.length > 0) {
          const idx = letterMatch[0][0].toUpperCase().charCodeAt(0) - 65;
          if (idx >= 0 && idx < options.length) {
            answer = options[idx];
          }
        }
      }
      if (!answer && options.length > 0) {
        answer = options[0];
      }
    } else if (type === "short" && !answer) {
      answer = String(item.explanation ?? "Key concepts covered in course materials.");
    }

    // 5. Resolve explanation
    const explanation =
      String(item.explanation ?? "").trim() ||
      (answer ? `The correct answer is: ${answer}.` : "Review study materials for detailed context.");

    return {
      type,
      question: questionText || `Question ${index + 1}`,
      options,
      answer,
      explanation,
    };
  });

  return { title, questions };
}

/**
 * Normalizes any parsed JSON into standard StudyHub flashcard items.
 */
function normalizeFlashcardsOutput(
  parsed: unknown,
  fallbackTopic: string,
): {
  title: string;
  cards: Array<{ front: string; back: string }>;
} {
  const obj = (typeof parsed === "object" && parsed !== null ? parsed : {}) as Record<string, unknown>;
  const title =
    typeof obj.title === "string" && obj.title.trim()
      ? obj.title.trim()
      : `${fallbackTopic || "Revision"} Flashcards`;

  let rawList: unknown[] = [];
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (Array.isArray(obj.cards)) {
    rawList = obj.cards;
  } else if (Array.isArray(obj.flashcards)) {
    rawList = obj.flashcards;
  } else {
    const values = Object.values(obj);
    const arr = values.find(Array.isArray);
    if (arr) rawList = arr as unknown[];
  }

  const cards = rawList
    .map((rawCard, i) => {
      const card = (typeof rawCard === "object" && rawCard !== null ? rawCard : {}) as Record<string, unknown>;
      const front = String(card.front ?? card.question ?? card.prompt ?? card.term ?? `Concept ${i + 1}`).trim();
      const back = String(card.back ?? card.answer ?? card.definition ?? card.explanation ?? "Review study material").trim();
      return { front, back };
    })
    .filter((c) => c.front.length > 0 && c.back.length > 0);

  return { title, cards };
}

/**
 * Normalizes any parsed JSON into standard StudyHub revision plan tasks.
 */
function normalizePlanOutput(
  parsed: unknown,
  subjects: string,
): {
  title: string;
  summary: string;
  tasks: Array<{
    title: string;
    subject: string;
    day_offset: number;
    duration_minutes: number;
    priority: "low" | "medium" | "high";
    notes: string;
  }>;
} {
  const obj = (typeof parsed === "object" && parsed !== null ? parsed : {}) as Record<string, unknown>;
  const title = typeof obj.title === "string" && obj.title.trim() ? obj.title.trim() : "Custom Revision Plan";
  const summary = typeof obj.summary === "string" && obj.summary.trim() ? obj.summary.trim() : "Spaced study schedule";

  let rawList: unknown[] = [];
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (Array.isArray(obj.tasks)) {
    rawList = obj.tasks;
  }

  const defaultSubject = subjects.split(",")[0]?.trim() || "Core Studies";
  const tasks = rawList.map((rawTask, idx) => {
    const task = (typeof rawTask === "object" && rawTask !== null ? rawTask : {}) as Record<string, unknown>;
    const rawPriority = String(task.priority ?? "medium").toLowerCase();
    const priority: "low" | "medium" | "high" =
      rawPriority.includes("high") ? "high" : rawPriority.includes("low") ? "low" : "medium";

    return {
      title: String(task.title ?? `Study Session ${idx + 1}`).trim(),
      subject: String(task.subject ?? defaultSubject).trim(),
      day_offset: typeof task.day_offset === "number" ? task.day_offset : idx,
      duration_minutes: typeof task.duration_minutes === "number" ? task.duration_minutes : 45,
      priority,
      notes: String(task.notes ?? "Focus on active recall and practice problems.").trim(),
    };
  });

  return { title, summary, tasks };
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
  const fallbackTopic = (data.topic || "Course Material").trim();

  let userPrompt = "";
  if (hasSource && hasTopic) {
    userPrompt = `Generate a ${difficulty} difficulty quiz of ${count} questions about "${data.topic}" using this material:\n\n${data.source}`;
  } else if (hasSource) {
    userPrompt = `Generate a ${difficulty} difficulty quiz of ${count} questions using this study material:\n\n${data.source}`;
  } else if (hasTopic) {
    userPrompt = `Generate an exam-style ${difficulty} practice quiz of ${count} questions testing key definitions, core concepts, and applied problems for: "${data.topic}".`;
  } else {
    throw new Error("Please provide either study material or a topic.");
  }

  const systemPrompt = `You are StudyHub's expert exam quiz generator.
You MUST output a single valid JSON object strictly matching this schema.
Do NOT use single quotes. All keys and string values MUST use double quotes.
Do NOT include any markdown fences or explanatory text.

Required JSON Structure:
{
  "title": "${fallbackTopic} Practice Quiz",
  "questions": [
    {
      "type": "mcq",
      "question": "Clear question text?",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "answer": "Option 1",
      "explanation": "Why this answer is correct."
    },
    {
      "type": "true_false",
      "question": "Clear statement to evaluate?",
      "options": ["True", "False"],
      "answer": "True",
      "explanation": "Why this statement is true or false."
    },
    {
      "type": "short",
      "question": "Short answer question prompt?",
      "options": [],
      "answer": "Key concept or model answer",
      "explanation": "Detailed explanation of the concept."
    }
  ]
}

Mix multiple choice (mcq), true/false (true_false), and short answer (short).
For mcq and true_false, the answer MUST be the exact full text of one of the options.`;

  const model = chatModel();

  // Try generation with 1 retry
  let rawText = "";
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await generateText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.3,
      });
      rawText = res.text;
      if (rawText.trim()) break;
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  if (!rawText.trim()) {
    throw new Error(
      lastError instanceof Error
        ? `AI service error: ${lastError.message}`
        : "Failed to receive quiz response from AI.",
    );
  }

  try {
    const parsed = parseRobustJson(rawText);
    const normalized = normalizeQuizOutput(parsed, fallbackTopic);
    if (normalized.questions.length === 0) {
      throw new Error("No questions were generated.");
    }
    return normalized;
  } catch (parseErr) {
    console.error("[QuizGeneration Parse Error]:", parseErr, "Raw output:", rawText);
    throw new Error("AI returned an unreadable response format. Please try again.");
  }
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
  const fallbackTopic = (data.topic || "Course Material").trim();

  let userPrompt = "";
  if (hasSource && hasTopic) {
    userPrompt = `Create ${count} flashcards about "${data.topic}" from this study material:\n\n${data.source}`;
  } else if (hasSource) {
    userPrompt = `Create ${count} flashcards from this study material:\n\n${data.source}`;
  } else if (hasTopic) {
    userPrompt = `Create ${count} concise active-recall flashcards covering key definitions, principles, and formulas for: "${data.topic}".`;
  } else {
    throw new Error("Please provide either study material or a topic/subject.");
  }

  const systemPrompt = `You are StudyHub's active-recall flashcard creator.
You MUST output a single valid JSON object strictly matching this schema.
Do NOT use single quotes. All keys and strings MUST use double quotes.
Do NOT include any markdown fences or explanatory text.

Required JSON Structure:
{
  "title": "${fallbackTopic} Flashcards",
  "cards": [
    {
      "front": "Term, question, or concept prompt",
      "back": "Clear, concise 1-3 sentence definition or explanation"
    }
  ]
}`;

  const model = chatModel();

  let rawText = "";
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await generateText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.3,
      });
      rawText = res.text;
      if (rawText.trim()) break;
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  if (!rawText.trim()) {
    throw new Error(
      lastError instanceof Error
        ? `AI service error: ${lastError.message}`
        : "Failed to receive flashcards response from AI.",
    );
  }

  try {
    const parsed = parseRobustJson(rawText);
    const normalized = normalizeFlashcardsOutput(parsed, fallbackTopic);
    if (normalized.cards.length === 0) {
      throw new Error("No flashcards were generated.");
    }
    return normalized;
  } catch (parseErr) {
    console.error("[FlashcardGeneration Parse Error]:", parseErr, "Raw output:", rawText);
    throw new Error("AI returned an unreadable response format. Please try again.");
  }
}

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data }) => {
    return executeQuizGeneration(data);
  });

export const generateFlashcards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data }) => {
    return executeFlashcardGeneration(data);
  });

export const generateRevisionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => PlanInput.parse(input))
  .handler(async ({ data }) => {
    const system = `You are a study coach. Build realistic, spaced revision schedules.
You MUST output a single valid JSON object strictly matching this schema with double quotes:
{
  "title": "Revision Schedule",
  "summary": "Summary of plan",
  "tasks": [
    {
      "title": "Session title",
      "subject": "Subject name",
      "day_offset": 0,
      "duration_minutes": 45,
      "priority": "medium",
      "notes": "Actionable focus note"
    }
  ]
}`;
    const prompt = `Subjects/topics: ${data.subjects}\nExam or deadline: ${
      data.examDate ?? "not specified"
    }\nAvailable hours per week: ${data.hoursPerWeek}\nWeak areas: ${
      data.weaknesses ?? "not specified"
    }`;

    const model = chatModel();
    const res = await generateText({
      model,
      system,
      prompt,
      temperature: 0.3,
    });

    const parsed = parseRobustJson(res.text);
    return normalizePlanOutput(parsed, data.subjects);
  });
