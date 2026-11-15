import { extractText } from "unpdf";
import mammoth from "mammoth";
import { createWorker } from "tesseract.js";

export type ExtractedDocument = {
  text: string;
  totalPages?: number;
  fileType: "pdf" | "docx" | "image" | "text" | "unknown";
  fileName: string;
};

/**
 * Universal text extractor for documents, PDFs, Word docs, and image screenshots.
 */
export async function extractContentFromFile(
  file: File,
  onProgress?: (message: string) => void,
): Promise<ExtractedDocument> {
  const fileName = file.name || "uploaded-file";
  const lowerName = fileName.toLowerCase();
  const mimeType = (file.type || "").toLowerCase();

  // 1. PDF
  if (lowerName.endsWith(".pdf") || mimeType === "application/pdf") {
    onProgress?.("Reading PDF pages...");
    const arrayBuffer = await file.arrayBuffer();
    const extracted = await extractText(arrayBuffer);
    const pages = Array.isArray(extracted.text)
      ? extracted.text.join("\n\n")
      : String(extracted.text ?? "");
    let text = pages.trim();

    // Fallback: If PDF has zero extracted text (scanned PDF), inform clearly
    if (!text) {
      throw new Error(
        "Could not extract readable text from this PDF. It may contain scanned images rather than selectable text. Try uploading an image/screenshot directly."
      );
    }
    return {
      text,
      totalPages: extracted.totalPages,
      fileType: "pdf",
      fileName,
    };
  }

  // 2. Word documents (.docx)
  if (
    lowerName.endsWith(".docx") ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    onProgress?.("Extracting text from Word document...");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = (result.value || "").trim();
    if (!text) {
      throw new Error("No readable text found in this Word document.");
    }
    return {
      text,
      fileType: "docx",
      fileName,
    };
  }

  // 3. Images and Screenshots (PNG, JPG, JPEG, WEBP, BMP, GIF)
  const isImage =
    mimeType.startsWith("image/") ||
    /\.(png|jpe?g|webp|bmp|gif)$/i.test(lowerName);

  if (isImage) {
    onProgress?.("Reading text from image/screenshot using OCR...");
    let worker;
    try {
      worker = await createWorker("eng");
      const ret = await worker.recognize(file);
      await worker.terminate();
      const text = (ret.data?.text || "").trim();
      if (!text) {
        throw new Error(
          "No text detected in this image. Please ensure the screenshot or picture contains clear, legible text."
        );
      }
      return {
        text,
        fileType: "image",
        fileName,
      };
    } catch (err: unknown) {
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          // ignore
        }
      }
      const msg = err instanceof Error ? err.message : "Failed to perform OCR on image.";
      throw new Error(msg);
    }
  }

  // 4. Plain text, markdown, json, csv, rtf
  onProgress?.("Reading document text...");
  const text = (await file.text()).trim();
  if (!text) {
    throw new Error("The selected file is empty.");
  }
  return {
    text,
    fileType: "text",
    fileName,
  };
}

/**
 * Helper to get clean default accept string for file inputs across the platform
 */
export const DOCUMENT_ACCEPT_TYPES =
  ".pdf,.docx,.doc,.txt,.md,.markdown,.json,.rtf,image/*,.png,.jpg,.jpeg,.webp";

/**
 * Extract files from a clipboard paste event (e.g. user pressed Ctrl+V with a screenshot)
 */
export function extractFilesFromClipboard(
  event: React.ClipboardEvent | ClipboardEvent,
): File[] {
  const items = event.clipboardData?.items;
  if (!items) return [];

  const files: File[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file) {
        // If it's a raw screenshot from clipboard without name, provide friendly name
        if (!file.name || file.name === "image.png") {
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const ext = file.type.split("/")[1] || "png";
          const namedFile = new File([file], `screenshot-${timestamp}.${ext}`, {
            type: file.type,
          });
          files.push(namedFile);
        } else {
          files.push(file);
        }
      }
    }
  }
  return files;
}
