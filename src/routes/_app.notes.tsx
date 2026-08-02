import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bookmark,
  Download,
  FileText,
  Flag,
  Globe,
  Heart,
  Paperclip,
  Plus,
  Search,
  Eye,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { NoteViewerDialog } from "@/components/notes/note-viewer-dialog";
import { useAuth } from "@/lib/auth";
import { NotesService } from "@/services/notes.service";

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
  const [filter, setFilter] = useState<"all" | "mine" | "shared" | "saved">("all");
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
  const [viewNoteId, setViewNoteId] = useState<string | null>(null);

  const notesQuery = useQuery({
    queryKey: ["notes", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => NotesService.list(),
  });

  const bookmarksQuery = useQuery({
    queryKey: ["note-bookmarks", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => NotesService.listBookmarkedIds(),
  });

  const likesQuery = useQuery({
    queryKey: ["note-likes", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => NotesService.listLikedIds(user!.id),
  });

  const createNote = useMutation({
    mutationFn: async () => {
      const parsed = noteSchema.parse(form);
      await NotesService.create({
        user_id: user!.id,
        title: parsed.title,
        content: parsed.content || null,
        institution: parsed.institution || null,
        course: parsed.course || null,
        unit: parsed.unit || null,
        is_public: form.isPublic,
        file,
      });
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
      const liked = likesQuery.data?.has(noteId) ?? false;
      try {
        await NotesService.setLiked(noteId, user!.id, !liked);
      } catch (error) {
        // A duplicate means another tab already liked it — treat as success.
        const code = (error as { code?: string })?.code;
        if (code !== "23505") throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note-likes"] });
    },
    onError: () => toast.error("Could not update the like."),
  });

  const toggleBookmark = useMutation({
    mutationFn: async (noteId: string) => {
      const bookmarked = bookmarksQuery.data?.has(noteId) ?? false;
      await NotesService.setBookmarked(noteId, user!.id, !bookmarked);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["note-bookmarks"] }),
    onError: () => toast.error("Could not update the bookmark."),
  });

  async function download(path: string, name: string) {
    let signedUrl: string;
    try {
      signedUrl = await NotesService.getAttachmentUrl(path, 60);
    } catch {
      toast.error("Could not prepare the download.");
      return;
    }
    const link = document.createElement("a");
    link.href = signedUrl;
    link.download = name;
    link.click();
  }

  const submitReport = useMutation({
    mutationFn: async () => {
      const reason = reportReason.trim();
      if (!reportNoteId || !reason) throw new Error("Please describe the problem.");
      await NotesService.report(reportNoteId, user!.id, reason.slice(0, 500));
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
  const notes = (notesQuery.data ?? [])
    .filter((note) =>
      term
        ? [note.title, note.course, note.unit, note.institution, note.topic]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term))
        : true,
    )
    .filter((note) => {
      if (filter === "mine") return note.user_id === user?.id;
      if (filter === "shared") return note.is_public;
      if (filter === "saved") return bookmarksQuery.data?.has(note.id) ?? false;
      return true;
    });

  const counts = {
    all: (notesQuery.data ?? []).length,
    mine: (notesQuery.data ?? []).filter((note) => note.user_id === user?.id).length,
    shared: (notesQuery.data ?? []).filter((note) => note.is_public).length,
    saved: bookmarksQuery.data?.size ?? 0,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notes"
        description="Your library plus notes shared by other students."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                <span className="hidden sm:inline">New note</span>
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
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by title, course or unit"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="mine">Mine ({counts.mine})</TabsTrigger>
            <TabsTrigger value="shared">Shared ({counts.shared})</TabsTrigger>
            <TabsTrigger value="saved">Saved ({counts.saved})</TabsTrigger>
          </TabsList>
        </Tabs>
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
            {term || filter !== "all"
              ? "No notes match this filter yet."
              : "No notes here yet. Add your first one to get started."}
          </p>
          {!term && filter === "all" && (
            <Button className="mt-4" onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              Add your first note
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <article key={note.id} className="surface-card lift flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  className="text-left font-semibold leading-snug hover:underline"
                  onClick={() => setViewNoteId(note.id)}
                >
                  {note.title}
                </button>
                {note.is_public && (
                  <Badge variant="secondary" className="shrink-0 gap-1">
                    <Globe className="size-3" /> Shared
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {[note.course, note.unit].filter(Boolean).join(" · ") || "Uncategorised"}
              </p>
              {note.content && (
                <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{note.content}</p>
              )}
              {note.file_name && (
                <p className="mt-3 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <Paperclip className="size-3 shrink-0" />
                  {note.file_name}
                </p>
              )}
              <div className="mt-auto flex items-center gap-1 border-t border-border pt-3">
                <Button variant="ghost" size="sm" onClick={() => setViewNoteId(note.id)}>
                  <Eye className="size-4" />
                  View
                </Button>
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
                  aria-label={
                    bookmarksQuery.data?.has(note.id) ? "Remove bookmark" : "Bookmark note"
                  }
                  aria-pressed={bookmarksQuery.data?.has(note.id) ?? false}
                >
                  <Bookmark
                    className={
                      bookmarksQuery.data?.has(note.id)
                        ? "size-4 fill-primary text-primary"
                        : "size-4"
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

      <NoteViewerDialog
        note={(notesQuery.data ?? []).find((item) => item.id === viewNoteId) ?? null}
        onOpenChange={(next) => {
          if (!next) setViewNoteId(null);
        }}
        onDownload={download}
      />

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
