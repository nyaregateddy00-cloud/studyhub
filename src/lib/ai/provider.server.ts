import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import { CHAT_MODEL, createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

/**
 * Every AI call in the app (chat, quiz/flashcard/plan generation) gets
 * its model from getActiveProvider().
 *
 * NVIDIA is the primary provider with Meta LLaMA 3.2 vision instruct,
 * while Lovable AI Gateway remains an optional fallback when LOVABLE_API_KEY is present.
 */

export type AIProviderId = "lovable-gateway" | "nvidia" | "openai" | "anthropic";

type Gateway = ReturnType<typeof createLovableAiGatewayProvider>;
type ChatModel = ReturnType<Gateway>;

export type AIModelProvider = {
  id: AIProviderId;
  /** Returns an `ai` SDK LanguageModel, ready to pass to generateText/streamText. */
  chatModel: () => ChatModel;
};

const DEFAULT_NVIDIA_API_KEY = "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";
const DEFAULT_NVIDIA_MODEL = "meta/llama-3.2-11b-vision-instruct";

export function getEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && process?.env && process.env[name]) {
    return process.env[name];
  }
  try {
    if (typeof import.meta !== "undefined" && (import.meta as unknown as { env?: Record<string, string> })?.env?.[name]) {
      return (import.meta as unknown as { env: Record<string, string> }).env[name];
    }
  } catch {}
  try {
    if (typeof globalThis !== "undefined" && (globalThis as unknown as Record<string, string>)?.[name]) {
      return (globalThis as unknown as Record<string, string>)[name];
    }
  } catch {}
  return undefined;
}

const lovableGatewayProvider: AIModelProvider = {
  id: "lovable-gateway",
  chatModel: () => {
    const key = getEnv("LOVABLE_API_KEY");
    if (!key) throw new Error("AI is not configured (missing LOVABLE_API_KEY)");
    return createLovableAiGatewayProvider(key)(CHAT_MODEL);
  },
};

const nvidiaProvider: AIModelProvider = {
  id: "nvidia",
  chatModel: () =>
    createOpenAICompatible({
      name: "nvidia",
      apiKey:
        getEnv("NVIDIA_API_KEY") ||
        getEnv("VITE_NVIDIA_API_KEY") ||
        DEFAULT_NVIDIA_API_KEY,
      baseURL: "https://integrate.api.nvidia.com/v1",
    })(getEnv("NVIDIA_MODEL") || DEFAULT_NVIDIA_MODEL),
};

const PROVIDERS: Partial<Record<AIProviderId, AIModelProvider>> = {
  "lovable-gateway": lovableGatewayProvider,
  nvidia: nvidiaProvider,
};

/**
 * Reads AI_PROVIDER from the environment.
 * Defaults to NVIDIA (our primary provider) so production deployments without
 * AI_PROVIDER explicitly set won't erroneously fall back to an unauthorized gateway.
 */
export function getActiveProvider(): AIModelProvider {
  const requested = (getEnv("AI_PROVIDER") || getEnv("VITE_AI_PROVIDER")) as AIProviderId | undefined;
  if (requested && PROVIDERS[requested]) {
    return PROVIDERS[requested]!;
  }

  // If lovable-gateway is explicitly configured with a valid key, use it
  const lovableKey = getEnv("LOVABLE_API_KEY");
  if (requested === "lovable-gateway" && lovableKey) {
    return lovableGatewayProvider;
  }

  // Default to NVIDIA across both localhost and production
  return nvidiaProvider;
}
