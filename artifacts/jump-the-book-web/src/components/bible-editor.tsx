import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import type {
  BibleDraft,
  CharacterProfile,
  NamedEntity,
} from "@/hooks/useBookBible";

const FOCUS_OPTIONS = [
  "Character visuals",
  "Environments / worldbuilding",
  "Action atmosphere",
  "Tech / ships / gear",
  "Emotional mood",
  "Creature / alien design",
];

interface BibleEditorValue {
  draft: BibleDraft;
  userNotes: string;
  focusAreas: string[];
  avoidNotes: string;
}

interface Props {
  value: BibleEditorValue;
  onChange: (next: BibleEditorValue) => void;
}

export default function BibleEditor({ value, onChange }: Props) {
  const { draft } = value;

  const updateDraft = useCallback(
    (patch: Partial<BibleDraft>) => {
      onChange({ ...value, draft: { ...value.draft, ...patch } });
    },
    [value, onChange],
  );

  return (
    <div className="space-y-8">
      {/* Book Info */}
      <Section
        title="Book info"
        description="Series, genre, and tone for this story."
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Series">
            <Input
              value={draft.series ?? ""}
              onChange={(e) =>
                updateDraft({ series: e.target.value.trim() || null })
              }
              placeholder="e.g. Expeditionary Force"
            />
          </Field>
          <Field label="Book number">
            <Input
              type="number"
              min={1}
              value={draft.bookNumber ?? ""}
              onChange={(e) =>
                updateDraft({
                  bookNumber: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="e.g. 19"
            />
          </Field>
        </div>
        <ChipList
          label="Genre"
          values={draft.genre}
          onChange={(v) => updateDraft({ genre: v })}
          placeholder="add a genre"
        />
        <ChipList
          label="Tone"
          values={draft.tone}
          onChange={(v) => updateDraft({ tone: v })}
          placeholder="add a tone (e.g. dark, hopeful)"
        />
      </Section>

      {/* Setting / world */}
      <Section
        title="Setting & world"
        description="What the world feels and looks like — helps ground every visual."
      >
        <Field label="Setting summary">
          <Textarea
            value={draft.settingSummary}
            onChange={(e) => updateDraft({ settingSummary: e.target.value })}
            rows={3}
            placeholder="A brief, non-spoiler description of the world…"
          />
        </Field>
        <Field label="Non-spoiler summary">
          <Textarea
            value={draft.nonSpoilerSummary}
            onChange={(e) =>
              updateDraft({ nonSpoilerSummary: e.target.value })
            }
            rows={3}
            placeholder="Back-cover style. Setup only — no plot reveals."
          />
        </Field>
        <ChipList
          label="Visual style hints"
          values={draft.visualStyleHints}
          onChange={(v) => updateDraft({ visualStyleHints: v })}
          placeholder="e.g. gritty, neon-lit, cathedral architecture"
        />
      </Section>

      {/* Characters */}
      <Section
        title="Characters"
        description="Their look and role at the start of the book — no fates, no spoilers."
      >
        <CharacterList
          values={draft.characterProfiles}
          onChange={(v) => updateDraft({ characterProfiles: v })}
        />
      </Section>

      {/* Locations + Factions */}
      <Section title="Locations" description="Key places in the story.">
        <NamedList
          values={draft.locations}
          onChange={(v) => updateDraft({ locations: v })}
          namePlaceholder="Location name"
          descPlaceholder="What it looks/feels like"
        />
      </Section>

      <Section title="Factions" description="Groups, organizations, sides.">
        <NamedList
          values={draft.factions}
          onChange={(v) => updateDraft({ factions: v })}
          namePlaceholder="Faction name"
          descPlaceholder="Non-spoiler description"
        />
      </Section>

      <Section
        title="Tech, ships, species, objects"
        description="World-specific things worth getting right visually."
      >
        <NamedList
          label="Technology"
          values={draft.technology}
          onChange={(v) => updateDraft({ technology: v })}
          namePlaceholder="e.g. Quantum drive"
        />
        <NamedList
          label="Ships"
          values={draft.ships}
          onChange={(v) => updateDraft({ ships: v })}
          namePlaceholder="e.g. Valkyrie"
        />
        <NamedList
          label="Species"
          values={draft.species}
          onChange={(v) => updateDraft({ species: v })}
          namePlaceholder="e.g. Kristang"
        />
        <NamedList
          label="Important objects"
          values={draft.importantObjects}
          onChange={(v) => updateDraft({ importantObjects: v })}
          namePlaceholder="e.g. The Crown"
        />
      </Section>

      {/* Reader-only fields */}
      <Section
        title="What should the visual companion focus on?"
        description="Pick what matters most. Multi-select."
      >
        <div className="flex flex-wrap gap-2">
          {FOCUS_OPTIONS.map((opt) => {
            const active = value.focusAreas.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    focusAreas: active
                      ? value.focusAreas.filter((x) => x !== opt)
                      : [...value.focusAreas, opt],
                  })
                }
                className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${
                  active
                    ? "bg-amber-400/15 border-amber-400/60 text-amber-200"
                    : "border-border/60 text-muted-foreground hover:border-border"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        title="Anything we should avoid?"
        description="Hard constraints — every scene will respect these."
      >
        <Textarea
          value={value.avoidNotes}
          onChange={(e) => onChange({ ...value, avoidNotes: e.target.value })}
          rows={3}
          placeholder="e.g. no spoilers beyond chapter 10, avoid romance focus, no character deaths…"
        />
      </Section>

      <Section
        title="Personal notes"
        description="Anything else worth knowing — your own commentary."
      >
        <Textarea
          value={value.userNotes}
          onChange={(e) => onChange({ ...value, userNotes: e.target.value })}
          rows={3}
          placeholder="Optional notes for yourself…"
        />
      </Section>
    </div>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/40 bg-card/40 p-5 space-y-4">
      <div>
        <h3 className="font-serif text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ChipList({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const v = e.currentTarget.value.trim();
      if (v && !values.includes(v)) onChange([...values, v]);
      e.currentTarget.value = "";
    }
  };
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map((v) => (
          <Badge
            key={v}
            variant="secondary"
            className="gap-1 pr-1.5"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
              aria-label={`remove ${v}`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        placeholder={placeholder ?? "Type and press Enter…"}
        onKeyDown={onKeyDown}
      />
    </Field>
  );
}

function NamedList({
  label,
  values,
  onChange,
  namePlaceholder,
  descPlaceholder,
}: {
  label?: string;
  values: NamedEntity[];
  onChange: (v: NamedEntity[]) => void;
  namePlaceholder?: string;
  descPlaceholder?: string;
}) {
  const update = (i: number, patch: Partial<NamedEntity>) =>
    onChange(values.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const remove = (i: number) =>
    onChange(values.filter((_, idx) => idx !== i));
  const add = () => onChange([...values, { name: "", description: "" }]);

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </Label>
      )}
      <div className="space-y-2">
        {values.map((entry, i) => (
          <div
            key={i}
            className="grid grid-cols-1 sm:grid-cols-[180px_1fr_auto] gap-2 items-start"
          >
            <Input
              value={entry.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder={namePlaceholder ?? "Name"}
            />
            <Input
              value={entry.description}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder={descPlaceholder ?? "Description"}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(i)}
              aria-label="remove entry"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={add}>
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add
      </Button>
    </div>
  );
}

function CharacterList({
  values,
  onChange,
}: {
  values: CharacterProfile[];
  onChange: (v: CharacterProfile[]) => void;
}) {
  const update = (i: number, patch: Partial<CharacterProfile>) =>
    onChange(values.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const remove = (i: number) =>
    onChange(values.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([
      ...values,
      {
        name: "",
        role: "",
        description: "",
        visualTraits: [],
        aliases: [],
      },
    ]);
  const updateTraits = (i: number, traits: string[]) =>
    update(i, { visualTraits: traits });

  return (
    <div className="space-y-3">
      {values.map((c, i) => (
        <div
          key={i}
          className="rounded-lg border border-border/40 bg-background/40 p-3 space-y-2"
        >
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-start">
            <Input
              value={c.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Character name"
            />
            <Input
              value={c.role}
              onChange={(e) => update(i, { role: e.target.value })}
              placeholder="Role (captain, scientist…)"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(i)}
              aria-label="remove character"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Textarea
            value={c.description}
            onChange={(e) => update(i, { description: e.target.value })}
            rows={2}
            placeholder="Non-spoiler description (who they are at story start)"
          />
          <ChipList
            label="Visual traits"
            values={c.visualTraits}
            onChange={(v) => updateTraits(i, v)}
            placeholder="e.g. tall, scarred, leather coat"
          />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add character
      </Button>
    </div>
  );
}
