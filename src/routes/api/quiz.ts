import { createFileRoute } from "@tanstack/react-router";
import { executeQuizGeneration } from "@/lib/study-ai.functions";

export const Route = createFileRoute("/api/quiz")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            source?: string;
            topic?: string;
            count?: number;
            difficulty?: "easy" | "medium" | "hard";
          };

          const source = typeof body.source === "string" ? body.source.trim() : "";
          const topic = typeof body.topic === "string" ? body.topic.trim() : "";
          const count = typeof body.count === "number" ? body.count : 6;
          const difficulty = body.difficulty || "medium";

          if (!source && !topic) {
            return new Response(
              JSON.stringify({ error: "Please provide either study material or a topic to generate a quiz." }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          const result = await executeQuizGeneration({ source, topic, count, difficulty });
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: unknown) {
          console.error("[/api/quiz error]:", err);
          const message = err instanceof Error ? err.message : "Failed to generate quiz.";
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

