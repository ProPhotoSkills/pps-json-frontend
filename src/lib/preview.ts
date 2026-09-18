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
  const role = block.name.toLowerCase().includes("header")
    ? " site-header"
    : block.name.toLowerCase().includes("footer")
      ? " site-footer"
      : "";
  return `<section class="content-block${role}">${parts.join("\n")}</section>`;
}

function renderMarkup(markup: string, values: Record<string, string>): string {
  return groupBlocks(extractFields(markup))
    .map((block) => renderBlock(block, values))
    .join("\n");
}

export function renderPreviewHtml(
  markup: string,
  values: Record<string, string> = {},
  _title = "",
): string {
  return renderFullPageHtml(markup, values);
}

/** Rendert Header, Kapitel und Footer als eine durchgehende Webseite. */
export function renderFullPageHtml(
  markup: string,
  values: Record<string, string> = {},
  headerMarkups: string[] = [],
  footerMarkups: string[] = [],
): string {
  const header = headerMarkups.map((part) => renderMarkup(part, {})).join("\n");
  const body = renderMarkup(markup, values);
  const footer = footerMarkups.map((part) => renderMarkup(part, {})).join("\n");

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { color-scheme: light; }
  * { box-sizing:border-box; }
  body { margin:0; background:#fff; color:#1c1a17;
    font:400 16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif; }
  .page { min-height:100vh; display:flex; flex-direction:column; }
  header, main, footer { width:100%; }
  main { flex:1; }
  .content-block { max-width:1040px; margin:0 auto; padding:32px 40px; }
  .content-block + .content-block { padding-top:12px; }
  header { border-bottom:1px solid #e6e0d6; background:#faf8f4; }
  header .content-block { padding-top:22px; padding-bottom:22px; }
  footer { margin-top:48px; border-top:1px solid #ded8cd; background:#24231f; color:#f9f7f2; }
  footer .content-block { padding-top:28px; padding-bottom:28px; }
  h1, h2, h3 { font-family:Georgia,serif; }
  h1 { font-size:clamp(30px,5vw,52px); line-height:1.1; margin:0 0 24px; }
  h2 { font-size:clamp(24px,3.5vw,38px); line-height:1.2; margin:0 0 16px; }
  figure { margin:0 0 20px; }
  img { width:100%; max-height:620px; object-fit:cover; display:block; }
  figcaption { font-size:12px; color:#8b8175; margin-top:6px; }
  p { margin:0 0 12px; }
  .rich { margin-bottom:12px; }
  .rich img { margin:12px 0; }
  a { color:#8a6b2f; }
  .btn { display:inline-block; background:#1c1a17; color:#fff; border-radius:4px;
    padding:10px 20px; font-size:14px; text-decoration:none; }
  .empty { color:#8b8175; }
  @media (max-width:640px) { .content-block { padding:24px 18px; } }
</style></head>
<body><div class="page">
${header ? `<header>${header}</header>` : ""}
<main>${body || '<section class="content-block"><p class="empty">Keine darstellbaren Inhalte gefunden.</p></section>'}</main>
${footer ? `<footer>${footer}</footer>` : ""}
</div></body></html>`;
}
