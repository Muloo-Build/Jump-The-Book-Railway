import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  ImageIcon,
  PlayCircle,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import type { RemoteScene } from "@/hooks/useApiLibrary";

interface BookRef {
  displayId: string;
  title: string;
}

interface Props {
  scenes: RemoteScene[];
  bookIdMap: Map<string, BookRef>;
}

interface BookGroup {
  bookId: string;
  bookRef: BookRef | undefined;
  scenes: RemoteScene[];
  latestCreatedAt: string;
}

const RECENT_LIMIT = 6;

/**
 * Scalable scene library: search bar, "recently generated" rail, then
 * collapsible per-book sections. Designed to stay legible at 200+ books and
 * thousands of scenes.
 */
export default function SceneLibrary({ scenes, bookIdMap }: Props) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Filter
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return scenes;
    return scenes.filter((s) => {
      const ref = bookIdMap.get(s.userBookId);
      return (
        s.title.toLowerCase().includes(q) ||
        (s.location ?? "").toLowerCase().includes(q) ||
        (s.mood ?? "").toLowerCase().includes(q) ||
        (s.characters ?? []).some((c) => c.toLowerCase().includes(q)) ||
        (ref?.title ?? "").toLowerCase().includes(q)
      );
    });
  }, [scenes, bookIdMap, q]);

  // Group by book
  const groups: BookGroup[] = useMemo(() => {
    const map = new Map<string, RemoteScene[]>();
    for (const s of filtered) {
      const arr = map.get(s.userBookId) ?? [];
      arr.push(s);
      map.set(s.userBookId, arr);
    }
    const result: BookGroup[] = [];
    for (const [bookId, list] of map.entries()) {
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      result.push({
        bookId,
        bookRef: bookIdMap.get(bookId),
        scenes: list,
        latestCreatedAt: list[0]!.createdAt,
      });
    }
    result.sort(
      (a, b) =>
        new Date(b.latestCreatedAt).getTime() -
        new Date(a.latestCreatedAt).getTime(),
    );
    return result;
  }, [filtered, bookIdMap]);

  const recent = useMemo(
    () =>
      [...filtered]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, RECENT_LIMIT),
    [filtered],
  );

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (scenes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/50 p-12 text-center flex flex-col items-center">
        <ImageIcon className="w-8 h-8 text-muted-foreground mb-3" />
        <p className="text-muted-foreground mb-1">No scenes saved yet.</p>
        <p className="text-sm text-muted-foreground/70">
          Open a book and visualize a chapter — scenes save automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search scenes by title, location, character…"
          className="pl-9"
          autoComplete="off"
        />
      </div>

      {q && filtered.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-8">
          No scenes match "{query}".
        </div>
      )}

      {/* Recent rail */}
      {!q && recent.length > 0 && groups.length > 1 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
            <Clock className="w-3.5 h-3.5" />
            Recently generated
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {recent.map((scene) => (
              <SceneTile
                key={`recent-${scene.id}`}
                scene={scene}
                bookRef={bookIdMap.get(scene.userBookId)}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {/* Per-book groups */}
      <div className="space-y-6">
        {groups.map((group) => {
          const isCollapsed = collapsed.has(group.bookId);
          const ref = group.bookRef;
          const bookLink = ref ? `/book/${ref.displayId}` : "/library";
          // Group by chapter inside the book
          const byChapter = new Map<number, RemoteScene[]>();
          for (const s of group.scenes) {
            const arr = byChapter.get(s.chapterNumber) ?? [];
            arr.push(s);
            byChapter.set(s.chapterNumber, arr);
          }
          const chapters = [...byChapter.entries()].sort((a, b) => b[0] - a[0]);

          return (
            <section
              key={group.bookId}
              className="rounded-2xl border border-border/40 bg-card/30 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggle(group.bookId)}
                className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <h3 className="font-serif text-lg font-semibold truncate">
                    {ref?.title ?? "Unknown book"}
                  </h3>
                  <span className="text-xs text-muted-foreground shrink-0">
                    · {group.scenes.length}{" "}
                    {group.scenes.length === 1 ? "scene" : "scenes"} ·{" "}
                    {chapters.length} ch
                  </span>
                </div>
                {ref && (
                  <Link
                    href={bookLink}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-amber-300/80 hover:text-amber-300 shrink-0"
                  >
                    Open →
                  </Link>
                )}
              </button>

              {!isCollapsed && (
                <div className="px-5 pb-5 space-y-5">
                  {chapters.map(([chapterNumber, chScenes]) => {
                    chScenes.sort((a, b) => a.sceneIndex - b.sceneIndex);
                    return (
                      <div key={chapterNumber} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground/80 font-medium">
                            Chapter {chapterNumber}
                          </p>
                          {ref && (
                            <Link
                              href={`/playback/${ref.displayId}?chapter=${chapterNumber}`}
                              className="text-xs text-amber-300/80 hover:text-amber-300 inline-flex items-center gap-1"
                            >
                              <PlayCircle className="w-3 h-3" />
                              Play trailer
                            </Link>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          {chScenes.map((scene) => (
                            <SceneTile
                              key={scene.id}
                              scene={scene}
                              bookRef={ref}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function SceneTile({
  scene,
  bookRef,
  compact = false,
}: {
  scene: RemoteScene;
  bookRef: BookRef | undefined;
  compact?: boolean;
}) {
  const link = bookRef
    ? `/experience/${bookRef.displayId}?chapter=${scene.chapterNumber}`
    : "/library";
  const grad = scene.gradientColors;
  const bg =
    grad.length >= 2
      ? `linear-gradient(135deg, ${grad[0]}, ${grad[grad.length - 1]})`
      : `linear-gradient(135deg, #2a1a4e, #1a1a2e)`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Link href={link}>
        <div
          className="group relative aspect-square overflow-hidden rounded-xl cursor-pointer border border-white/5 hover:border-amber-400/40 transition-all"
          style={{ background: bg }}
        >
          {scene.imageUrl && (
            <img
              src={scene.imageUrl}
              alt={scene.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <div
            className={`absolute bottom-0 left-0 right-0 ${
              compact ? "p-2 space-y-0.5" : "p-3 space-y-1"
            }`}
          >
            {compact && bookRef && (
              <p className="text-[9px] text-amber-300/90 font-medium uppercase tracking-wider line-clamp-1">
                {bookRef.title} · Ch {scene.chapterNumber}
              </p>
            )}
            {!compact && bookRef && (
              <p className="text-[10px] text-amber-300/90 font-medium uppercase tracking-wider">
                Ch {scene.chapterNumber}
              </p>
            )}
            <p
              className={`text-white font-serif font-semibold line-clamp-2 leading-tight ${
                compact ? "text-xs" : "text-sm"
              }`}
            >
              {scene.title}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
