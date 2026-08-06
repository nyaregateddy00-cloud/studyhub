import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  Moon,
  Sun,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
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

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;

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
  const [zoom, setZoom] = useState(1);
  const [darkReader, setDarkReader] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  const kind = note ? kindOf(note) : "none";

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setTextBody(null);
    setError(null);
    setZoom(1);
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

  const zoomBy = useCallback((delta: number) => {
    setZoom((current) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number((current + delta).toFixed(2)))));
  }, []);

  const zoomable = kind === "image" || kind === "text";
  const hasDocument = kind !== "none";

  return (
    <Dialog open={note !== null} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[94vh] flex-col gap-0 overflow-hidden p-0",
          expanded
            ? "h-[94vh] w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-3rem)]"
            : "w-[min(100vw-1.5rem,74rem)] sm:max-w-6xl",
        )}
      >
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="pr-8 text-base leading-snug sm:text-lg">{note?.title}</DialogTitle>
          <DialogDescription>
            {[note?.institution, note?.course, note?.unit].filter(Boolean).join(" · ") ||
              "Uncategorised"}
          </DialogDescription>
        </DialogHeader>

        {/* Reader toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/40 px-3 py-2">
          {note?.file_name && (
            <Badge variant="secondary" className="mr-1 hidden max-w-[16rem] gap-1 truncate sm:flex">
              <FileText className="size-3 shrink-0" />
              <span className="truncate">{note.file_name}</span>
            </Badge>
          )}

          {zoomable && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Zoom out"
                onClick={() => zoomBy(-ZOOM_STEP)}
                disabled={zoom <= ZOOM_MIN}
              >
                <ZoomOut className="size-4" />
              </Button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="min-w-12 rounded-md px-1.5 py-1 text-xs font-medium tabular-nums text-muted-foreground hover:bg-background"
                aria-label="Reset zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Zoom in"
                onClick={() => zoomBy(ZOOM_STEP)}
                disabled={zoom >= ZOOM_MAX}
              >
                <ZoomIn className="size-4" />
              </Button>
            </>
          )}

          {hasDocument && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={darkReader ? "Light reading surface" : "Dark reading surface"}
              aria-pressed={darkReader}
              onClick={() => setDarkReader((value) => !value)}
            >
              {darkReader ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={expanded ? "Exit full width" : "Full width"}
            aria-pressed={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>

          <div className="ml-auto flex items-center gap-1.5">
            {url && (
              <Button variant="outline" size="sm" asChild>
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" /> Open
                </a>
              </Button>
            )}
            {note?.file_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDownload(note.file_url!, note.file_name ?? "note")}
              >
                <Download className="size-4" /> Download
              </Button>
            )}
          </div>
        </div>

        {/* Reading surface */}
        <div
          ref={surfaceRef}
          className={cn(
            "flex-1 overflow-auto px-4 py-5 sm:px-6",
            darkReader ? "bg-slate-950" : "bg-muted/20",
          )}
        >
          {note?.content && (
            <div
              className={cn(
                "mx-auto mb-5 max-w-3xl rounded-xl border p-4 shadow-sm",
                darkReader
                  ? "border-slate-800 bg-slate-900 text-slate-100"
                  : "border-border bg-background",
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Preparing preview…
            </div>
          )}
          {error && <p className="py-10 text-center text-sm text-destructive">{error}</p>}

          {!loading && !error && url && kind === "image" && (
            <div className="flex justify-center">
              <img
                src={url}
                alt={note?.file_name ?? "Note attachment"}
                style={{ width: `${zoom * 100}%` }}
                className="max-w-none rounded-xl border border-border bg-background object-contain shadow-sm"
              />
            </div>
          )}

          {!loading && !error && url && kind === "pdf" && (
            <iframe
              src={`${url}#view=FitH`}
              title={note?.file_name ?? "Note attachment"}
              className={cn(
                "w-full rounded-xl border border-border bg-background shadow-sm",
                expanded ? "h-[calc(94vh-13rem)]" : "h-[70vh]",
              )}
            />
          )}

          {!loading && !error && kind === "text" && textBody !== null && (
            <pre
              style={{ fontSize: `${zoom * 0.8125}rem` }}
              className={cn(
                "mx-auto max-w-4xl overflow-auto rounded-xl border p-5 leading-relaxed whitespace-pre-wrap shadow-sm",
                darkReader
                  ? "border-slate-800 bg-slate-900 text-slate-100"
                  : "border-border bg-background",
              )}
            >
              {textBody}
            </pre>
          )}

          {!loading && !error && kind === "other" && (
            <p className="mx-auto max-w-md rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              This file type can&apos;t be previewed in the browser. Open it in a new tab or
              download it.
            </p>
          )}

          {!note?.content && kind === "none" && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              This note has no content or attachment yet.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
