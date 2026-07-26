import { useChat } from "@ai-sdk/react";
import { createFileRoute } from "@tanstack/react-router";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/assistant")({
  head: () => ({
    meta: [
      { title: "AI tutor — StudyHub" },
      {
        name: "description",
        content: "Ask StudyHub's AI tutor to explain topics, summarise notes and build revision plans.",
      },
      { property: "og:title", content: "AI tutor — StudyHub" },
      { property: "og:description", content: "Explanations, summaries and revision plans on demand." },
    ],
  }),
  component: Assistant,
});

const starters = [
  "Explain photosynthesis like I'm revising for an exam",
  "Summarise the key points of supply and demand",
  "Make me 10 revision questions on cell biology",
  "Build a 5-day revision plan for organic chemistry",
];

function Assistant() {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: () => toast.error("The tutor couldn't respond. Please try again."),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setInput("");
    await sendMessage({ text: text.trim() });
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      <h1 className="text-2xl font-bold">AI tutor</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Explanations, summaries, flashcards and study plans — ask anything.
      </p>

      <Conversation className="mt-4 flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-5 py-10 text-center">
              <BrandMark className="size-12" />
              <p className="max-w-sm text-sm text-muted-foreground">
                Start with a topic you're stuck on, or pick a prompt below.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {starters.map((starter) => (
                  <Button key={starter} variant="outline" size="sm" onClick={() => send(starter)}>
                    {starter}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>
                      {message.parts
                        .map((part) => (part.type === "text" ? part.text : ""))
                        .join("")}
                    </ReactMarkdown>
                  </div>
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && <Shimmer>Thinking...</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput
        className="mt-4"
        onSubmit={(_message, event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <PromptInputTextarea
          ref={textareaRef}
          value={input}
          autoFocus
          placeholder="Ask about any topic..."
          onChange={(event) => setInput(event.target.value)}
        />
        <PromptInputFooter className="justify-end">
          <PromptInputSubmit status={status} disabled={!input.trim() || busy} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}