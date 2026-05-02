import { useRef, useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { Show } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import { useIdentifyBookCover } from "@/hooks/useApiLibrary";
import CoverPickerDialog from "@/components/cover-picker-dialog";

interface Props {
  /** Optional className applied to the button wrapper. */
  className?: string;
  /** Optional rendered label. Defaults to "Snap a cover". */
  label?: string;
  /** Optional element override (e.g. render as a big tile button). */
  variant?: "pill" | "tile";
  /** Soft size limit for the long edge before encoding to JPEG. */
  maxEdge?: number;
  /** JPEG quality for the compressed upload. */
  quality?: number;
}

/**
 * Resize a File into a base64 data URL suitable for the cover-identify
 * endpoint. Mirrors the snap-the-page helper so phone photos
 * (often 4032×3024) land comfortably under the 5MB JSON body limit.
 */
async function fileToCompressedDataUrl(
  file: File,
  maxEdge: number,
  quality: number,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unsupported");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  return new Promise<string>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Failed to encode image"));
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error ?? new Error("read fail"));
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

/**
 * "Snap a cover" — opens the phone camera (or a file picker on desktop),
 * compresses the photo, sends it to the cover-identify endpoint, and
 * opens a picker dialog of Open Library matches the user can confirm.
 */
export default function SnapCoverButton({
  className = "",
  label = "Snap a cover",
  variant = "pill",
  maxEdge = 1280,
  quality = 0.85,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<{
    title: string;
    author: string;
    confidence: number;
  } | null>(null);
  const identify = useIdentifyBookCover();
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "That doesn't look like an image",
        description: "Pick or shoot a photo of the book cover.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file, maxEdge, quality);
      const result = await identify.mutateAsync(dataUrl);
      // The endpoint already 422s on bad reads, so anything reaching here
      // has a non-empty title+author. Open the picker so the user
      // confirms which Open Library edition they want on their shelf.
      setPicker({
        title: result.title,
        author: result.author,
        confidence: result.confidence,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong.";
      toast({
        title: "Couldn't read that cover",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const tileClasses =
    "group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-400/40 bg-amber-400/5 hover:bg-amber-400/10 hover:border-amber-400/60 text-amber-200 transition-all px-6 py-8 disabled:opacity-60 disabled:cursor-not-allowed w-full";
  const pillClasses =
    "inline-flex items-center gap-2 rounded-md border border-amber-400/40 text-amber-200 hover:bg-amber-400/10 disabled:opacity-60 disabled:cursor-not-allowed h-9 px-3 text-xs font-medium transition-colors";
  const iconClass =
    variant === "tile" ? "w-7 h-7" : "w-3.5 h-3.5";

  return (
    <Show when="signed-in">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className={`${variant === "tile" ? tileClasses : pillClasses} ${className}`}
        aria-label="Snap a photo of a book cover"
      >
        {busy ? (
          <Loader2 className={`${iconClass} animate-spin`} />
        ) : (
          <BookOpen className={iconClass} />
        )}
        <span className={variant === "tile" ? "font-serif text-base font-semibold" : ""}>
          {busy ? "Reading cover…" : label}
        </span>
        {variant === "tile" && !busy && (
          <span className="text-xs text-amber-300/70 font-normal">
            Point your camera at any book
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      {picker && (
        <CoverPickerDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setPicker(null);
          }}
          guessedTitle={picker.title}
          guessedAuthor={picker.author}
          confidence={picker.confidence}
        />
      )}
    </Show>
  );
}
