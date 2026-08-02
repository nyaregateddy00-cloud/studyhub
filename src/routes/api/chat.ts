import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { getActiveProvider } from "@/lib/ai/provider.server";

const SYSTEM_PROMPT = `You are StudyHub's AI tutor for university and high-school students.
Explain concepts clearly and step by step, using short paragraphs, headings and bullet lists in markdown.
When asked, produce summaries, flashcards (Q/A pairs), revision questions or day-by-day study plans.
Be encouraging and concise; never invent sources or citations.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        let model;
        try {
          model = getActiveProvider().chatModel();
        } catch {
          return new Response("AI is not configured", { status: 500 });
        }

        const result = streamText({
          model,
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
