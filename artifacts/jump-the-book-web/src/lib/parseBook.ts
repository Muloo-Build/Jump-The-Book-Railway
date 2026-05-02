import { parseEpubFromArrayBuffer } from "@/lib/epub";
import { parsePdfFromArrayBuffer } from "@/lib/pdf";

export interface ParsedBook {
  title: string;
  author: string;
  chapters: { title: string; text: string }[];
  format: "EPUB" | "PDF" | "Text";
}

export const ACCEPTED_EXTENSIONS =
  ".epub,.pdf,.txt,application/epub+zip,application/pdf,text/plain";
export const ACCEPTED_LABEL = "EPUB, PDF, or TXT";

function detectFormat(file: File): "epub" | "pdf" | "txt" | null {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".epub")) return "epub";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".txt")) return "txt";
  const mime = (file.type || "").toLowerCase();
  if (mime === "application/epub+zip") return "epub";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("text/")) return "txt";
  return null;
}

async function parseTxtFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
  fallbackName: string,
): Promise<ParsedBook> {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer);
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  const title = fallbackName.replace(/\.txt$/i, "");

  const headingRe = /^\s*(chapter|prologue|epilogue|part|book)\s+[ivxlcdm0-9]+.*$/gim;
  const matches = [...cleaned.matchAll(headingRe)];
  const chapters: { title: string; text: string }[] = [];

  if (matches.length >= 2) {
    for (let i = 0; i < matches.length && chapters.length < 20; i++) {
      const m = matches[i];
      const start = m.index ?? 0;
      const end = i + 1 < matches.length ? (matches[i + 1].index ?? cleaned.length) : cleaned.length;
      const body = cleaned.slice(start + m[0].length, end).trim().slice(0, 4000);
      if (body.length > 200) {
        chapters.push({ title: m[0].trim(), text: body });
      }
    }
  }
  if (chapters.length === 0) {
    const chunkSize = 4000;
    for (let i = 0; i < cleaned.length && chapters.length < 10; i += chunkSize) {
      chapters.push({
        title: `Chapter ${chapters.length + 1}`,
        text: cleaned.slice(i, i + chunkSize),
      });
    }
  }

  return { title, author: "", chapters, format: "Text" };
}

export async function parseBookFile(file: File): Promise<ParsedBook> {
  const fmt = detectFormat(file);
  if (!fmt) {
    throw new Error(`Unsupported file type. Please upload an EPUB, PDF, or TXT file.`);
  }
  const buffer = await file.arrayBuffer();
  if (fmt === "epub") {
    const r = await parseEpubFromArrayBuffer(buffer, file.name);
    return { ...r, format: "EPUB" };
  }
  if (fmt === "pdf") {
    const r = await parsePdfFromArrayBuffer(buffer, file.name);
    return { ...r, format: "PDF" };
  }
  return parseTxtFromArrayBuffer(buffer, file.name);
}
