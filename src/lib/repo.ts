import type { TreeEntry } from "./github";

export type Category = {
  name: string;
  chapters: { path: string; fileName: string }[];
  overviewPath: string;
  hasOverview: boolean;
};

export type Scan = {
  categories: Category[];
  globals: { path: string; fileName: string; group: string }[];
};

const GLOBAL_FOLDERS = ["header", "footer"];

/** Leitet Kategorien, Kapitel und globale Divi-Exporte aus dem Repo-Baum ab. */
export function deriveScan(tree: TreeEntry[]): Scan {
  const byFolder = new Map<string, TreeEntry[]>();
  const globals: Scan["globals"] = [];

  for (const entry of tree) {
    if (entry.type !== "blob") continue;
    const parts = entry.path.split("/");
    if (parts.length !== 2) continue;
    const folder = parts[0]!;
    const fileName = parts[1]!;

    if (GLOBAL_FOLDERS.includes(folder.toLowerCase())) {
      if (fileName.toLowerCase().endsWith(".json")) {
        globals.push({ path: entry.path, fileName, group: folder });
      }
      continue;
    }

    const list = byFolder.get(folder) ?? [];
    list.push(entry);
    byFolder.set(folder, list);
  }

  const categories: Category[] = [];
  for (const [folder, entries] of byFolder) {
    const chapters = entries
      .filter((e) => e.path.toLowerCase().endsWith(".json"))
      .map((e) => ({ path: e.path, fileName: e.path.split("/")[1]! }))
      .sort((a, b) => a.fileName.localeCompare(b.fileName));
    if (!chapters.length) continue;

    const overviewPath = `${folder}/${folder.toLowerCase()}_kapitel.html`;
    const hasOverview = entries.some(
      (e) => e.path.toLowerCase() === overviewPath.toLowerCase(),
    );
    categories.push({ name: folder, chapters, overviewPath, hasOverview });
  }

  categories.sort((a, b) => a.name.localeCompare(b.name));
  globals.sort((a, b) => {
    const groupOrder = a.group.toLowerCase().localeCompare(b.group.toLowerCase());
    return groupOrder || a.fileName.localeCompare(b.fileName);
  });
  return { categories, globals };
}
