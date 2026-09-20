import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, FolderTree, Hammer, LogOut, Pencil, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ScrollArea } from "@/components/ui/scroll-area";
import { ConnectCard } from "@/components/redaktion/ConnectCard";
import { ChapterEditor } from "@/components/redaktion/ChapterEditor";
import {
  commitFile,
  fetchFile,
  fetchTree,
  verifyToken,
  GitHubError,
  type RepoConfig,
} from "@/lib/github";
import { deriveScan, type Category, type Scan } from "@/lib/repo";
import {
  applyFields,
  extractFields,
  getChapterMarkup,
  chapterThumbnail,
  parseChapterName,
  type ChapterFile,
  type EditableField,
} from "@/lib/divi";
import { rebuildCategory } from "@/lib/rebuild";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "pps-json Redaktionssystem" },
      {
        name: "description",
        content:
          "Kapitel aus dem Repo pps-json scannen, bearbeiten und Übersichtsseiten automatisch neu generieren.",
      },
      { property: "og:title", content: "pps-json Redaktionssystem" },
      {
        property: "og:description",
        content:
          "Kapitel aus dem Repo pps-json scannen, bearbeiten und Übersichtsseiten automatisch neu generieren.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Redaktion,
});

const SETTINGS_KEY = "pps-json.repo-settings";

function describe(err: unknown): string {
  if (err instanceof GitHubError) return err.message;
  if (err instanceof Error) return err.message;
  return "Unbekannter Fehler";
}

function Redaktion() {
  const [defaults, setDefaults] = useState({ owner: "", repo: "pps-json", branch: "main" });
  const [cfg, setCfg] = useState<RepoConfig | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [scan, setScan] = useState<Scan | null>(null);
  const [scanning, setScanning] = useState(false);
  const [treePaths, setTreePaths] = useState<string[]>([]);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [chapterFile, setChapterFile] = useState<ChapterFile | null>(null);
  const [fields, setFields] = useState<EditableField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [chapterImages, setChapterImages] = useState<Record<string, string>>({});
  const [globalMarkups, setGlobalMarkups] = useState<Record<string, string>>({});
  const [activeHeaderPath, setActiveHeaderPath] = useState<string | null>(null);
  const [activeFooterPath, setActiveFooterPath] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      try {
        setDefaults({ ...defaults, ...JSON.parse(stored) });
      } catch {
        /* ignorieren */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runScan = useCallback(async (config: RepoConfig) => {
    setScanning(true);
    try {
      const tree = await fetchTree(config);
      const paths = tree.map((entry) => `${entry.type === "tree" ? "📁" : "📄"} ${entry.path}`);
      setTreePaths(paths);
      console.info(
        `[pps-json] Repo-Scan: ${tree.length} Einträge\n${paths.join("\n")}`,
      );
      const result = deriveScan(tree);
      setScan(result);
      setActiveCategory((current) => current ?? result.categories[0]?.name ?? null);

      const chapterPaths = result.categories.flatMap((item) => item.chapters.map((chapter) => chapter.path));
      const chapterEntries = await Promise.all(
        chapterPaths.map(async (path) => {
          try {
            const { text } = await fetchFile(config, path);
            const parsed = JSON.parse(text) as ChapterFile;
            const entry = getChapterMarkup(parsed);
            const image = entry ? chapterThumbnail(extractFields(entry.markup)) : null;
            return image ? ([path, image] as const) : null;
          } catch {
            return null;
          }
        }),
      );
      setChapterImages(Object.fromEntries(chapterEntries.filter((item) => item !== null)));

      const globalEntries = await Promise.all(
        result.globals.map(async (item) => {
          try {
            const { text } = await fetchFile(config, item.path);
            const parsed = JSON.parse(text) as ChapterFile;
            return { path: item.path, markup: getChapterMarkup(parsed)?.markup ?? "" };
          } catch {
            return { path: item.path, markup: "" };
          }
        }),
      );
      setGlobalMarkups(Object.fromEntries(globalEntries.map((item) => [item.path, item.markup])));

      const headerPaths = result.globals
        .filter((item) => item.group.toLowerCase() === "header")
        .map((item) => item.path);
      const footerPaths = result.globals
        .filter((item) => item.group.toLowerCase() === "footer")
        .map((item) => item.path);
      setActiveHeaderPath((current) =>
        current && headerPaths.includes(current) ? current : (headerPaths[0] ?? null),
      );
      setActiveFooterPath((current) =>
        current && footerPaths.includes(current) ? current : (footerPaths[0] ?? null),
      );
      return result;
    } finally {
      setScanning(false);
    }
  }, []);

  const handleConnect = async (config: RepoConfig) => {
    setConnecting(true);
    try {
      await verifyToken(config);
      await runScan(config);
      setCfg(config);
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ owner: config.owner, repo: config.repo, branch: config.branch }),
      );
      toast.success("Verbunden – Repository gescannt.");
    } catch (err) {
      toast.error(describe(err));
    } finally {
      setConnecting(false);
    }
  };

  const categories = scan?.categories ?? [];
  const category = useMemo(
    () => categories.find((c) => c.name === activeCategory) ?? null,
    [categories, activeCategory],
  );
  const headerVariants = useMemo(
    () => scan?.globals.filter((item) => item.group.toLowerCase() === "header") ?? [],
    [scan],
  );
  const footerVariants = useMemo(
    () => scan?.globals.filter((item) => item.group.toLowerCase() === "footer") ?? [],
    [scan],
  );
  const selectedHeaderMarkups = activeHeaderPath && globalMarkups[activeHeaderPath]
    ? [globalMarkups[activeHeaderPath]]
    : [];
  const selectedFooterMarkups = activeFooterPath && globalMarkups[activeFooterPath]
    ? [globalMarkups[activeFooterPath]]
    : [];

  const openChapter = async (path: string) => {
    if (!cfg) return;
    setActivePath(path);
    setLoadingChapter(true);
    try {
      const { text } = await fetchFile(cfg, path);
      const parsed = JSON.parse(text) as ChapterFile;
      const markup = getChapterMarkup(parsed);
      const extracted = markup ? extractFields(markup.markup) : [];
      const initial: Record<string, string> = {};
      extracted.forEach((f) => (initial[f.id] = f.value));
      setChapterFile(parsed);
      setFields(extracted);
      setValues(initial);
      setOriginal(initial);
    } catch (err) {
      toast.error(describe(err));
      setChapterFile(null);
      setFields([]);
    } finally {
      setLoadingChapter(false);
    }
  };

  const dirty = useMemo(
    () => Object.keys(values).some((k) => values[k] !== original[k]),
    [values, original],
  );

  const doRebuild = async (config: RepoConfig, cat: Category) => {
    setRebuilding(true);
    try {
      const result = await rebuildCategory(config, cat);
      toast.success(`Übersicht ${cat.name} neu gebaut (${result.chapters} Kapitel).`);
    } catch (err) {
      toast.error(`Rebuild fehlgeschlagen: ${describe(err)}`);
    } finally {
      setRebuilding(false);
    }
  };

  const doRebuildAll = async (config: RepoConfig, cats: Category[]) => {
    if (!cats.length) return;
    setRebuilding(true);
    try {
      let total = 0;
      for (const cat of cats) {
        const result = await rebuildCategory(config, cat);
        total += result.chapters;
      }
      toast.success(`${cats.length} Übersichten neu gebaut (${total} Kapitel).`);
    } catch (err) {
      toast.error(`Rebuild fehlgeschlagen: ${describe(err)}`);
    } finally {
      setRebuilding(false);
    }
  };


  const handleSave = async () => {
    if (!cfg || !activePath || !chapterFile) return;
    setSaving(true);
    try {
      const entry = getChapterMarkup(chapterFile);
      if (!entry) throw new Error("Kapitel enthält keine Divi-Daten.");

      const changes: Record<string, string> = {};
      for (const key of Object.keys(values)) {
        if (values[key] !== original[key]) changes[key] = values[key]!;
      }
      const nextMarkup = applyFields(entry.markup, changes);
      const nextFile: ChapterFile = {
        ...chapterFile,
        data: { ...chapterFile.data, [entry.postId]: nextMarkup },
      };
      const json = JSON.stringify(nextFile, null, 2);

      await commitFile(cfg, activePath, json, `Kapitel aktualisiert: ${activePath}`);
      setChapterFile(nextFile);
      setOriginal(values);
      toast.success("Kapitel als neuer Commit gespeichert.");

      const refreshed = await runScan(cfg);
      const folder = activePath.split("/")[0]!;
      const cat = refreshed.categories.find((c) => c.name === folder);
      if (cat) await doRebuild(cfg, cat);
      else await doRebuildAll(cfg, refreshed.categories);

    } catch (err) {
      toast.error(describe(err));
    } finally {
      setSaving(false);
    }
  };

  if (!cfg) {
    return <ConnectCard initial={defaults} busy={connecting} onConnect={handleConnect} />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-80 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="border-b border-sidebar-border px-5 py-5">
          <p className="label-eyebrow">Redaktionssystem</p>
          <h1 className="mt-1 text-2xl">{cfg.repo}</h1>
          <p className="font-mono text-xs text-muted-foreground">
            {cfg.owner} · {cfg.branch}
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              disabled={scanning || rebuilding}
              onClick={async () => {
                try {
                  const refreshed = await runScan(cfg);
                  const cat = refreshed.categories.find((c) => c.name === activeCategory);
                  if (cat) await doRebuild(cfg, cat);
                  else toast.success("Repository neu gescannt.");
                } catch (err) {
                  toast.error(describe(err));
                }
              }}
            >
              <RefreshCw className="size-3.5" />
              {scanning ? "Scanne…" : "Rescan & Rebuild"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={scanning || rebuilding}
              onClick={() => doRebuildAll(cfg, categories)}
              title="Alle Kategorie-Übersichten neu bauen"
            >
              <Hammer className="size-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCfg(null);
                setScan(null);
                setActivePath(null);
              }}
              title="Token verwerfen"
            >
              <LogOut className="size-3.5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-3 py-4">
            {([
              {
                label: "Header",
                variants: headerVariants,
                selectedPath: activeHeaderPath,
                onSelect: setActiveHeaderPath,
              },
              {
                label: "Footer",
                variants: footerVariants,
                selectedPath: activeFooterPath,
                onSelect: setActiveFooterPath,
              },
            ] as const).map((group) => (
              <div key={group.label}>
                <div className="flex items-center justify-between px-2">
                  <p className="label-eyebrow">{group.label}</p>
                  <span className="text-xs text-muted-foreground">{group.variants.length}</span>
                </div>
                <div className="mt-2 space-y-1">
                  {group.variants.map((variant) => {
                    const selected = variant.path === group.selectedPath;
                    return (
                      <div
                        key={variant.path}
                        className={`flex min-h-10 items-center gap-1 rounded-md pr-1 transition-colors ${
                          selected ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60"
                        }`}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-auto min-w-0 flex-1 justify-start gap-2 px-3 py-2 font-mono text-[11px] hover:bg-transparent"
                          onClick={() => group.onSelect(variant.path)}
                          title={`${group.label}-Variante auswählen`}
                        >
                          <span className="grid size-4 shrink-0 place-items-center">
                            {selected ? <Check className="size-3.5 text-primary" /> : null}
                          </span>
                          <span className="truncate">{variant.fileName.replace(/\.json$/i, "")}</span>
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8 shrink-0"
                          onClick={() => openChapter(variant.path)}
                          title={`${variant.fileName} bearbeiten`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                  {!group.variants.length && !scanning ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">Keine Varianten gefunden.</p>
                  ) : null}
                </div>
              </div>
            ))}

            <p className="label-eyebrow mt-6 px-2">Kategorien</p>
            <div className="mt-2 space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    cat.name === activeCategory
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent/60"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FolderTree className="size-3.5 text-muted-foreground" />
                    {cat.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{cat.chapters.length}</span>
                </button>
              ))}
              {!categories.length && !scanning && (
                <p className="px-3 py-2 text-sm text-muted-foreground">Keine Kategorien gefunden.</p>
              )}
            </div>

            {category && (
              <>
                <div className="mt-6 flex items-center justify-between px-2">
                  <p className="label-eyebrow">Kapitel</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={rebuilding}
                    onClick={() => doRebuild(cfg, category)}
                    title="Übersicht neu generieren"
                  >
                    <Hammer className="size-3.5" />
                  </Button>
                </div>
                <div className="mt-2 space-y-2">
                  {category.chapters.map((chapter) => {
                    const meta = parseChapterName(chapter.fileName);
                    return (
                      <button
                        key={chapter.path}
                        onClick={() => openChapter(chapter.path)}
                        className={`grid w-full grid-cols-[3.75rem_minmax(0,1fr)] items-center gap-3 rounded-md p-2 text-left text-sm transition-colors ${
                          chapter.path === activePath
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                            : "hover:bg-sidebar-accent/60"
                        }`}
                      >
                        <span className="h-12 w-[3.75rem] overflow-hidden rounded-sm bg-muted">
                          {chapterImages[chapter.path] ? (
                            <img
                              src={chapterImages[chapter.path]}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="grid h-full place-items-center font-mono text-xs text-muted-foreground">
                              {meta.kapitel !== null ? String(meta.kapitel).padStart(2, "0") : "JSON"}
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 leading-snug">{meta.slug?.replace(/-/g, " ")}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-4 px-3 font-mono text-[11px] text-muted-foreground">
                  {category.overviewPath}
                  {!category.hasOverview && " (wird neu erzeugt)"}
                </p>
              </>
            )}

          </div>
        </ScrollArea>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {loadingChapter ? (
          <p className="px-8 py-10 text-sm text-muted-foreground">Kapitel wird geladen…</p>
        ) : activePath && chapterFile ? (
          <ChapterEditor
            path={activePath}
            markup={getChapterMarkup(chapterFile)?.markup ?? ""}
            headerMarkups={selectedHeaderMarkups}
            footerMarkups={selectedFooterMarkups}
            fields={fields}
            values={values}
            dirty={dirty}
            saving={saving || rebuilding}
            onChange={(id, value) => setValues((v) => ({ ...v, [id]: value }))}
            onSave={handleSave}
            onReset={() => setValues(original)}
          />
        ) : (
          <div className="mx-auto max-w-xl px-8 py-24 text-center">
            <h2 className="text-3xl">Kapitel wählen</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Links eine Kategorie und ein Kapitel auswählen. Beim Speichern wird die Datei als
              neuer Commit abgelegt und die Kapitelübersicht der Kategorie automatisch neu gebaut.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
