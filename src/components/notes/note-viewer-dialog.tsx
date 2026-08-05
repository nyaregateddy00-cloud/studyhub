import { useEffect, useState } from "react";
import { Download, ExternalLink, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotesService } from "@/services/notes.service";

type ViewerNote = {
  id: string;
  title: string;
  content: string | null;
  course: string | null;
  unit: string | null;
  institution: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
};

function kindOf(note: ViewerNote): "image" | "pdf" | "text" | "other" | "none" {
  if (!note.file_url) return "none";
  const type = note.file_type ?? "";
  const name = (note.file_name ?? "").toLowerCase();
  if (type.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/.test(name)) return "image";
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (type.startsWith("text/") || /\.(txt|md|csv)$/.test(name)) return "text";
  return "other";
}

export function NoteViewerDialog({
  note,
  onOpenChange,
  onDownload,
}: {
  note: ViewerNote | null;
  onOpenChange: (open: boolean) => void;
  onDownload: (path: string, name: string) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [textBody, setTextBody] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kind = note ? kindOf(note) : "none";

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setTextBody(null);
    setError(null);
    if (!note?.file_url || kind === "none") return;
    setLoading(true);
    (async () => {
      try {
        const signed = await NotesService.getAttachmentUrl(note.file_url!, 600);
        if (cancelled) return;
        setUrl(signed);
        if (kind === "text") {
          const res = await fetch(signed);
          const body = await res.text();
          if (!cancelled) setTextBody(body.slice(0, 200000));
        }
      } catch {
        if (!cancelled) setError("Could not open this attachment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [note?.id, note?.file_url, kind]);

  return (
    <Dialog open={note !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[min(100vw-1.5rem,72rem)] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="pr-6 leading-snug">{note?.title}</DialogTitle>
          <DialogDescription>
            {[note?.institution, note?.course, note?.unit].filter(Boolean).join(" · ") ||
              "Uncategorised"}
          </DialogDescription>
        </DialogHeader>

        {note?.content && (
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
          </div>
        )}

        {note?.file_name && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <FileText className="size-3" />
              {note.file_name}
            </Badge>
            {url && (
              <Button variant="outline" size="sm" asChild>
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" /> Open in new tab
                </a>
              </Button>
            )}
            {note.file_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDownload(note.file_url!, note.file_name ?? "note")}
              >
                <Download className="size-4" /> Download
              </Button>
            )}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Preparing preview…
          </div>
        )}
        {error && <p className="py-6 text-center text-sm text-destructive">{error}</p>}

        {!loading && !error && url && kind === "image" && (
          <img
            src={url}
            alt={note?.file_name ?? "Note attachment"}
            className="max-h-[70vh] w-full rounded-xl border border-border object-contain"
          />
        )}
        {!loading && !error && url && kind === "pdf" && (
          <iframe
            src={url}
            title={note?.file_name ?? "Note attachment"}
            className="h-[70vh] w-full rounded-xl border border-border bg-background"
          />
        )}
        {!loading && !error && kind === "text" && textBody !== null && (
          <pre className="max-h-[70vh] overflow-auto rounded-xl border border-border bg-muted/30 p-4 text-xs whitespace-pre-wrap">
            {textBody}
          </pre>
        )}
        {!loading && !error && kind === "other" && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            This file type can&apos;t be previewed in the browser. Open it in a new tab or download
            it.
          </p>
        )}
        {!note?.content && kind === "none" && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            This note has no content or attachment yet.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
