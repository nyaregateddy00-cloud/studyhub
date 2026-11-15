import {
  FileText,
  FileCheck2,
  FileSpreadsheet,
  Image as ImageIcon,
  UploadCloud,
  X,
  FileCode,
} from "lucide-react";
import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  extractFilesFromClipboard,
  DOCUMENT_ACCEPT_TYPES,
} from "@/lib/document-parser";

interface DocumentDropzoneProps {
  onFileSelect: (file: File) => void;
  selectedFile?: File | null;
  onClear?: () => void;
  disabled?: boolean;
  compact?: boolean;
  label?: string;
  sublabel?: string;
  className?: string;
  showPasteHelp?: boolean;
}

export function DocumentDropzone({
  onFileSelect,
  selectedFile,
  onClear,
  disabled = false,
  compact = false,
  label = "Upload document, PDF, or screenshot",
  sublabel = "Drop PDF, Word (.docx), presentation, image or paste screenshot (Ctrl+V)",
  className,
  showPasteHelp = true,
}: DocumentDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Listen for paste event on window when this dropzone is visible and not disabled
  useEffect(() => {
    if (disabled) return;

    function handlePaste(e: ClipboardEvent) {
      // Don't intercept if user is typing text into an input or textarea that already has text focus
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement;

      const files = extractFilesFromClipboard(e);
      if (files.length > 0) {
        // If image was pasted, prevent default if desirable
        e.preventDefault();
        onFileSelect(files[0]);
      }
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [disabled, onFileSelect]);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      onFileSelect(droppedFile);
    }
  }

  function getFileIcon(fileName: string) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <FileText className="size-5 text-rose-500" />;
    if (["doc", "docx"].includes(ext || ""))
      return <FileCheck2 className="size-5 text-blue-500" />;
    if (["xls", "xlsx", "csv"].includes(ext || ""))
      return <FileSpreadsheet className="size-5 text-emerald-500" />;
    if (["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext || ""))
      return <ImageIcon className="size-5 text-amber-500" />;
    return <FileCode className="size-5 text-primary" />;
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (selectedFile) {
    return (
      <div
        className={cn(
          "flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-3.5 shadow-2xs transition-all",
          className
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 rounded-xl bg-background border border-border/80 flex items-center justify-center shrink-0 shadow-2xs">
            {getFileIcon(selectedFile.name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate text-foreground">
              {selectedFile.name}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <span>{formatFileSize(selectedFile.size)}</span>
              <span>·</span>
              <span className="capitalize">
                {selectedFile.type.split("/")[1] || "Document"}
              </span>
            </p>
          </div>
        </div>

        {onClear && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg"
          >
            <X className="size-3.5 mr-1" />
            Remove
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => {
        if (!disabled) fileInputRef.current?.click();
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center",
        isDragging
          ? "border-primary bg-primary/10 scale-[1.01]"
          : "border-border/80 bg-secondary/20 hover:border-primary/50 hover:bg-secondary/40",
        disabled && "pointer-events-none opacity-50",
        compact ? "p-4" : "p-6 sm:p-8",
        className
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept={DOCUMENT_ACCEPT_TYPES}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
          e.target.value = "";
        }}
      />

      <div
        className={cn(
          "rounded-2xl bg-primary/10 text-primary flex items-center justify-center transition-transform group-hover:scale-110 shadow-2xs",
          compact ? "size-9 mb-2" : "size-12 mb-3"
        )}
      >
        <UploadCloud className={compact ? "size-5" : "size-6"} />
      </div>

      <p className="font-display font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
        {label}
      </p>

      <p className="mt-1 text-xs text-muted-foreground max-w-sm leading-relaxed">
        {sublabel}
      </p>

      {showPasteHelp && (
        <div className="mt-3 flex items-center gap-1.5 rounded-full border border-border/80 bg-background/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-2xs backdrop-blur">
          <kbd className="font-mono text-[10px] uppercase font-bold text-foreground">
            Ctrl + V
          </kbd>
          <span>to paste screenshot or file directly</span>
        </div>
      )}
    </div>
  );
}
