import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Bookmark, Download, FileText, Flag, Heart, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/notes")({
  head: () => ({
    meta: [
      { title: "Notes — StudyHub" },
      {
        name: "description",
        content: "Upload, organise and search your course notes and lecture files in StudyHub.",
      },
      { property: "og:title", content: "Notes — StudyHub" },
      { property: "og:description", content: "Upload, organise and search your course notes." },
    ],
  }),
  component: NotesPage,
});

const noteSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(140),
  institution: z.string().trim().max(120),
  course: z.string().trim().max(120),
  unit: z.string().trim().max(120),
  content: z.string().trim().max(20000),
});

function NotesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    title: "",
    institution: "",
    course: "",
    unit: "",
    content: "",
    isPublic: false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [reportNoteId, setReportNoteId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");

  const notesQuery = useQuery({
    queryKey: ["notes", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select(
          "id,user_id,title,content,institution,course,unit,topic,file_url,file_name,file_type,is_public,like_count,created_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const bookmarksQuery = useQuery({
    queryKey: ["note-bookmarks", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("note_bookmarks").select("note_id");
      if (error) throw error;
      return new Set((data ?? []).map((row) => row.note_id));
    },
  });

  const likesQuery = useQuery({
    queryKey: ["note-likes", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("note_likes")
        .select("note_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((row) => row.note_id));
    },
  });

  const createNote = useMutation({
    mutationFn: async () => {
      const parsed = noteSchema.parse(form);
      let filePath: string | null = null;
      if (file) {
        const path = `${user!.id}/${crypto.randomUUID()}-${file.name}`;
        const { error } = await supabase.storage.from("notes").upload(path, file);
        if (error) throw error;
        filePath = path;
      }
      const { error } = await supabase.from("notes").insert({
        user_id: user!.id,
        title: parsed.title,
        content: parsed.content || null,
        institution: parsed.institution || null,
        course: parsed.course || null,
        unit: parsed.unit || null,
        is_public: form.isPublic,
        file_url: filePath,
        file_name: file?.name ?? null,
        file_type: file?.type ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note saved");
      setOpen(false);
      setFile(null);
      setForm({ title: "", institution: "", course: "", unit: "", content: "", isPublic: false });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save this note."),
  });

  const toggleLike = useMutation({
    mutationFn: async (noteId: string) => {
      if (likesQuery.data?.has(noteId)) {
        const { error } = await supabase
          .from("note_likes")
          .delete()
          .eq("note_id", noteId)
          .eq("user_id", user!.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("note_likes")
        .insert({ note_id: noteId, user_id: user!.id });
      // A duplicate means another tab already liked it — treat as success.
      if (error && error.code !== "23505") throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note-likes"] });
    },
    onError: () => toast.error("Could not update the like."),
  });

  const toggleBookmark = useMutation({
    mutationFn: async (noteId: string) => {
      if (bookmarksQuery.data?.has(noteId)) {
        const { error } = await supabase
          .from("note_bookmarks")
          .delete()
          .eq("note_id", noteId)
          .eq("user_id", user!.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("note_bookmarks")
        .insert({ note_id: noteId, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["note-bookmarks"] }),
    onError: () => toast.error("Could not update the bookmark."),
  });

  async function download(path: string, name: string) {
    const { data, error } = await supabase.storage.from("notes").createSignedUrl(path, 60);
    if (error || !data) {
      toast.error("Could not prepare the download.");
      return;
    }
    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.download = name;
    link.click();
  }

  const submitReport = useMutation({
    mutationFn: async () => {
      const reason = reportReason.trim();
      if (!reportNoteId || !reason) throw new Error("Please describe the problem.");
      const { error } = await supabase
        .from("note_reports")
        .insert({ note_id: reportNoteId, user_id: user!.id, reason: reason.slice(0, 500) });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thanks — our moderators will review it.");
      setReportNoteId(null);
      setReportReason("");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not send the report."),
  });

  const term = query.trim().toLowerCase();
  const notes = (notesQuery.data ?? []).filter((note) =>
    term
      ? [note.title, note.course, note.unit, note.institution, note.topic]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      : true,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your library plus notes shared by other students.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              New note
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add a note</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                createNote.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  maxLength={140}
                  required
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {(["institution", "course", "unit"] as const).map((field) => (
                  <div key={field} className="space-y-1.5">
                    <Label htmlFor={field} className="capitalize">
                      {field}
                    </Label>
                    <Input
                      id={field}
                      value={form[field]}
                      maxLength={120}
                      onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="content">Note content</Label>
                <Textarea
                  id="content"
                  rows={6}
                  maxLength={20000}
                  value={form.content}
                  onChange={(event) => setForm({ ...form, content: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="file">Attach a file (PDF, DOCX, PPTX)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,image/*"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Share with the community</p>
                  <p className="text-xs text-muted-foreground">
                    Public notes appear in everyone's library.
                  </p>
                </div>
                <Switch
                  checked={form.isPublic}
                  onCheckedChange={(checked) => setForm({ ...form, isPublic: checked })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createNote.isPending}>
                {createNote.isPending ? "Saving..." : "Save note"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by title, course or unit"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {notesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-44" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="surface-card p-12 text-center">
          <FileText className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No notes here yet. Add your first one to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <article key={note.id} className="surface-card lift flex flex-col p-5">
              <h2 className="font-semibold">{note.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {[note.course, note.unit].filter(Boolean).join(" · ") || "Uncategorised"}
              </p>
              {note.content && (
                <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{note.content}</p>
              )}
              <div className="mt-4 flex items-center gap-1 border-t border-border pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleLike.mutate(note.id)}
                  aria-label={likesQuery.data?.has(note.id) ? "Unlike note" : "Like note"}
                  aria-pressed={likesQuery.data?.has(note.id) ?? false}
                >
                  <Heart
                    className={
                      likesQuery.data?.has(note.id) ? "size-4 fill-primary text-primary" : "size-4"
                    }
                  />
                  {note.like_count}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => toggleBookmark.mutate(note.id)}
                  aria-label={bookmarksQuery.data?.has(note.id) ? "Remove bookmark" : "Bookmark note"}
                  aria-pressed={bookmarksQuery.data?.has(note.id) ?? false}
                >
                  <Bookmark
                    className={
                      bookmarksQuery.data?.has(note.id) ? "size-4 fill-primary text-primary" : "size-4"
                    }
                  />
                </Button>
                {note.file_url && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="ml-auto"
                    onClick={() => download(note.file_url!, note.file_name ?? "note")}
                    aria-label="Download attachment"
                  >
                    <Download className="size-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={note.file_url ? "" : "ml-auto"}
                  onClick={() => {
                    setReportReason("");
                    setReportNoteId(note.id);
                  }}
                  aria-label="Report note"
                >
                  <Flag className="size-4" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog
        open={reportNoteId !== null}
        onOpenChange={(next) => {
          if (!next) setReportNoteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this note</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              submitReport.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="report-reason">What&apos;s wrong with it?</Label>
              <Textarea
                id="report-reason"
                rows={4}
                required
                maxLength={500}
                value={reportReason}
                placeholder="Copyright issue, wrong subject, offensive content…"
                onChange={(event) => setReportReason(event.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitReport.isPending}>
              {submitReport.isPending ? "Sending…" : "Send report"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}