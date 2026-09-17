import { commitFile, fetchFile, type RepoConfig } from "./github";
import {
  chapterThumbnail,
  chapterTitle,
  extractFields,
  getChapterMarkup,
  parseChapterName,
  type ChapterFile,
} from "./divi";
import { buildOverviewHtml, type OverviewChapter } from "./overview";
import type { Category } from "./repo";

export type RebuildResult = { category: string; chapters: number; commitSha: string };

/** Liest alle Kapitel einer Kategorie, generiert die Übersicht neu und committet sie. */
export async function rebuildCategory(
  cfg: RepoConfig,
  category: Category,
  onProgress?: (done: number, total: number) => void,
): Promise<RebuildResult> {
  const entries: OverviewChapter[] = [];
  const total = category.chapters.length;

  for (let i = 0; i < total; i++) {
    const chapter = category.chapters[i];
    const meta = parseChapterName(chapter.fileName);
    try {
      const { text } = await fetchFile(cfg, chapter.path);
      const parsed = JSON.parse(text) as ChapterFile;
      const markup = getChapterMarkup(parsed);
      const fields = markup ? extractFields(markup.markup) : [];
      entries.push({
        fileName: chapter.fileName,
        title: chapterTitle(fields, meta.slug),
        thumbnail: chapterThumbnail(fields),
        modul: meta.modul,
        kapitel: meta.kapitel,
        slug: meta.slug,
      });
    } catch {
      entries.push({
        fileName: chapter.fileName,
        title: meta.slug,
        thumbnail: null,
        modul: meta.modul,
        kapitel: meta.kapitel,
        slug: meta.slug,
      });
    }
    onProgress?.(i + 1, total);
  }

  const html = buildOverviewHtml(category.name, entries);
  const { commitSha } = await commitFile(
    cfg,
    category.overviewPath,
    html,
    `Rebuild Kapitelübersicht ${category.name}`,
  );
  return { category: category.name, chapters: entries.length, commitSha };
}
