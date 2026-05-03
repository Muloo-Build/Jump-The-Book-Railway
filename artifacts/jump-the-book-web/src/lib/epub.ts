import JSZip from "jszip";

export interface ParsedEpub {
  title: string;
  author: string;
  chapters: { title: string; text: string }[];
}

// Hard ceilings to keep memory/upload sane while still covering full novels.
// Most novels are 30–60 chapters; 200 covers anything reasonable.
const MAX_CHAPTERS = 200;
// Per-chapter excerpt length passed to the AI. 12k chars ≈ ~3000 tokens —
// enough to ground the model in late-book chapters without blowing the
// context budget when we slice this further server-side.
const MAX_CHARS_PER_CHAPTER = 12000;

/**
 * Parse an EPUB ArrayBuffer (works in browsers via JSZip).
 * Extracts title, author, and chapter excerpts for the whole book so readers
 * mid-novel get useful context (not just the first 10 chapters).
 */
export async function parseEpubFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
  fallbackName = "Untitled",
): Promise<ParsedEpub> {
  const zip = await JSZip.loadAsync(arrayBuffer);

  let title = fallbackName.replace(/\.epub$/i, "");
  let author = "";
  const opfFile = Object.values(zip.files).find(
    (f) => f.name.endsWith(".opf") || f.name.endsWith("content.opf"),
  );
  if (opfFile) {
    const opfText = await opfFile.async("string");
    const titleMatch = opfText.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
    if (titleMatch) title = titleMatch[1].trim();
    const authorMatch = opfText.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
    if (authorMatch) author = authorMatch[1].trim();
  }

  const htmlFiles = Object.values(zip.files)
    .filter(
      (f) =>
        !f.dir &&
        (f.name.endsWith(".html") ||
          f.name.endsWith(".xhtml") ||
          f.name.endsWith(".htm")) &&
        !/toc|nav|cover|copyright|title|index/i.test(f.name),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const chapters: { title: string; text: string }[] = [];
  const limit = Math.min(htmlFiles.length, MAX_CHAPTERS);
  for (let i = 0; i < limit; i++) {
    const raw = await htmlFiles[i].async("string");
    const titleMatch = raw.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/i);
    const chTitle = titleMatch ? titleMatch[1].trim() : `Chapter ${chapters.length + 1}`;
    const stripped = raw
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (stripped.length > 200) {
      chapters.push({ title: chTitle, text: stripped.slice(0, MAX_CHARS_PER_CHAPTER) });
    }
    // Yield to the event loop every 10 chapters so the UI stays responsive
    // when parsing large novels.
    if (i > 0 && i % 10 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  return { title, author, chapters };
}
