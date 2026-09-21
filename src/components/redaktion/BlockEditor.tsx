import { useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Link2, Heading1, Image as ImageIcon, Music, Type, Undo2 } from "lucide-react";
import type { EditableField } from "@/lib/divi";

type Props = {
  fields: EditableField[];
  values: Record<string, string>;
  original: Record<string, string>;
  onChange: (id: string, value: string) => void;
};

type BlockGroup = {
  index: number;
  name: string;
  fields: EditableField[];
};

const BLOCK_ICON = {
  heading: Heading1,
  text: Type,
  image: ImageIcon,
  media: Music,
  link: Link2,
} as const;

const BLOCK_LABEL: Record<EditableField["kind"], string> = {
  heading: "Überschrift",
  text: "Absatz",
  image: "Bild",
  media: "Audio/Video",
  link: "Link",
};

function groupFields(fields: EditableField[]): BlockGroup[] {
  const map = new Map<number, BlockGroup>();
  for (const field of fields) {
    const existing = map.get(field.blockIndex);
    if (existing) existing.fields.push(field);
    else map.set(field.blockIndex, { index: field.blockIndex, name: field.blockName, fields: [field] });
  }
  return [...map.values()].sort((a, b) => a.index - b.index);
}

function blockTitle(group: BlockGroup): string {
  const kind = group.fields[0]?.kind ?? "text";
  const short = group.name.split("/").pop() ?? group.name;
  return `${BLOCK_LABEL[kind]} · ${short}`;
}

/** Inline-Editor mit Formatierungsleiste – speichert das HTML des Feldes. */
function RichTextBlock({
  field,
  value,
  onChange,
}: {
  field: EditableField;
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Nur beim ersten Rendern setzen, sonst springt der Cursor.
  const initial = useMemo(() => value, [field.id]);

  const format = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={() => format("bold")} title="Fett">
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => format("italic")} title="Kursiv">
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title="Link einfügen"
          onClick={() => {
            const url = window.prompt("Link-Adresse");
            if (url) format("createLink", url);
          }}
        >
          <Link2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title="Formatierung entfernen"
          onClick={() => format("removeFormat")}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={field.label}
        dangerouslySetInnerHTML={{ __html: initial }}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="prose-block min-h-[3rem] rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

export function BlockEditor({ fields, values, original, onChange }: Props) {
  const groups = useMemo(() => groupFields(fields), [fields]);

  if (!groups.length) {
    return (
      <p className="mt-10 text-sm text-muted-foreground">
        In dieser Datei wurden keine bearbeitbaren Blöcke gefunden.
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      {groups.map((group) => {
        const kind = group.fields[0]?.kind ?? "text";
        const Icon = BLOCK_ICON[kind];
        const changed = group.fields.some((f) => (values[f.id] ?? "") !== (original[f.id] ?? ""));
        return (
          <div
            key={group.index}
            className={`panel p-5 transition-colors ${changed ? "border-primary/60" : ""}`}
          >
            <div className="mb-3 flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="label-eyebrow">{blockTitle(group)}</span>
              {changed && <span className="label-eyebrow text-primary">geändert</span>}
            </div>

            <div className="space-y-4">
              {group.fields.map((field) => {
                const value = values[field.id] ?? "";
                if (field.kind === "heading" || field.kind === "text") {
                  return (
                    <RichTextBlock
                      key={field.id}
                      field={field}
                      value={value}
                      onChange={(next) => onChange(field.id, next)}
                    />
                  );
                }
                if (field.kind === "media") {
                  return (
                    <div key={field.id}>
                      <Label htmlFor={field.id} className="text-sm font-medium">
                        {field.label}
                      </Label>
                      <Input
                        id={field.id}
                        className="mt-1"
                        value={value}
                        onChange={(e) => onChange(field.id, e.target.value)}
                      />
                      {/^https?:/.test(value) && (
                        <audio controls preload="none" src={value} className="mt-3 w-full" />
                      )}
                    </div>
                  );
                }
                const isSrc = field.key.toLowerCase() === "src";
                return (
                  <div key={field.id}>
                    <Label htmlFor={field.id} className="text-sm font-medium">
                      {field.label}
                    </Label>
                    <Input
                      id={field.id}
                      className="mt-1"
                      value={value}
                      onChange={(e) => onChange(field.id, e.target.value)}
                    />
                    {isSrc && /^https?:/.test(value) && (
                      <img
                        src={value}
                        alt=""
                        className="mt-3 h-40 w-full rounded-md object-cover"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
