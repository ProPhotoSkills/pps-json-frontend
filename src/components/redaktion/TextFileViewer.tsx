type Props = {
  path: string;
  text: string;
};

export function TextFileViewer({ path, text }: Props) {
  const fileName = path.split("/").pop() ?? path;
  const lines = text.split("\n");

  return (
    <div className="w-full px-5 py-8 lg:px-8 lg:py-10">
      <div>
        <p className="label-eyebrow">Datei</p>
        <h2 className="mt-1 text-3xl">{fileName}</h2>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {path} · {lines.length} Zeilen
        </p>
      </div>

      <div className="mt-6 max-h-[calc(100vh-13rem)] overflow-auto rounded-lg border border-border bg-muted/30">
        <div className="flex min-w-max font-mono text-[11px] leading-relaxed">
          <div className="select-none border-r border-border bg-muted/50 px-3 py-4 text-right text-muted-foreground">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <pre className="px-4 py-4">{text}</pre>
        </div>
      </div>
    </div>
  );
}
