/**
 * Rendert aus dem Divi-Block-Markup eine lesbare HTML-Vorschau der Seite.
 * Es wird bewusst nicht Divi selbst nachgebaut, sondern der redaktionelle
 * Inhalt (Überschriften, Texte, Bilder, Buttons) in Lesereihenfolge gezeigt.
 */

import { extractFields, type EditableField } from "./divi";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Divi-Dynamic-Content-Platzhalter ($variable({...})$) unlesbar -> entfernen. */
function clean(value: string): string {
  return value
    .replace(/\$variable\(\{.*?\}\)\$/gs, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** Erlaubt einfaches Inline-HTML aus dem Content, entfernt Skripte. */
function safeHtml(value: string): string {
  return clean(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/ on[a-z]+="[^"]*"/gi, "");
}

function isHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

type Block = { index: number; name: string; fields: EditableField[] };

function groupBlocks(fields: EditableField[]): Block[] {
  const map = new Map<number, Block>();
  for (const f of fields) {
    const existing = map.get(f.blockIndex);
    if (existing) existing.fields.push(f);
    else map.set(f.blockIndex, { index: f.blockIndex, name: f.blockName, fields: [f] });
  }
  return [...map.values()].sort((a, b) => a.index - b.index);
}

function renderBlock(block: Block, values: Record<string, string>): string {
  const get = (pred: (f: EditableField) => boolean) => {
    const f = block.fields.find(pred);
    return f ? clean(values[f.id] ?? f.value) : "";
  };

  const src = get((f) => f.key.toLowerCase() === "src");
  const alt = get((f) => f.key.toLowerCase() === "alt");
  const parts: string[] = [];

  if (src && /^https?:/.test(src)) {
    parts.push(`<figure><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" />${
      alt ? `<figcaption>${esc(alt)}</figcaption>` : ""
    }</figure>`);
  }

  for (const field of block.fields) {
    const key = field.key.toLowerCase();
    if (key === "src" || key === "alt") continue;
    const raw = values[field.id] ?? field.value;
    const value = field.kind === "text" || field.kind === "heading" ? safeHtml(raw) : clean(raw);
    if (!value) continue;

    if (field.kind === "heading") {
      parts.push(`<h2>${isHtml(value) ? value : esc(value)}</h2>`);
    } else if (field.kind === "link") {
      parts.push(`<p class="link"><a href="${esc(value)}">${esc(value)}</a></p>`);
    } else if (key === "label" || key === "buttontext") {
      parts.push(`<p><span class="btn">${esc(value)}</span></p>`);
    } else {
      parts.push(isHtml(value) ? `<div class="rich">${value}</div>` : `<p>${esc(value)}</p>`);
    }
  }

  if (!parts.length) return "";
  return `<section class="block"><span class="tag">${esc(block.name)}</span>${parts.join("\n")}</section>`;
}

export function renderPreviewHtml(
  markup: string,
  values: Record<string, string> = {},
  title = "",
): string {
  const blocks = groupBlocks(extractFields(markup));
  const body = blocks.map((b) => renderBlock(b, values)).join("\n");

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { color-scheme: light; }
  body { margin:0; background:#faf8f4; color:#1c1a17;
    font:400 16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 40px 24px 80px; }
  h1 { font: 700 34px/1.2 Georgia, serif; margin: 0 0 28px; }
  h2 { font: 600 24px/1.3 Georgia, serif; margin: 0 0 12px; }
  .block { background:#fff; border:1px solid #e6e0d6; border-radius:14px;
    padding:24px; margin-bottom:20px; position:relative; }
  .tag { position:absolute; top:10px; right:14px; font:600 10px/1 ui-monospace,monospace;
    letter-spacing:.08em; text-transform:uppercase; color:#a89a83; }
  figure { margin:0 0 16px; }
  img { width:100%; border-radius:10px; display:block; }
  figcaption { font-size:12px; color:#8b8175; margin-top:6px; }
  p { margin:0 0 12px; }
  .rich { margin-bottom:12px; }
  .rich img { margin:12px 0; }
  a { color:#8a6b2f; }
  .btn { display:inline-block; background:#1c1a17; color:#fff; border-radius:999px;
    padding:10px 20px; font-size:14px; }
  .empty { color:#8b8175; }
</style></head>
<body><main>
${title ? `<h1>${esc(title)}</h1>` : ""}
${body || '<p class="empty">Keine darstellbaren Inhalte gefunden.</p>'}
</main></body></html>`;
}
