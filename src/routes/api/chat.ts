import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";

import { getActiveProvider } from "@/lib/ai/provider.server";

const SYSTEM_PROMPT = `You are StudyHub's AI tutor for university and high-school students.
Explain concepts clearly and step by step, using short paragraphs, headings and bullet lists in markdown.
When asked, produce summaries, flashcards (Q/A pairs), revision questions or day-by-day study plans.
Be encouraging and concise; never invent sources or citations.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Streaming AI costs credits — require a valid Supabase session.
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token || token.split(".").length !== 3) {
          return new Response("Unauthorized", { status: 401 });
        }
        const supabaseUrl = process.env['SUPABASE_URL'];
        const supabaseKey = process.env['SUPABASE_PUBLISHABLE_KEY'];
        if (!supabaseUrl || !supabaseKey) {
          return new Response("Auth is not configured", { status: 500 });
        }
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          global: { headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` } },
        });
        const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
        if (claimsError || !claimsData?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }

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
