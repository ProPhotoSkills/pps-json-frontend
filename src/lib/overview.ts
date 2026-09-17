/** Generiert die Kapitelübersicht <kategorie>_kapitel.html aus dem aktuellen Dateibestand. */

export type OverviewChapter = {
  fileName: string;
  title: string;
  thumbnail: string | null;
  modul: number | null;
  kapitel: number | null;
  slug: string;
};

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildOverviewHtml(category: string, chapters: OverviewChapter[]): string {
  const sorted = [...chapters].sort((a, b) => {
    const am = a.modul ?? 9999;
    const bm = b.modul ?? 9999;
    if (am !== bm) return am - bm;
    return (a.kapitel ?? 9999) - (b.kapitel ?? 9999);
  });

  const cards = sorted
    .map((c) => {
      const badge =
        c.modul !== null && c.kapitel !== null
          ? `<span style="display:inline-block;font:600 12px/1 system-ui,sans-serif;letter-spacing:.08em;color:#8a6b2f;background:#f6efe1;padding:6px 10px;border-radius:999px;margin-bottom:12px;">MODUL ${String(c.modul).padStart(2, "0")} · KAPITEL ${String(c.kapitel).padStart(2, "0")}</span>`
          : "";
      const img = c.thumbnail
        ? `<img src="${esc(c.thumbnail)}" alt="${esc(c.title)}" style="width:100%;height:180px;object-fit:cover;display:block;" />`
        : `<div style="width:100%;height:180px;background:#ece7de;"></div>`;
      return `      <article style="background:#fff;border:1px solid #e6e0d6;border-radius:14px;overflow:hidden;">
        ${img}
        <div style="padding:20px;">
          ${badge}
          <h2 style="margin:0 0 8px;font:600 19px/1.35 Georgia,serif;color:#1c1a17;">${esc(c.title)}</h2>
          <p style="margin:0;font:400 13px/1.5 system-ui,sans-serif;color:#7a736a;">${esc(c.slug)}</p>
        </div>
      </article>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(category)} – Kapitelübersicht</title>
</head>
<body style="margin:0;background:#faf8f4;">
  <main style="max-width:1100px;margin:0 auto;padding:56px 24px;">
    <h1 style="margin:0 0 8px;font:700 34px/1.2 Georgia,serif;color:#1c1a17;">${esc(category)}</h1>
    <p style="margin:0 0 32px;font:400 15px/1.6 system-ui,sans-serif;color:#7a736a;">${sorted.length} Kapitel</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px;">
${cards}
    </div>
  </main>
</body>
</html>
`;
}
