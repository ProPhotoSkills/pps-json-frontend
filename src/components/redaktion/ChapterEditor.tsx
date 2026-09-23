import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { EditableField } from "@/lib/divi";
import { parseChapterName } from "@/lib/divi";
import { renderFullPageHtml } from "@/lib/preview";
import type { HeadValues } from "@/lib/headSettings";
import { BlockEditor } from "./BlockEditor";

type Props = {
  path: string;
  documentKind: "chapter" | "header" | "footer";
  markup: string;
  headerMarkups: string[];
  footerMarkups: string[];
  headValues: HeadValues;
  fields: EditableField[];
  values: Record<string, string>;
  original: Record<string, string>;
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
  media: "Audio/Video",
};

export function ChapterEditor({
  path,
  documentKind,
  markup,
  headerMarkups,
  footerMarkups,
  headValues,
  fields,
  values,
  original,
  dirty,
  saving,
  onChange,
  onSave,
  onReset,
}: Props) {
  const fileName = path.split("/").pop() ?? path;
  const meta = parseChapterName(fileName);
  const kindLabel = documentKind === "header" ? "Header" : documentKind === "footer" ? "Footer" : "Kapitel";
  const [tab, setTab] = useState<"preview" | "blocks" | "fields">("preview");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const renderPreview = () =>
    markup ? renderFullPageHtml(markup, values, headerMarkups, footerMarkups, headValues) : "";
  const [previewHtml, setPreviewHtml] = useState(renderPreview);

  useEffect(() => {
    setPreviewHtml(renderFullPageHtml(markup, values, headerMarkups, footerMarkups, headValues));
    // Änderungen aus der Vorschau dürfen das iframe beim Tippen nicht neu laden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, markup, headerMarkups, footerMarkups, headValues]);

  const openTab = (nextTab: "preview" | "blocks" | "fields") => {
    if (nextTab === "preview") setPreviewHtml(renderPreview());
    setTab(nextTab);
  };

  const connectInlineEditor = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.querySelectorAll<HTMLElement>("[data-json-field]").forEach((element) => {
      element.addEventListener("input", () => {
        const id = element.dataset["jsonField"];
        if (id) onChange(id, element.innerHTML);
      });
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-eyebrow">
            {documentKind === "chapter" && meta.modul !== null
              ? `Modul ${String(meta.modul).padStart(2, "0")} · Kapitel ${String(meta.kapitel).padStart(2, "0")}`
              : kindLabel}
          </p>
          <h2 className="mt-1 text-3xl">
            {documentKind === "chapter" ? meta.slug.replace(/-/g, " ") : fileName.replace(/\.json$/i, "")}
          </h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{path}</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <Badge variant="secondary">Ungespeichert</Badge>}
          <Button
            variant="outline"
            onClick={() => {
              onReset();
              setPreviewHtml(renderFullPageHtml(markup, original, headerMarkups, footerMarkups, headValues));
            }}
            disabled={!dirty || saving}
          >
            Verwerfen
          </Button>
          <Button onClick={onSave} disabled={!dirty || saving}>
            {saving ? "Speichere…" : documentKind === "chapter" ? "Speichern & neu bauen" : `${kindLabel} speichern`}
          </Button>
        </div>
      </div>

      <div className="mt-6 inline-flex rounded-lg border border-border bg-muted/40 p-1">
        <Button
          type="button"
          variant="ghost"
          onClick={() => openTab("preview")}
          className={`h-auto rounded-md px-4 py-1.5 text-sm transition-colors ${
            tab === "preview" ? "bg-background font-medium shadow-sm" : "text-muted-foreground"
          }`}
        >
          Seite bearbeiten
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => openTab("blocks")}
          className={`h-auto rounded-md px-4 py-1.5 text-sm transition-colors ${
            tab === "blocks" ? "bg-background font-medium shadow-sm" : "text-muted-foreground"
          }`}
        >
          Block-Editor
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => openTab("fields")}
          className={`h-auto rounded-md px-4 py-1.5 text-sm transition-colors ${
            tab === "fields" ? "bg-background font-medium shadow-sm" : "text-muted-foreground"
          }`}
        >
          Einzelfelder
        </Button>
      </div>

      {tab === "preview" ? (
        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-background shadow-sm">
          <iframe
            ref={iframeRef}
            title="Kapitelvorschau"
            srcDoc={previewHtml}
            sandbox="allow-same-origin"
            onLoad={connectInlineEditor}
            className="h-[calc(100vh-13rem)] min-h-[680px] w-full border-0 bg-card"
          />
        </div>
      ) : tab === "blocks" ? (
        <BlockEditor fields={fields} values={values} original={original} onChange={onChange} />
      ) : fields.length === 0 ? (

          <p className="mt-10 text-sm text-muted-foreground">
          In dieser Datei wurden keine editierbaren Inhalte gefunden.
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
