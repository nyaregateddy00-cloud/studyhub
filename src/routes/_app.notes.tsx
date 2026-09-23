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
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
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
import { useUsageGate } from "@/hooks/use-subscription";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { NoteViewerDialog } from "@/components/notes/note-viewer-dialog";
import {
  AcademicPicker,
  emptyAcademicSelection,
  type AcademicSelection,
} from "@/components/academic/academic-picker";
import { EmptyState } from "@/components/dashboard/primitives";
import { RESOURCE_TYPE_CLASSES } from "@/lib/design-tokens";
import { useAuth } from "@/lib/auth";
import { NotesService } from "@/services/notes.service";
import { RESOURCE_TYPES, resourceTypeLabel } from "@/services/academic.service";

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
  const downloadGate = useUsageGate("download");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "mine" | "shared" | "saved">("all");
  const [academic, setAcademic] = useState<AcademicSelection>(emptyAcademicSelection);
  const [filterAcademic, setFilterAcademic] = useState<AcademicSelection>(emptyAcademicSelection);
  const [filterType, setFilterType] = useState<string>("all");
  const [form, setForm] = useState({
    title: "",
    institution: "",
    course: "",
    unit: "",
    content: "",
    isPublic: false,
    resourceType: "lecture_notes",
    yearOfStudy: "",
    semester: "",
    unitCode: "",
    lecturer: "",
    academicYear: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [reportNoteId, setReportNoteId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [viewNoteId, setViewNoteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(selectedFile: File) {
    setFile(selectedFile);
    if (!form.title.trim()) {
      const cleanName = selectedFile.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .trim();
      setForm((prev) => ({ ...prev, title: cleanName.slice(0, 140) }));
    }
  }

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
        university_id: academic.universityId,
        faculty_id: academic.facultyId,
        programme_id: academic.programmeId,
        unit_id: academic.unitId,
        resource_type: form.resourceType,
        year_of_study: form.yearOfStudy ? Number(form.yearOfStudy) : null,
        semester: form.semester ? Number(form.semester) : null,
        unit_code: form.unitCode.trim() || null,
        lecturer: form.lecturer.trim().slice(0, 120) || null,
        academic_year: form.academicYear.trim().slice(0, 20) || null,
        file,
      });
    },
    onSuccess: () => {
      toast.success("Note saved");
      setOpen(false);
      setFile(null);
      setAcademic(emptyAcademicSelection);
      setForm({
        title: "",
        institution: "",
        course: "",
        unit: "",
        content: "",
        isPublic: false,
        resourceType: "lecture_notes",
        yearOfStudy: "",
        semester: "",
        unitCode: "",
        lecturer: "",
        academicYear: "",
      });
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

  async function download(path: string, name: string, noteId?: string) {
    if (!downloadGate.allowed) {
      toast.error(
        `Free plan limit reached (${downloadGate.limit} downloads a day). Upgrade to Premium for unlimited downloads.`,
      );
      return;
    }
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
    if (noteId && user) {
      try {
        await NotesService.recordDownload(noteId, user.id);
        void queryClient.invalidateQueries({ queryKey: ["notes"] });
      } catch {
        // Download already succeeded; a missing record only affects points.
      }
    }
    await downloadGate.consume();
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
        ? [note.title, note.course, note.unit, note.institution, note.topic, note.unit_code, note.lecturer]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term))
        : true,
    )
    .filter((note) => (filterType === "all" ? true : note.resource_type === filterType))
    .filter((note) => {
      if (filterAcademic.universityId && note.university_id !== filterAcademic.universityId)
        return false;
      if (filterAcademic.facultyId && note.faculty_id !== filterAcademic.facultyId) return false;
      if (filterAcademic.programmeId && note.programme_id !== filterAcademic.programmeId)
        return false;
      if (filterAcademic.unitId && note.unit_id !== filterAcademic.unitId) return false;
      return true;
    })
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
              <Button className="gap-2 rounded-2xl shadow-sm bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-primary-foreground font-semibold active:scale-[0.98] transition-all">
                <Upload className="size-4" />
                <span>Upload note</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Upload className="size-5 text-primary" />
                  Upload & Add Note
                </DialogTitle>
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

                <div className="space-y-3 rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">Course details (optional)</p>
                  <div className="space-y-1.5">
                    <Label>Resource type</Label>
                    <Select
                      value={form.resourceType}
                      onValueChange={(value) => setForm({ ...form, resourceType: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESOURCE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <AcademicPicker value={academic} onChange={setAcademic} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="yearOfStudy">Year of study</Label>
                      <Input
                        id="yearOfStudy"
                        type="number"
                        min={1}
                        max={6}
                        value={form.yearOfStudy}
                        onChange={(event) => setForm({ ...form, yearOfStudy: event.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="semester">Semester</Label>
                      <Input
                        id="semester"
                        type="number"
                        min={1}
                        max={3}
                        value={form.semester}
                        onChange={(event) => setForm({ ...form, semester: event.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="unitCode">Unit code</Label>
                      <Input
                        id="unitCode"
                        maxLength={30}
                        placeholder="ICS 2101"
                        value={form.unitCode}
                        onChange={(event) => setForm({ ...form, unitCode: event.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lecturer">Lecturer</Label>
                      <Input
                        id="lecturer"
                        maxLength={120}
                        value={form.lecturer}
                        onChange={(event) => setForm({ ...form, lecturer: event.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="academicYear">Academic year</Label>
                      <Input
                        id="academicYear"
                        maxLength={20}
                        placeholder="2025/2026"
                        value={form.academicYear}
                        onChange={(event) => setForm({ ...form, academicYear: event.target.value })}
                      />
                    </div>
                  </div>
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
                  <Label>Attach file (PDF, DOCX, PPTX, slides, images)</Label>
                  {file ? (
                    <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Paperclip className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => setFile(null)}
                      >
                        <X className="size-3.5 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 p-5 text-center hover:border-primary/50 hover:bg-muted/40 transition-colors cursor-pointer group"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const dropped = e.dataTransfer.files?.[0];
                        if (dropped) handleFileSelect(dropped);
                      }}
                    >
                      <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1.5 group-hover:scale-105 transition-transform">
                        <Upload className="size-4" />
                      </div>
                      <p className="text-xs font-medium">Click to browse or drag & drop</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">PDF, DOCX, PPTX, TXT, MD or images</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="sr-only"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,image/*"
                        onChange={(event) => {
                          const selected = event.target.files?.[0];
                          if (selected) handleFileSelect(selected);
                        }}
                      />
                    </div>
                  )}
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
            placeholder="Search by title, unit code or lecturer"
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

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <AcademicPicker value={filterAcademic} onChange={setFilterAcademic} compact />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Any resource type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any resource type</SelectItem>
            {RESOURCE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {notesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={term || filter !== "all" ? "No notes found" : "No notes yet"}
          description={
            term || filter !== "all"
              ? "Try adjusting your search query or academic filters."
              : "Upload PDFs, lecture slides or write rich notes to build your library."
          }
          action={
            !term && filter === "all" ? (
              <Button className="rounded-xl shadow-xs gap-2" onClick={() => setOpen(true)}>
                <Upload className="size-4" />
                Upload your first note
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => {
            const typeClass =
              RESOURCE_TYPE_CLASSES[note.resource_type ?? "lecture_notes"] ??
              "bg-primary/10 text-primary border-primary/20";
            return (
              <article
                key={note.id}
                className="group relative flex flex-col rounded-3xl border border-border/80 bg-gradient-to-b from-card to-card/60 p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${typeClass}`}
                  >
                    {resourceTypeLabel(note.resource_type)}
                  </span>
                  {note.is_public && (
                    <Badge variant="secondary" className="shrink-0 gap-1 text-[11px] bg-secondary/80 font-medium">
                      <Globe className="size-3 text-primary" /> Shared
                    </Badge>
                  )}
                </div>

                <button
                  type="button"
                  className="mt-3 text-left font-display font-semibold text-base leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary"
                  onClick={() => setViewNoteId(note.id)}
                >
                  {note.title}
                </button>

                <p className="mt-1 text-xs text-muted-foreground font-medium">
                  {[note.unit_code, note.course, note.unit].filter(Boolean).join(" · ") || "General"}
                </p>

                {note.content && (
                  <p className="mt-3 line-clamp-3 text-xs text-muted-foreground leading-relaxed">
                    {note.content}
                  </p>
                )}

                {note.file_name && (
                  <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground">
                    <Paperclip className="size-3.5 shrink-0 text-primary" />
                    <span className="truncate font-medium">{note.file_name}</span>
                  </div>
                )}

                <div className="mt-auto flex items-center gap-1 border-t border-border/70 pt-3 mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-lg text-xs font-semibold hover:bg-primary/10 hover:text-primary"
                    onClick={() => setViewNoteId(note.id)}
                  >
                    <Eye className="mr-1 size-3.5" />
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-lg text-xs gap-1 hover:bg-primary/10"
                    onClick={() => toggleLike.mutate(note.id)}
                    aria-label={likesQuery.data?.has(note.id) ? "Unlike note" : "Like note"}
                    aria-pressed={likesQuery.data?.has(note.id) ?? false}
                  >
                    <Heart
                      className={
                        likesQuery.data?.has(note.id)
                          ? "size-3.5 fill-rose-500 text-rose-500"
                          : "size-3.5 text-muted-foreground"
                      }
                    />
                    <span className="font-medium text-xs">{note.like_count}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-8 rounded-lg hover:bg-primary/10"
                    onClick={() => toggleBookmark.mutate(note.id)}
                    aria-label={
                      bookmarksQuery.data?.has(note.id) ? "Remove bookmark" : "Bookmark note"
                    }
                    aria-pressed={bookmarksQuery.data?.has(note.id) ?? false}
                  >
                    <Bookmark
                      className={
                        bookmarksQuery.data?.has(note.id)
                          ? "size-3.5 fill-primary text-primary"
                          : "size-3.5 text-muted-foreground"
                      }
                    />
                  </Button>
                  {note.file_url && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="ml-auto size-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                      onClick={() => download(note.file_url!, note.file_name ?? "note", note.id)}
                      aria-label="Download attachment"
                    >
                      <Download className="size-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className={note.file_url ? "size-8 rounded-lg text-muted-foreground/60 hover:text-destructive" : "ml-auto size-8 rounded-lg text-muted-foreground/60 hover:text-destructive"}
                    onClick={() => {
                      setReportReason("");
                      setReportNoteId(note.id);
                    }}
                    aria-label="Report note"
                  >
                    <Flag className="size-3.5" />
                  </Button>
                </div>
              </article>
            );
          })}
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
