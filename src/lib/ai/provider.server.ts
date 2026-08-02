import { CHAT_MODEL, createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

/**
 * Every AI call in the app (chat, quiz/flashcard/plan generation) should get
 * its model from getActiveProvider() rather than constructing a gateway
 * directly. Today only "lovable-gateway" is wired up (it's what the app
 * already used, routed to Gemini). Adding OpenAI or Anthropic later means:
 *   1. `npm install @ai-sdk/openai` (or `@ai-sdk/anthropic`)
 *   2. Uncomment + fill in the provider below
 *   3. Set AI_PROVIDER=openai (or anthropic) in the environment
 * No call site (study-ai.functions.ts, routes/api/chat.ts) needs to change.
 */

export type AIProviderId = "lovable-gateway" | "openai" | "anthropic";

type Gateway = ReturnType<typeof createLovableAiGatewayProvider>;
type ChatModel = ReturnType<Gateway>;

export type AIModelProvider = {
  id: AIProviderId;
  /** Returns an `ai` SDK LanguageModel, ready to pass to generateText/streamText. */
  chatModel: () => ChatModel;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`AI is not configured (missing ${name})`);
  return value;
}

const lovableGatewayProvider: AIModelProvider = {
  id: "lovable-gateway",
  chatModel: () => createLovableAiGatewayProvider(requireEnv("LOVABLE_API_KEY"))(CHAT_MODEL),
};

// --- Extension points (not active — packages not installed, no API key set) ---
//
// import { createOpenAI } from "@ai-sdk/openai";
// const openaiProvider: AIModelProvider = {
//   id: "openai",
//   chatModel: () => createOpenAI({ apiKey: requireEnv("OPENAI_API_KEY") })("gpt-4o"),
// };
//
// import { createAnthropic } from "@ai-sdk/anthropic";
// const anthropicProvider: AIModelProvider = {
//   id: "anthropic",
//   chatModel: () =>
//     createAnthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") })("claude-sonnet-4-5"),
// };

const PROVIDERS: Partial<Record<AIProviderId, AIModelProvider>> = {
  "lovable-gateway": lovableGatewayProvider,
  // openai: openaiProvider,
  // anthropic: anthropicProvider,
};

/** Reads AI_PROVIDER from the environment; falls back to the Lovable gateway. */
export function getActiveProvider(): AIModelProvider {
  const requested = process.env.AI_PROVIDER as AIProviderId | undefined;
  return (requested && PROVIDERS[requested]) || lovableGatewayProvider;
}
