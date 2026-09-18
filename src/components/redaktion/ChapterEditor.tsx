import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { EditableField } from "@/lib/divi";
import { parseChapterName } from "@/lib/divi";
import { renderFullPageHtml } from "@/lib/preview";

type Props = {
  path: string;
  markup: string;
  headerMarkups: string[];
  footerMarkups: string[];
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
  headerMarkups,
  footerMarkups,
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
    return renderFullPageHtml(markup, values, headerMarkups, footerMarkups);
  }, [markup, values, headerMarkups, footerMarkups]);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
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

      <div className="mt-6 inline-flex rounded-lg border border-border bg-muted/40 p-1">
        <button
          onClick={() => setTab("preview")}
          className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
            tab === "preview" ? "bg-background font-medium shadow-sm" : "text-muted-foreground"
          }`}
        >
          HTML-Vorschau
        </button>
        <button
          onClick={() => setTab("fields")}
          className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
            tab === "fields" ? "bg-background font-medium shadow-sm" : "text-muted-foreground"
          }`}
        >
          Inhalte bearbeiten
        </button>
      </div>

      {tab === "preview" ? (
        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-background shadow-sm">
          <iframe
            title="Kapitelvorschau"
            srcDoc={previewHtml}
            sandbox=""
            className="h-[calc(100vh-13rem)] min-h-[680px] w-full border-0 bg-card"
          />
        </div>
      ) : fields.length === 0 ? (
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
