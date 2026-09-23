import { useChat } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { DefaultChatTransport } from "ai";
import {
  BookOpenCheck,
  CalendarRange,
  Check,
  Copy,
  FileText,
  Layers,
  Lightbulb,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { extractText } from "unpdf";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotesService } from "@/services/notes.service";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
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
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  {
    icon: BookOpenCheck,
    label: "Summarise notes",
    prompt: "Summarise the key points of supply and demand into concise revision bullets.",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  {
    icon: Layers,
    label: "Make flashcards",
    prompt: "Make me 10 flashcard question/answer pairs on cell biology.",
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  {
    icon: CalendarRange,
    label: "Plan revision",
    prompt: "Build a 5-day revision plan for organic chemistry with daily goals.",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Copy answer"
      className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 rounded-lg hover:bg-secondary"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5 text-muted-foreground" />}
    </Button>
  );
}

function Assistant() {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { session } = useAuth();
  const tokenRef = useRef<string | undefined>(undefined);
  tokenRef.current = session?.access_token;
  const [extracting, setExtracting] = useState(false);
  const [attachedDoc, setAttachedDoc] = useState<{ name: string; content: string; pages?: number } | null>(null);
  const [notesPickerOpen, setNotesPickerOpen] = useState(false);

  const notesQuery = useQuery({
    queryKey: ["notes-for-assistant", session?.user?.id],
    enabled: Boolean(session?.user?.id),
    queryFn: () => NotesService.list(),
  });

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

  async function handleFileUpload(file: File) {
    const isPdf =
      file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    setExtracting(true);
    const toastId = toast.loading(`Reading ${file.name}...`);
    try {
      let content = "";
      let totalPages: number | undefined = undefined;
      if (isPdf) {
        const arrayBuffer = await file.arrayBuffer();
        const extracted = await extractText(arrayBuffer);
        const pages = Array.isArray(extracted.text)
          ? extracted.text.join("\n\n")
          : String(extracted.text ?? "");
        content = pages.trim();
        totalPages = extracted.totalPages;
        if (!content) {
          throw new Error(
            "Could not extract readable text from this PDF. It may contain scanned images rather than text."
          );
        }
        toast.success(
          `Attached ${file.name} (${extracted.totalPages} pages)`,
          { id: toastId }
        );
      } else {
        content = await file.text();
        toast.success(`Attached ${file.name}`, { id: toastId });
      }

      const trimmed = content.slice(0, 12000);
      setAttachedDoc({ name: file.name, content: trimmed, pages: totalPages });
      if (!input.trim()) {
        setInput(`Please explain the core concepts from "${file.name}" and summarize what I need to know.`);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to extract text from file.";
      toast.error(message, { id: toastId });
    } finally {
      setExtracting(false);
    }
  }

  async function send(text: string) {
    if (!text.trim() || busy) return;
    let messageToSend = text.trim();
    if (attachedDoc) {
      messageToSend = `[Attached Material from "${attachedDoc.name}"]:\n"""\n${attachedDoc.content}\n"""\n\nStudent question: ${messageToSend}`;
      setAttachedDoc(null);
    }
    setInput("");
    await sendMessage({ text: messageToSend });
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept=".pdf,.txt,.md,.markdown,.text,.json,.rtf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          e.target.value = "";
        }}
      />

      <PageHeader
        title="AI tutor"
        description="Explanations, summaries, flashcards and study plans — powered by StudyHub AI."
        badge={
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5 shadow-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={extracting}
            >
              {extracting ? (
                <RefreshCw className="size-3.5 animate-spin text-primary" />
              ) : (
                <Upload className="size-3.5 text-primary" />
              )}
              <span>Upload notes</span>
            </Button>
            {messages.length > 0 && (
              <Button variant="outline" size="sm" className="rounded-xl shadow-xs" onClick={() => setMessages([])}>
                <RefreshCw className="mr-1.5 size-3.5" />
                New chat
              </Button>
            )}
          </div>
        }
      />

      <Conversation className="glass-panel-pro mt-4 flex-1 rounded-3xl border border-border/70 shadow-sm">
        <ConversationContent>
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 py-10 text-center">
              <div className="relative">
                <BrandMark className="size-16 drop-shadow-md" />
                <span className="absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-background bg-emerald-500 shadow-xs" />
              </div>
              <div className="space-y-1.5">
                <p className="font-display text-2xl font-bold tracking-tight text-foreground">
                  How can I help you revise today?
                </p>
                <p className="max-w-md text-sm text-muted-foreground leading-relaxed font-normal">
                  Ask me to break down complex theories, test you on a topic, or generate practice questions.
                </p>
              </div>
              <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2">
                {starters.map((starter) => (
                  <button
                    key={starter.label}
                    type="button"
                    onClick={() => send(starter.prompt)}
                    className="group flex items-start gap-3.5 p-4 text-left rounded-2xl border border-border/80 bg-gradient-to-b from-card to-card/60 shadow-2xs hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-sm transition-all"
                  >
                    <span className={`rounded-xl p-2.5 transition-transform group-hover:scale-110 shadow-2xs ${starter.color}`}>
                      <starter.icon className="size-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {starter.label}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground leading-relaxed">
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

      {attachedDoc && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2 text-xs text-primary shadow-2xs">
          <span className="flex items-center gap-2 min-w-0 truncate">
            <FileText className="size-4 shrink-0 text-primary" />
            <span className="truncate">
              Attached context: <strong className="font-semibold">{attachedDoc.name}</strong> ({attachedDoc.pages ? `${attachedDoc.pages} pages, ` : ""}{attachedDoc.content.length} chars)
            </span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-destructive hover:bg-destructive/10"
            onClick={() => setAttachedDoc(null)}
          >
            <X className="size-3 mr-1" /> Remove
          </Button>
        </div>
      )}

      <PromptInput
        className="mt-3"
        onSubmit={(_message, event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <PromptInputTextarea
          ref={textareaRef}
          value={input}
          autoFocus
          placeholder={attachedDoc ? `Ask a question about ${attachedDoc.name}...` : "Ask about any topic, paste notes, or attach a document..."}
          onChange={(event) => setInput(event.target.value)}
        />
        <PromptInputFooter className="justify-between items-center gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground rounded-lg"
              onClick={() => fileInputRef.current?.click()}
              disabled={extracting}
            >
              {extracting ? (
                <RefreshCw className="size-3.5 animate-spin text-primary" />
              ) : (
                <Upload className="size-3.5 text-primary" />
              )}
              <span>Upload file</span>
            </Button>
            {(notesQuery.data ?? []).filter((n) => Boolean(n.content)).length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground rounded-lg"
                onClick={() => setNotesPickerOpen(true)}
              >
                <FileText className="size-3.5 text-primary" />
                <span>From notes</span>
              </Button>
            )}
            <span className="hidden text-xs text-muted-foreground lg:inline">
              Enter to send · Shift + Enter for new line
            </span>
          </div>
          <PromptInputSubmit status={status} disabled={!input.trim() || busy} />
        </PromptInputFooter>
      </PromptInput>

      <Dialog open={notesPickerOpen} onOpenChange={setNotesPickerOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              Attach Note to AI Tutor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {(notesQuery.data ?? []).filter((n) => Boolean(n.content)).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No saved notes with text content found.
              </p>
            ) : (
              (notesQuery.data ?? [])
                .filter((n) => Boolean(n.content))
                .map((note) => (
                  <div
                    key={note.id}
                    onClick={() => {
                      setAttachedDoc({
                        name: note.title,
                        content: (note.content ?? "").slice(0, 12000),
                      });
                      if (!input.trim()) {
                        setInput(`Please explain the core concepts from my note "${note.title}".`);
                      }
                      setNotesPickerOpen(false);
                      toast.success(`Attached "${note.title}" to tutor conversation`);
                    }}
                    className="group flex flex-col gap-1 rounded-xl border border-border/80 p-3 hover:border-primary/40 hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold group-hover:text-primary transition-colors">
                        {note.title}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {(note.content ?? "").length} chars
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {note.content}
                    </p>
                  </div>
                ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
