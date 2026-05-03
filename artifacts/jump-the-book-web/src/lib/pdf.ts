import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface ParsedPdf {
  title: string;
  author: string;
  chapters: { title: string; text: string }[];
}

const CHAPTER_HEADING = /^\s*(chapter|prologue|epilogue|part|book)\s+[ivxlcdm0-9]+/i;
// Allow full-novel coverage so mid-book readers get useful context.
const MAX_CHAPTERS = 200;
const MAX_CHARS_PER_CHAPTER = 12000;
const MIN_TOTAL_TEXT_CHARS = 400;
const FALLBACK_CHUNK_SIZE = 12000;
const FALLBACK_MAX_CHUNKS = 100;

function cleanText(s: string): string {
  return s
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function splitIntoChapters(pages: string[]): { title: string; text: string }[] {
  const chapters: { title: string; text: string }[] = [];
  let current: { title: string; lines: string[] } | null = null;

  for (const page of pages) {
    const lines = page.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (CHAPTER_HEADING.test(line) && line.length < 80) {
        if (current && current.lines.join(" ").length > 200) {
          chapters.push({
            title: current.title,
            text: cleanText(current.lines.join(" ")).slice(0, MAX_CHARS_PER_CHAPTER),
          });
        }
        current = { title: line, lines: [] };
        if (chapters.length >= MAX_CHAPTERS) return chapters;
      } else if (current) {
        current.lines.push(line);
      } else {
        current = { title: `Chapter 1`, lines: [line] };
      }
    }
  }
  if (current && current.lines.join(" ").length > 200 && chapters.length < MAX_CHAPTERS) {
    chapters.push({
      title: current.title,
      text: cleanText(current.lines.join(" ")).slice(0, MAX_CHARS_PER_CHAPTER),
    });
  }
  return chapters;
}

function fallbackByLength(pages: string[]): { title: string; text: string }[] {
  const all = cleanText(pages.join(" "));
  if (all.length < 200) return [];
  const chapters: { title: string; text: string }[] = [];
  for (
    let i = 0;
    i < all.length && chapters.length < FALLBACK_MAX_CHUNKS;
    i += FALLBACK_CHUNK_SIZE
  ) {
    chapters.push({
      title: `Chapter ${chapters.length + 1}`,
      text: all.slice(i, i + FALLBACK_CHUNK_SIZE),
    });
  }
  return chapters;
}

export async function parsePdfFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
  fallbackName = "Untitled",
): Promise<ParsedPdf> {
  const data = new Uint8Array(arrayBuffer);
  const loadingTask = pdfjsLib.getDocument({ data });
  let pdf: Awaited<typeof loadingTask.promise> | null = null;

  try {
    pdf = await loadingTask.promise;

    let title = fallbackName.replace(/\.pdf$/i, "");
    let author = "";
    try {
      const meta = await pdf.getMetadata();
      const info = (meta.info ?? {}) as { Title?: string; Author?: string };
      if (info.Title && info.Title.trim()) title = info.Title.trim();
      if (info.Author && info.Author.trim()) author = info.Author.trim();
    } catch {
      // metadata is optional
    }

    const pages: string[] = [];
    const pageLimit = Math.min(pdf.numPages, 1500);
    let totalChars = 0;

    for (let pageNum = 1; pageNum <= pageLimit; pageNum++) {
      const page = await pdf.getPage(pageNum);
      try {
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => ("str" in item ? (item as { str: string }).str : ""))
          .join(" ");
        pages.push(pageText);
        totalChars += pageText.length;
      } finally {
        page.cleanup();
      }
      if (pageNum % 25 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    if (totalChars < MIN_TOTAL_TEXT_CHARS) {
      throw new Error(
        "This PDF doesn't contain readable text — it may be scanned or image-only. Try an EPUB or a text-based PDF.",
      );
    }

    let chapters = splitIntoChapters(pages);
    if (chapters.length === 0) {
      chapters = fallbackByLength(pages);
    }
    if (chapters.length === 0) {
      throw new Error(
        "We couldn't extract any chapters from this PDF. Try an EPUB or a different file.",
      );
    }

    return { title, author, chapters };
  } finally {
    try {
      pdf?.cleanup();
    } catch {
      // ignore
    }
    try {
      await loadingTask.destroy();
    } catch {
      // ignore
    }
  }
}
