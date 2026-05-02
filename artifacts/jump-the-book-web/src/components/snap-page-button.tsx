import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Show } from "@clerk/react";
import { apiFetch } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Props {
  /** Called with extracted text after a successful OCR. */
  onText: (text: string) => void;
  /** Optional className applied to the button wrapper. */
  className?: string;
  /** Soft size limit: we resize anything larger to fit under this on the
   *  long edge before encoding to JPEG. */
  maxEdge?: number;
  /** JPEG quality for the compressed upload. */
  quality?: number;
}

/**
 * Resize a File into a base64 data URL suitable for the OCR endpoint.
 * Constrains the long edge to ~1600px so phone photos (often 4032×3024)
 * land comfortably under our 5MB JSON body limit.
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
 * "Snap the page" — opens the phone camera (or a file picker on desktop),
 * compresses the result, and POSTs to /api/passage/ocr. The extracted
 * text is handed back via the `onText` callback so the parent can append
 * it to its passage textarea.
 */
export default function SnapPageButton({
  onText,
  className = "",
  maxEdge = 1600,
  quality = 0.85,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "That doesn't look like an image",
        description: "Pick or shoot a photo of the page.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file, maxEdge, quality);
      const r = await apiFetch<{ text: string }>("/passage/ocr", {
        method: "POST",
        body: JSON.stringify({ dataUrl }),
      });
      const text = (r.text ?? "").trim();
      if (!text) {
        toast({
          title: "No text found",
          description:
            "We couldn't read anything from that photo. Try a brighter, flatter shot.",
          variant: "destructive",
        });
      } else {
        onText(text);
        toast({
          title: "Page captured",
          description: `Pulled in ${text.length.toLocaleString()} characters.`,
        });
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong.";
      toast({
        title: "Couldn't read that page",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Show when="signed-in">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className={`inline-flex items-center gap-2 rounded-md border border-amber-400/40 text-amber-200 hover:bg-amber-400/10 disabled:opacity-60 disabled:cursor-not-allowed h-9 px-3 text-xs font-medium transition-colors ${className}`}
        aria-label="Snap a photo of the page"
      >
        {busy ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Camera className="w-3.5 h-3.5" />
        )}
        {busy ? "Reading…" : "Snap the page"}
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
    </Show>
  );
}
