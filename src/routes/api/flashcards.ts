import { createFileRoute } from "@tanstack/react-router";
import { executeFlashcardGeneration } from "@/lib/study-ai.functions";

export const Route = createFileRoute("/api/flashcards")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            source?: string;
            topic?: string;
            count?: number;
          };

          const source = typeof body.source === "string" ? body.source.trim() : "";
          const topic = typeof body.topic === "string" ? body.topic.trim() : "";
          const count = typeof body.count === "number" ? body.count : 8;

          if (!source && !topic) {
            return new Response(
              JSON.stringify({ error: "Please provide either study material or a subject to generate flashcards." }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          const result = await executeFlashcardGeneration({ source, topic, count });
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: unknown) {
          console.error("[/api/flashcards error]:", err);
          const message = err instanceof Error ? err.message : "Failed to generate flashcards.";
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

