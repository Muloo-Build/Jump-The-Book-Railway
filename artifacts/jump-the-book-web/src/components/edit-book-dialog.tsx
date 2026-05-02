import { useEffect, useState } from "react";
import { Loader2, Pencil, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useClaimOrphanScenes,
  usePatchRemoteBook,
  type RemoteBook,
} from "@/hooks/useApiLibrary";

type Mode =
  | { kind: "edit"; book: RemoteBook }
  | {
      kind: "claim-orphan";
      orphanUserBookId: string;
      sceneCount: number;
    };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  onSaved?: (book: RemoteBook) => void;
}

export default function EditBookDialog({
  open,
  onOpenChange,
  mode,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const patch = usePatchRemoteBook();
  const claim = useClaimOrphanScenes();

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [tagline, setTagline] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [totalChapters, setTotalChapters] = useState("");

  // Seed form whenever the dialog opens with new data so reopening on a
  // different book doesn't carry stale values across. We depend ONLY on
  // stable identifiers (kind + the row id), never on `mode` itself —
  // callers pass fresh inline object literals every render, so depending
  // on `mode` would wipe in-progress edits the moment the parent re-renders.
  const modeKey =
    mode.kind === "edit" ? `edit:${mode.book.id}` : `claim:${mode.orphanUserBookId}`;
  useEffect(() => {
    if (!open) return;
    if (mode.kind === "edit") {
      setTitle(mode.book.title);
      setAuthor(mode.book.author);
      setTagline(mode.book.tagline ?? "");
      setHeroImage(mode.book.heroImage ?? "");
      setTotalChapters(
        mode.book.totalChapters != null ? String(mode.book.totalChapters) : "",
      );
    } else {
      setTitle("");
      setAuthor("");
      setTagline("");
      setHeroImage("");
      setTotalChapters("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, modeKey]);

  const isClaim = mode.kind === "claim-orphan";
  const pending = patch.isPending || claim.isPending;
  const canSave = title.trim().length > 0 && author.trim().length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || pending) return;
    try {
      const trimmedTotal = totalChapters.trim();
      const totalChaptersValue =
        trimmedTotal === "" ? null : Number.parseInt(trimmedTotal, 10);
      if (
        totalChaptersValue !== null &&
        (!Number.isFinite(totalChaptersValue) || totalChaptersValue < 0)
      ) {
        toast({
          title: "Invalid chapter count",
          description: "Total chapters must be a positive whole number.",
          variant: "destructive",
        });
        return;
      }

      if (mode.kind === "edit") {
        const body: Record<string, unknown> = {
          title: title.trim(),
          author: author.trim(),
          tagline: tagline.trim() || null,
          heroImage: heroImage.trim() || null,
        };
        if (totalChaptersValue !== null) body.totalChapters = totalChaptersValue;
        const updated = await patch.mutateAsync({
          id: mode.book.id,
          ...body,
        });
        toast({
          title: "Book updated",
          description: `“${updated.title}” saved.`,
        });
        onSaved?.(updated);
      } else {
        const result = await claim.mutateAsync({
          userBookId: mode.orphanUserBookId,
          title: title.trim(),
          author: author.trim(),
          tagline: tagline.trim() || null,
          heroImage: heroImage.trim() || null,
        });
        toast({
          title: "Book recovered",
          description: `${result.movedSceneCount} ${result.movedSceneCount === 1 ? "scene" : "scenes"} moved into “${result.book.title}”.`,
        });
        onSaved?.(result.book);
      }
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Couldn't save",
        description:
          err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            {isClaim ? (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                Recover this book
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4 text-amber-300" />
                Edit book details
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isClaim
              ? `These ${mode.kind === "claim-orphan" ? mode.sceneCount : ""} scenes lost their book. Tell us what they belong to and we'll put it back on your shelf.`
              : "Fix the title, author, or cover when something looks off."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-book-title">Title</Label>
            <Input
              id="edit-book-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The Name of the Wind"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-book-author">Author</Label>
            <Input
              id="edit-book-author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g. Patrick Rothfuss"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-book-tagline">
              Tagline{" "}
              <span className="text-muted-foreground/70 text-xs">
                (optional)
              </span>
            </Label>
            <Textarea
              id="edit-book-tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="A short one-liner shown on the book page."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-book-chapters">
                Total chapters{" "}
                <span className="text-muted-foreground/70 text-xs">
                  (optional)
                </span>
              </Label>
              <Input
                id="edit-book-chapters"
                type="number"
                min={0}
                value={totalChapters}
                onChange={(e) => setTotalChapters(e.target.value)}
                placeholder="—"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-book-cover">
                Cover URL{" "}
                <span className="text-muted-foreground/70 text-xs">
                  (optional)
                </span>
              </Label>
              <Input
                id="edit-book-cover"
                type="url"
                value={heroImage}
                onChange={(e) => setHeroImage(e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSave || pending}
              className="bg-amber-400 text-black hover:bg-amber-300"
            >
              {pending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : isClaim ? (
                "Recover book"
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
