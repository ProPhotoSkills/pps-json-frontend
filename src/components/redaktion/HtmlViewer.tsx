import { useState } from "react";

type Props = {
  path: string;
  html: string;
};

export function HtmlViewer({ path, html }: Props) {
  const [tab, setTab] = useState<"preview" | "source">("preview");
  const fileName = path.split("/").pop() ?? path;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
      <div>
        <p className="label-eyebrow">HTML-Datei</p>
        <h2 className="mt-1 text-3xl">{fileName.replace(/\.html$/i, "").replace(/[-_]/g, " ")}</h2>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{path}</p>
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
          onClick={() => setTab("source")}
          className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
            tab === "source" ? "bg-background font-medium shadow-sm" : "text-muted-foreground"
          }`}
        >
          Quelltext
        </button>
      </div>

      {tab === "preview" ? (
        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-background shadow-sm">
          <iframe
            title={`Vorschau ${fileName}`}
            srcDoc={html}
            sandbox=""
            className="h-[calc(100vh-13rem)] min-h-[680px] w-full border-0 bg-card"
          />
        </div>
      ) : (
        <pre className="mt-6 max-h-[calc(100vh-13rem)] overflow-auto rounded-lg border border-border bg-muted/30 p-4 font-mono text-[11px] leading-relaxed">
          {html}
        </pre>
      )}
    </div>
  );
}
