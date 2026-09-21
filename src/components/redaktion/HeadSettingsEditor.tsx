import { useEffect, useMemo, useState } from "react";
import { Globe2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  EMPTY_HEAD_VALUES,
  effectiveHeadValues,
  type HeadScanSummary,
  type HeadSettings,
  type HeadValues,
} from "@/lib/headSettings";

type Props = {
  settings: HeadSettings;
  files: string[];
  initialPath: string | null;
  saving: boolean;
  scanSummary: HeadScanSummary;
  onSave: (scope: "global" | "page", path: string | null, values: HeadValues) => void;
};

export function HeadSettingsEditor({ settings, files, initialPath, saving, scanSummary, onSave }: Props) {
  const [scope, setScope] = useState<"global" | "page">(initialPath ? "page" : "global");
  const [path, setPath] = useState(initialPath ?? files[0] ?? "");
  const source = useMemo(
    () =>
      scope === "global"
        ? settings.global
        : path ? effectiveHeadValues(settings, path) : EMPTY_HEAD_VALUES,
    [path, scope, settings],
  );
  const [values, setValues] = useState<HeadValues>(source);

  useEffect(() => setValues(source), [source]);
  useEffect(() => {
    if (initialPath) {
      setPath(initialPath);
      setScope("page");
    }
  }, [initialPath]);

  const update = (key: keyof HeadValues, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  const pageHasOwnValues = Boolean(
    path && Object.values(settings.pages[path] ?? {}).some((value) => value?.trim()),
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 lg:px-8 lg:py-10">
      <p className="label-eyebrow">Einstellungen</p>
      <h2 className="mt-1 text-3xl">HTML-Kopf</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Google, Pinterest und weitere Codes getrennt vom sichtbaren Seitenkopf verwalten.
      </p>
      <p className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
        {scanSummary.scannedPages} HTML-Seiten gelesen · auf {scanSummary.pagesWithValues} Seiten Angaben gefunden
      </p>

      <div className="mt-7 flex flex-wrap gap-2">
        <Button type="button" variant={scope === "global" ? "default" : "outline"} onClick={() => setScope("global")}>
          <Globe2 className="size-4" /> Für alle Seiten
        </Button>
        <Button type="button" variant={scope === "page" ? "default" : "outline"} onClick={() => setScope("page")} disabled={!files.length}>
          Nur für eine Datei
        </Button>
      </div>

      {scope === "page" ? (
        <div className="mt-5 space-y-2">
          <Label htmlFor="head-page">HTML- oder JSON-Datei</Label>
          <select id="head-page" value={path} onChange={(event) => setPath(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            {files.map((file) => <option key={file} value={file}>{file}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">
            {pageHasOwnValues
              ? "Diese Seite enthält eigene Angaben. Du kannst sie hier korrigieren."
              : "Diese Seite übernimmt momentan die Angaben für alle Seiten. Beim Speichern erhält sie eigene Werte."}
          </p>
        </div>
      ) : null}

      <div className="mt-7 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="head-text">Kopfzeilen-Text (ausgelesen)</Label>
          <p className="text-xs text-muted-foreground">
            Der komplette Kopfbereich, so wie er ausgelesen wurde – zum Beispiel Google-Sprachen,
            Schriften und Meta-Angaben. Hier kannst du ihn direkt korrigieren.
          </p>
          <Textarea
            id="head-text"
            rows={18}
            value={values.headText}
            onChange={(event) => update("headText", event.target.value)}
            placeholder="Noch kein Kopfzeilen-Text ausgelesen"
            className="font-mono text-xs"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="google-analytics-id">Google Analytics Measurement ID</Label>
          <Input id="google-analytics-id" value={values.googleAnalyticsId} onChange={(event) => update("googleAnalyticsId", event.target.value)} placeholder="G-XXXXXXXXXX" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pinterest-verification">Pinterest Bestätigungscode</Label>
          <Input id="pinterest-verification" value={values.pinterestVerification} onChange={(event) => update("pinterestVerification", event.target.value)} placeholder="Code aus dem Pinterest-Meta-Tag" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="additional-head-html">Weitere Codes im HTML-Kopf</Label>
          <Textarea id="additional-head-html" rows={14} value={values.additionalHeadHtml} onChange={(event) => update("additionalHeadHtml", event.target.value)} placeholder="Zum Beispiel Bing, Übersetzung, Cookie-Einbindung oder weitere Meta-Tags" className="font-mono text-xs" />
        </div>
      </div>

      <div className="mt-7 flex justify-end">
        <Button onClick={() => onSave(scope, scope === "page" ? path : null, values)} disabled={saving || (scope === "page" && !path)}>
          <Save className="size-4" /> {saving ? "Speichere…" : "HTML-Kopf speichern"}
        </Button>
      </div>
    </div>
  );
}