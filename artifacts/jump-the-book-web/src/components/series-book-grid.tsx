import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GripVertical } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import LibraryBookTile, {
  type LibraryBookTileBook,
} from "@/components/library-book-tile";
import { apiFetch } from "@/lib/queryClient";
import type { RemoteBook } from "@/hooks/useApiLibrary";
import { useToast } from "@/hooks/use-toast";

export interface SeriesBookEntry extends LibraryBookTileBook {
  remoteId?: string;
}

interface Props {
  books: SeriesBookEntry[];
  bibleBookIds: Set<string>;
  isSignedIn: boolean;
  panelId: string;
  headingId: string;
}

// Renders the books inside a single series card with @dnd-kit-powered
// reordering that works on mouse, touch, and keyboard. Each tile gets a
// small grip handle which is the only drag activator, so taps and clicks
// on the cover still navigate normally. Touch uses a 200ms long-press so
// vertical page scrolling still works on phones and tablets.
//
// On drop we optimistically rewrite the seriesOrder field on the cached
// `["me","books"]` rows so the "#N" badges and group sort update on the next
// render, then PATCH the changed rows in parallel. If any patch fails we toast
// and re-fetch to revert to the server's truth.
export default function SeriesBookGrid({
  books,
  bibleBookIds,
  isSignedIn,
  panelId,
  headingId,
}: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reordering only makes sense for signed-in users (we need a remoteId to
  // PATCH) and when there are at least two books in the group. Demo/local
  // standalone tiles are never rendered through this component.
  const reorderable =
    isSignedIn && books.length >= 2 && books.every((b) => !!b.remoteId);

  // Mouse drags activate after a tiny movement so plain clicks on the handle
  // aren't mistaken for drags. Touch waits for a 200ms long-press with a
  // small tolerance so vertical scrolling on the page still works normally.
  // Keyboard sensor lets users tab to the handle and reorder with arrow keys.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!reorderable || !over || active.id === over.id) return;

    const fromIdx = books.findIndex((b) => b.id === active.id);
    const toIdx = books.findIndex((b) => b.id === over.id);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = arrayMove(books, fromIdx, toIdx);

    // Renumber from 1 so a series always presents a clean 1..N. We only PATCH
    // rows whose order actually changed to keep the request count minimal.
    const updates = reordered.map((b, i) => ({
      remoteId: b.remoteId!,
      newOrder: i + 1,
      oldOrder: b.seriesOrder ?? null,
    }));
    const changed = updates.filter((u) => u.oldOrder !== u.newOrder);
    if (changed.length === 0) return;

    const newOrderById = new Map(updates.map((u) => [u.remoteId, u.newOrder]));
    qc.setQueryData<RemoteBook[]>(["me", "books"], (prev) => {
      if (!prev) return prev;
      return prev.map((b) =>
        newOrderById.has(b.id)
          ? { ...b, seriesOrder: newOrderById.get(b.id)! }
          : b,
      );
    });

    setIsSaving(true);
    try {
      await Promise.all(
        changed.map((u) =>
          apiFetch(`/me/books/${u.remoteId}`, {
            method: "PATCH",
            body: JSON.stringify({ seriesOrder: u.newOrder }),
          }),
        ),
      );
      // Confirm with the server's truth without disturbing the UI mid-drag.
      qc.invalidateQueries({ queryKey: ["me", "books"] });
    } catch {
      toast({
        title: "Couldn't fully save the new order",
        description:
          "Some changes may not have gone through. Reloading the latest from the server — try again if it still looks wrong.",
      });
      // Re-fetch so the UI reflects the server's truth (which may be a partial
      // update if some PATCHes succeeded before one failed).
      qc.invalidateQueries({ queryKey: ["me", "books"] });
    } finally {
      setIsSaving(false);
    }
  };

  const grid = (
    <div
      id={panelId}
      role="region"
      aria-labelledby={headingId}
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5"
    >
      {books.map((book, i) => (
        <SortableSeriesTile
          key={book.id}
          book={book}
          index={i}
          hasBible={bibleBookIds.has(book.id)}
          showStatusBadge={isSignedIn}
          reorderable={reorderable}
          isSaving={isSaving}
          isActive={activeId === book.id}
        />
      ))}
    </div>
  );

  if (!reorderable) return grid;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={books.map((b) => b.id)}
        strategy={rectSortingStrategy}
      >
        {grid}
      </SortableContext>
    </DndContext>
  );
}

interface SortableTileProps {
  book: SeriesBookEntry;
  index: number;
  hasBible: boolean;
  showStatusBadge: boolean;
  reorderable: boolean;
  isSaving: boolean;
  isActive: boolean;
}

function SortableSeriesTile({
  book,
  index,
  hasBible,
  showStatusBadge,
  reorderable,
  isSaving,
  isActive,
}: SortableTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: book.id, disabled: !reorderable });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group rounded-xl",
        (isDragging || isActive) && "opacity-40 z-10",
        isSaving && "pointer-events-none",
      )}
    >
      <LibraryBookTile
        book={book}
        index={index}
        hasBible={hasBible}
        showStatusBadge={showStatusBadge}
      />
      {reorderable && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          onClick={(e) => {
            // The handle exists only for dragging — swallow stray clicks so
            // they don't navigate into the book.
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Drag to reorder"
          aria-label={`Drag to reorder ${book.title} within the series`}
          className="absolute top-2 right-2 z-20 inline-flex items-center justify-center w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white opacity-70 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--jtb-accent-hi)]/60 focus-visible:outline-none transition-opacity cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
