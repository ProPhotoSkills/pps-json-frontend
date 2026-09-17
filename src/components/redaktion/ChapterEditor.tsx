import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { EditableField } from "@/lib/divi";
import { chapterTitle, parseChapterName } from "@/lib/divi";
import { renderPreviewHtml } from "@/lib/preview";

type Props = {
  path: string;
  markup: string;
  fields: EditableField[];
  values: Record<string, string>;
  dirty: boolean;
  saving: boolean;
  onChange: (id: string, value: string) => void;
  onSave: () => void;
  onReset: () => void;
};

const KIND_LABEL: Record<EditableField["kind"], string> = {
  heading: "Überschrift",
  text: "Text",
  image: "Bild",
  link: "Link",
};

export function ChapterEditor({
  path,
  markup,
  fields,
  values,
  dirty,
  saving,
  onChange,
  onSave,
  onReset,
}: Props) {
  const meta = parseChapterName(path.split("/")[1] ?? path);
  const [tab, setTab] = useState<"preview" | "fields">("preview");

  const previewHtml = useMemo(() => {
    if (!markup) return "";
    const live = fields.map((f) => ({ ...f, value: values[f.id] ?? f.value }));
    return renderPreviewHtml(markup, values, chapterTitle(live, meta.slug.replace(/-/g, " ")));
  }, [markup, values, fields, meta.slug]);

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-eyebrow">
            {meta.modul !== null
              ? `Modul ${String(meta.modul).padStart(2, "0")} · Kapitel ${String(meta.kapitel).padStart(2, "0")}`
              : "Kapitel"}
          </p>
          <h2 className="mt-1 text-3xl">{meta.slug.replace(/-/g, " ")}</h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{path}</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <Badge variant="secondary">Ungespeichert</Badge>}
          <Button variant="outline" onClick={onReset} disabled={!dirty || saving}>
            Verwerfen
          </Button>
          <Button onClick={onSave} disabled={!dirty || saving}>
            {saving ? "Speichere…" : "Speichern & neu bauen"}
          </Button>
        </div>
      </div>

      {fields.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          In diesem Kapitel wurden keine editierbaren Inhalte gefunden.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {fields.map((field) => {
            const value = values[field.id] ?? "";
            const isImage = field.kind === "image" && field.key.toLowerCase() === "src";
            const long = field.kind === "text" && (value.length > 90 || value.includes("<"));
            return (
              <div key={field.id} className="panel p-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <Label htmlFor={field.id} className="text-sm font-medium">
                    {field.label}
                  </Label>
                  <span className="label-eyebrow">{KIND_LABEL[field.kind]}</span>
                </div>
                {long ? (
                  <Textarea
                    id={field.id}
                    rows={6}
                    value={value}
                    onChange={(e) => onChange(field.id, e.target.value)}
                  />
                ) : (
                  <Input
                    id={field.id}
                    value={value}
                    onChange={(e) => onChange(field.id, e.target.value)}
                  />
                )}
                {isImage && /^https?:/.test(value) && (
                  <img
                    src={value}
                    alt=""
                    className="mt-3 h-32 w-full rounded-md object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
