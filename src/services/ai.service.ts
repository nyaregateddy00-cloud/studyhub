/**
 * Single entry point for AI features. Routes should import AIService rather
 * than reaching into study-ai.functions.ts directly, so adding a new AI
 * capability (note summarizer, homework help, writing assistant, resource
 * recommendations — all still TODO) has one obvious place to land, and the
 * underlying model/provider (see src/lib/ai/provider.server.ts) can change
 * without touching call sites.
 *
 * generateQuiz, generateFlashcards and generateRevisionPlan are TanStack
 * Start server functions (createServerFn) — re-exporting them here doesn't
 * change how they're called (still `useServerFn(AIService.generateQuiz)`),
 * it just gives every AI call site one import.
 */
export { generateFlashcards, generateQuiz, generateRevisionPlan } from "@/lib/study-ai.functions";

export const AIService = {
  /**
   * Capabilities on the roadmap (spec: Note Summarizer, Homework Help, Exam
   * Preparation, Writing Assistant, Resource Recommendations) are not
   * implemented yet — no server function backs them today. Add each one to
   * study-ai.functions.ts following the generateQuiz/generateFlashcards
   * pattern, then re-export it above, rather than adding a stub here.
   */
  implementedCapabilities: [
    "chat", // routes/api/chat.ts — AI Tutor
    "generateQuiz",
    "generateFlashcards",
    "generateRevisionPlan",
  ] as const,
};
