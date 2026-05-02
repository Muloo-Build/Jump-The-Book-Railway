import JSZip from "jszip";

export interface ParsedEpub {
  title: string;
  author: string;
  chapters: { title: string; text: string }[];
}

/**
 * Parse an EPUB ArrayBuffer (works in browsers via JSZip).
 * Extracts title, author, and up to 10 chapter excerpts (4000 chars each).
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
  for (let i = 0; i < Math.min(htmlFiles.length, 10); i++) {
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
      chapters.push({ title: chTitle, text: stripped.slice(0, 4000) });
    }
  }
  return { title, author, chapters };
}
