import { useChat } from "@ai-sdk/react";
import { createFileRoute } from "@tanstack/react-router";
import { DefaultChatTransport } from "ai";
import {
  BookOpenCheck,
  CalendarRange,
  Check,
  Copy,
  Layers,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { useUsageGate } from "@/hooks/use-subscription";
import { useAuth } from "@/lib/auth";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { BrandMark } from "@/components/brand";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/assistant")({
  head: () => ({
    meta: [
      { title: "AI tutor — StudyHub" },
      {
        name: "description",
        content:
          "Ask StudyHub's AI tutor to explain topics, summarise notes and build revision plans.",
      },
      { property: "og:title", content: "AI tutor — StudyHub" },
      {
        property: "og:description",
        content: "Explanations, summaries and revision plans on demand.",
      },
    ],
  }),
  component: Assistant,
});

const starters = [
  {
    icon: Lightbulb,
    label: "Explain a topic",
    prompt: "Explain photosynthesis like I'm revising for an exam, with a worked example.",
  },
  {
    icon: BookOpenCheck,
    label: "Summarise notes",
    prompt: "Summarise the key points of supply and demand into concise revision bullets.",
  },
  {
    icon: Layers,
    label: "Make flashcards",
    prompt: "Make me 10 flashcard question/answer pairs on cell biology.",
  },
  {
    icon: CalendarRange,
    label: "Plan revision",
    prompt: "Build a 5-day revision plan for organic chemistry with daily goals.",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Copy answer"
      className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="size-3.5 text-accent" /> : <Copy className="size-3.5" />}
    </Button>
  );
}

function Assistant() {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gate = useUsageGate("ai_message");
  const { session } = useAuth();
  const tokenRef = useRef<string | undefined>(undefined);
  tokenRef.current = session?.access_token;

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // The endpoint requires a signed-in user, so attach the current token.
      headers: () =>
        tokenRef.current
          ? ({ Authorization: `Bearer ${tokenRef.current}` } as Record<string, string>)
          : ({} as Record<string, string>),
    }),
    onError: () => toast.error("The tutor couldn't respond. Please try again."),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    if (!gate.allowed) {
      toast.error(
        `Free plan limit reached (${gate.limit} tutor messages a day). Upgrade to Premium for unlimited chats.`,
      );
      return;
    }
    setInput("");
    await sendMessage({ text: text.trim() });
    await gate.consume();
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <PageHeader
        title="AI tutor"
        description="Explanations, summaries, flashcards and study plans — ask anything."
        actions={
          messages.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => setMessages([])}>
              <RefreshCw className="size-4" />
              New chat
            </Button>
          ) : undefined
        }
      />

      <Conversation className="glass-panel mt-4 flex-1 rounded-2xl">
        <ConversationContent>
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 py-10 text-center">
              <BrandMark className="size-14" />
              <div className="space-y-1">
                <p className="font-display text-lg font-semibold">How can I help you revise?</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Start with a topic you're stuck on, or pick a prompt below.
                </p>
              </div>
              <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
                {starters.map((starter) => (
                  <button
                    key={starter.label}
                    type="button"
                    onClick={() => send(starter.prompt)}
                    className="surface-card lift flex items-start gap-3 p-4 text-left"
                  >
                    <span className="rounded-lg bg-primary/10 p-2 text-primary">
                      <starter.icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{starter.label}</span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                        {starter.prompt}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const text = message.parts
                .map((part) => (part.type === "text" ? part.text : ""))
                .join("");
              return (
                <Message from={message.role} key={message.id}>
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-2">
                      <BrandMark className="size-5" />
                      <span className="text-xs font-medium text-muted-foreground">
                        StudyHub tutor
                      </span>
                    </div>
                  )}
                  <MessageContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{text}</ReactMarkdown>
                    </div>
                  </MessageContent>
                  {message.role === "assistant" && text.trim() && <CopyButton text={text} />}
                </Message>
              );
            })
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
        <PromptInputFooter className="justify-between">
          <span className="hidden text-xs text-muted-foreground sm:block">
            Enter to send · Shift + Enter for a new line
          </span>
          <PromptInputSubmit status={status} disabled={!input.trim() || busy} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
