import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowBigUp, CheckCircle2, MessageSquare, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/community")({
  head: () => ({
    meta: [
      { title: "Community Q&A — StudyHub" },
      {
        name: "description",
        content: "Ask questions, answer classmates and upvote the best study explanations.",
      },
      { property: "og:title", content: "Community Q&A — StudyHub" },
      { property: "og:description", content: "Ask, answer and upvote study questions with your peers." },
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

  const { data, isLoading } = useQuery({
    queryKey: ["community", search],
    queryFn: async () => {
      let query = supabase
        .from("questions")
        .select("id,user_id,title,body,subject,tags,is_resolved,view_count,vote_count,answer_count,created_at")
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
        <Button onClick={() => setAsking((value) => !value)}>
          <Plus className="mr-1 size-4" /> Ask a question
        </Button>
      </div>

      {asking && (
        <div className="surface-card space-y-3 p-5">
          <div>
            <Label htmlFor="q-title">Question</Label>
            <Input
              id="q-title"
              maxLength={160}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Why does entropy increase in an irreversible process?"
            />
          </div>
          <div>
            <Label htmlFor="q-body">Details</Label>
            <Textarea
              id="q-body"
              rows={4}
              maxLength={4000}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-40">
              <Label htmlFor="q-subject">Subject</Label>
              <Input
                id="q-subject"
                maxLength={60}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>
            <Button
              disabled={title.trim().length < 8 || body.trim().length < 8 || ask.isPending}
              onClick={() => ask.mutate()}
            >
              Post question
            </Button>
          </div>
        </div>
      )}

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
                      <Badge className="bg-accent/15 text-accent" variant="secondary">
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
                <Badge className="bg-accent/15 text-accent" variant="secondary">
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