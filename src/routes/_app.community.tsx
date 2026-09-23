import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowBigUp,
  CheckCircle2,
  FileText,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { extractText } from "unpdf";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { NotesService } from "@/services/notes.service";

export const Route = createFileRoute("/_app/community")({
  head: () => ({
    meta: [
      { title: "Community Q&A — StudyHub" },
      {
        name: "description",
        content: "Ask questions, answer classmates and upvote the best study explanations.",
      },
      { property: "og:title", content: "Community Q&A — StudyHub" },
      {
        property: "og:description",
        content: "Ask, answer and upvote study questions with your peers.",
      },
    ],
  }),
  component: Community,
});

type QuestionRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  subject: string | null;
  tags: string[];
  is_resolved: boolean;
  vote_count: number;
  answer_count: number;
  created_at: string;
};

function Community() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [asking, setAsking] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [notesPickerOpen, setNotesPickerOpen] = useState(false);

  const notesQuery = useQuery({
    queryKey: ["notes-for-community", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => NotesService.list(),
  });

  async function handleFileUpload(file: File) {
    const isPdf =
      file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    setExtracting(true);
    const toastId = toast.loading(`Reading ${file.name}...`);
    try {
      let content = "";
      if (isPdf) {
        const arrayBuffer = await file.arrayBuffer();
        const extracted = await extractText(arrayBuffer);
        const pages = Array.isArray(extracted.text)
          ? extracted.text.join("\n\n")
          : String(extracted.text ?? "");
        content = pages.trim();
        if (!content) {
          throw new Error("Could not extract readable text from this PDF.");
        }
        toast.success(
          `Extracted question details from ${file.name} (${extracted.totalPages} pages)`,
          { id: toastId }
        );
      } else {
        content = await file.text();
        toast.success(`Loaded ${file.name}`, { id: toastId });
      }

      setAsking(true);
      setBody(content.slice(0, 4000));
      setAttachedFileName(file.name);
      if (!title.trim()) {
        const cleanTitle = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]/g, " ")
          .trim();
        setTitle(`Question regarding ${cleanTitle}`.slice(0, 160));
      }
      if (!subject.trim()) {
        const cleanSubject = file.name
          .replace(/\.[^/.]+$/, "")
          .split(/[-_\s]/)[0];
        setSubject(cleanSubject.slice(0, 60));
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to read file.";
      toast.error(message, { id: toastId });
    } finally {
      setExtracting(false);
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ["community", search],
    queryFn: async () => {
      let query = supabase
        .from("questions")
        .select(
          "id,user_id,title,body,subject,tags,is_resolved,view_count,vote_count,answer_count,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (search.trim()) query = query.ilike("title", `%${search.trim()}%`);
      const { data: questions, error } = await query;
      if (error) throw error;
      const { data: votes } = await supabase.from("post_votes").select("post_id");
      return {
        questions: (questions ?? []) as QuestionRow[],
        voted: new Set((votes ?? []).map((vote) => vote.post_id)),
      };
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["community"] });

  const ask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("questions").insert({
        user_id: user!.id,
        title: title.trim(),
        body: body.trim(),
        subject: subject.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setTitle("");
      setBody("");
      setSubject("");
      setAsking(false);
      toast.success("Question posted");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const vote = useMutation({
    mutationFn: async ({ id, type, active }: { id: string; type: string; active: boolean }) => {
      if (active) {
        const { error } = await supabase
          .from("post_votes")
          .delete()
          .eq("post_id", id)
          .eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_votes")
          .insert({ user_id: user!.id, post_id: id, post_type: type });
        if (error) throw error;
      }
    },
    onSuccess: refresh,
    onError: (error: Error) => toast.error(error.message),
  });

  const removeQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Question removed");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Community Q&amp;A</h1>
          <p className="mt-1 text-muted-foreground">
            Ask, answer and upvote — study together instead of alone.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={extracting}
            className="gap-2 shadow-xs"
          >
            {extracting ? (
              <RefreshCw className="size-4 animate-spin text-primary" />
            ) : (
              <Upload className="size-4 text-primary" />
            )}
            <span>Upload question / notes</span>
          </Button>
          <Button onClick={() => setAsking((value) => !value)}>
            <Plus className="mr-1 size-4" /> Ask a question
          </Button>
        </div>
      </div>

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

      {asking && (
        <div className="surface-card space-y-4 p-5 border-border/80 shadow-xs">
          <div>
            <Label htmlFor="q-title">Question</Label>
            <Input
              id="q-title"
              maxLength={160}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Why does entropy increase in an irreversible process?"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="q-body">Details</Label>
              <div className="flex items-center gap-2">
                {(notesQuery.data ?? []).filter((n) => Boolean(n.content)).length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setNotesPickerOpen(true)}
                  >
                    <FileText className="size-3 text-primary" />
                    From notes
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={extracting}
                >
                  <Upload className="size-3 text-primary" />
                  Upload file
                </Button>
              </div>
            </div>

            {attachedFileName && (
              <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-1.5 text-xs text-primary border border-primary/20">
                <span className="flex items-center gap-1.5 truncate">
                  <FileText className="size-3.5 shrink-0" />
                  <span>Loaded context from: <strong className="font-semibold">{attachedFileName}</strong></span>
                </span>
                <button
                  type="button"
                  className="hover:opacity-75"
                  onClick={() => setAttachedFileName(null)}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            <div
              className="relative"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileUpload(file);
              }}
            >
              <Textarea
                id="q-body"
                rows={4}
                maxLength={4000}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Describe your question in detail, paste a problem statement, or drop a document here."
                className="rounded-xl leading-relaxed"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-40">
              <Label htmlFor="q-subject">Subject</Label>
              <Input
                id="q-subject"
                maxLength={60}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="rounded-xl"
              />
            </div>
            <Button
              disabled={title.trim().length < 8 || body.trim().length < 8 || ask.isPending}
              onClick={() => ask.mutate()}
              className="rounded-xl shadow-xs"
            >
              Post question
            </Button>
          </div>
        </div>
      )}

      <Dialog open={notesPickerOpen} onOpenChange={setNotesPickerOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              Import Note into Question
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
                      setAsking(true);
                      setBody((note.content ?? "").slice(0, 4000));
                      setTitle(`Question about ${note.title}`.slice(0, 160));
                      if (note.course || note.unit) {
                        setSubject((note.course || note.unit || "").slice(0, 60));
                      }
                      setAttachedFileName(`Note: ${note.title}`);
                      setNotesPickerOpen(false);
                      toast.success(`Loaded "${note.title}" into question`);
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search questions"
        />
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-64" />
      ) : data.questions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No questions yet — be the first to ask.</p>
      ) : (
        <ul className="space-y-3">
          {data.questions.map((question) => (
            <li key={question.id} className="surface-card p-5">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <Button
                    variant={data.voted.has(question.id) ? "default" : "outline"}
                    size="icon"
                    aria-label="Upvote question"
                    onClick={() =>
                      vote.mutate({
                        id: question.id,
                        type: "question",
                        active: data.voted.has(question.id),
                      })
                    }
                  >
                    <ArrowBigUp className="size-4" />
                  </Button>
                  <span className="mt-1 text-sm font-semibold">{question.vote_count}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{question.title}</h2>
                    {question.is_resolved && (
                      <Badge className="bg-success/15 text-success" variant="secondary">
                        <CheckCircle2 className="mr-1 size-3" /> Resolved
                      </Badge>
                    )}
                    {question.subject && <Badge variant="secondary">{question.subject}</Badge>}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {question.body}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpenId(openId === question.id ? null : question.id)}
                    >
                      <MessageSquare className="mr-1 size-4" />
                      {question.answer_count} answers
                    </Button>
                    {question.user_id === user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion.mutate(question.id)}
                      >
                        <Trash2 className="mr-1 size-4" /> Delete
                      </Button>
                    )}
                  </div>
                  {openId === question.id && (
                    <AnswerThread
                      questionId={question.id}
                      questionOwner={question.user_id}
                      voted={data.voted}
                      onChanged={refresh}
                    />
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AnswerThread({
  questionId,
  questionOwner,
  voted,
  onChanged,
}: {
  questionId: string;
  questionOwner: string;
  voted: Set<string>;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["answers", questionId],
    queryFn: async () => {
      const { data: answers, error } = await supabase
        .from("answers")
        .select("id,question_id,user_id,body,is_accepted,vote_count,created_at")
        .eq("question_id", questionId)
        .order("is_accepted", { ascending: false })
        .order("vote_count", { ascending: false });
      if (error) throw error;
      return answers ?? [];
    },
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["answers", questionId] });
    onChanged();
  };

  const reply = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("answers")
        .insert({ question_id: questionId, user_id: user!.id, body: body.trim() });
      if (error) throw error;
    },
    onSuccess: async () => {
      setBody("");
      toast.success("Answer posted");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const accept = useMutation({
    mutationFn: async (answerId: string) => {
      const { error } = await supabase
        .from("answers")
        .update({ is_accepted: true })
        .eq("id", answerId);
      if (error) throw error;
      await supabase.from("questions").update({ is_resolved: true }).eq("id", questionId);
    },
    onSuccess: refresh,
    onError: (error: Error) => toast.error(error.message),
  });

  const voteAnswer = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (active) {
        const { error } = await supabase
          .from("post_votes")
          .delete()
          .eq("post_id", id)
          .eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_votes")
          .insert({ user_id: user!.id, post_id: id, post_type: "answer" });
        if (error) throw error;
      }
    },
    onSuccess: refresh,
  });

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      {isLoading ? (
        <Skeleton className="h-16" />
      ) : (
        (data ?? []).map((answer) => (
          <div key={answer.id} className="rounded-lg bg-secondary/50 p-3">
            <p className="whitespace-pre-wrap text-sm">{answer.body}</p>
            <div className="mt-2 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => voteAnswer.mutate({ id: answer.id, active: voted.has(answer.id) })}
              >
                <ArrowBigUp className="mr-1 size-4" /> {answer.vote_count}
              </Button>
              {answer.is_accepted ? (
                <Badge className="bg-success/15 text-success" variant="secondary">
                  Accepted
                </Badge>
              ) : (
                questionOwner === user?.id && (
                  <Button variant="ghost" size="sm" onClick={() => accept.mutate(answer.id)}>
                    <CheckCircle2 className="mr-1 size-4" /> Accept
                  </Button>
                )
              )}
            </div>
          </div>
        ))
      )}
      <div className="flex flex-col gap-2">
        <Textarea
          rows={2}
          maxLength={4000}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write an answer…"
        />
        <Button
          size="sm"
          className="self-end"
          disabled={body.trim().length < 5 || reply.isPending}
          onClick={() => reply.mutate()}
        >
          Post answer
        </Button>
      </div>
    </div>
  );
}
