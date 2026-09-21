/**
 * Rendert aus dem Divi-Block-Markup eine lesbare HTML-Vorschau der Seite.
 * Es wird bewusst nicht Divi selbst nachgebaut, sondern der redaktionelle
 * Inhalt (Überschriften, Texte, Bilder, Buttons) in Lesereihenfolge gezeigt.
 */

import { extractFields, type EditableField } from "./divi";
import { renderPpsAssetHeadTags, renderPpsAssetScriptTags } from "./siteAssets";
import { renderManagedHead, type HeadValues } from "./headSettings";

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
    parts.push(`<figure><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" /></figure>`);
  }

  for (const field of block.fields) {
    const key = field.key.toLowerCase();
    if (key === "src" || key === "alt" || key === "titletext") continue;
    const raw = values[field.id] ?? field.value;
    const value = field.kind === "text" || field.kind === "heading" ? safeHtml(raw) : clean(raw);
    if (!value) continue;

    if (field.kind === "media") {
      parts.push(`<p><audio controls preload="none" src="${esc(value)}"></audio></p>`);
    } else if (field.kind === "image") {
      if (/^https?:/.test(value)) {
        parts.push(`<figure><img src="${esc(value)}" alt="" loading="lazy" /></figure>`);
      }
    } else if (field.kind === "heading") {
      parts.push(isHtml(value) ? `<div class="rich">${value}</div>` : `<h2>${esc(value)}</h2>`);
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
  return `<section class="content-block et_pb_module et_pb_text${role}"><div class="et_pb_text_inner">${parts.join("\n")}</div></section>`;
}

function renderMarkup(markup: string, values: Record<string, string>): string {
  return groupBlocks(extractFields(markup))
    .map((block) => renderBlock(block, values))
    .join("\n");
}

/** Ergänzt eine bestehende HTML-Datei für die RDS-Vorschau um PPS-CSS und den gewählten Footer. */
export function renderHtmlFilePreview(
  html: string,
  footerMarkups: string[] = [],
  headValues?: HeadValues,
): string {
  const assetHead = renderPpsAssetHeadTags();
  const managedHead = headValues ? renderManagedHead(headValues) : "";
  const hasFooter = /<footer\b|class=["'][^"']*(?:pps-site-footer|et-l--footer)/i.test(html);
  const renderedFooter = footerMarkups.map((part) => renderMarkup(part, {})).join("\n");
  const footer = !hasFooter && renderedFooter
    ? `<footer class="pps-site-footer">${renderedFooter}</footer>`
    : "";

  let preview = html;
  if (/<\/head\s*>/i.test(preview)) {
    preview = preview.replace(/<\/head\s*>/i, `${assetHead}\n${managedHead}\n</head>`);
  } else {
    preview = `${assetHead}\n${managedHead}\n${preview}`;
  }

  if (footer) {
    if (/<\/body\s*>/i.test(preview)) {
      preview = preview.replace(/<\/body\s*>/i, `${footer}\n</body>`);
    } else {
      preview += `\n${footer}`;
    }
  }

  return preview;
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
  headValues?: HeadValues,
): string {
  const header = headerMarkups.map((part) => renderMarkup(part, {})).join("\n");
  const body = renderMarkup(markup, values);
  const footer = footerMarkups.map((part) => renderMarkup(part, {})).join("\n");

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
${renderPpsAssetHeadTags()}
${headValues ? renderManagedHead(headValues, { includeHeadText: true }) : ""}
<style>
  :root { color-scheme: light; }
  * { box-sizing:border-box; }
  body { margin:0; background:#fff; }
  .page { min-height:100vh; display:flex; flex-direction:column; }
  .pps-site-header, main, .pps-site-footer { width:100%; }
  main { flex:1; }
  .content-block { max-width:1080px; margin:0 auto; padding:32px 40px; }
  .content-block + .content-block { padding-top:12px; }
  .pps-site-header { border-bottom:1px solid #e6e0d6; background:#fff; }
  .pps-site-header .content-block { padding-top:22px; padding-bottom:22px; }
  .pps-site-footer { margin-top:48px; background:#1f1f1f; color:#f2f2f2; }
  .pps-site-footer a { color:#f2f2f2; }
  .pps-site-footer .content-block { padding-top:28px; padding-bottom:28px; }
  figure { margin:0 0 20px; }
  figure img { width:100%; max-height:620px; object-fit:cover; display:block; }
  figcaption { font-size:12px; color:#8b8175; margin-top:6px; }
  .rich img { margin:12px 0; max-width:100%; height:auto; }
  .btn { display:inline-block; background:#1f1f1f; color:#fff; border-radius:4px;
    padding:10px 24px; font-size:14px; text-decoration:none; }
  .empty { color:#8b8175; }
  @media (max-width:640px) { .content-block { padding:24px 18px; } }
</style></head>
<body class="et-db"><div id="et-boc" class="et-boc"><div class="et-l page">
${header ? `<header class="pps-site-header">${header}</header>` : ""}
<main class="et_pb_section">${body || '<section class="content-block"><p class="empty">Keine darstellbaren Inhalte gefunden.</p></section>'}</main>
${footer ? `<footer class="pps-site-footer">${footer}</footer>` : ""}
<div id="google_translate_element" style="display:none;"></div>
${renderPpsAssetScriptTags()}
</div></div></body></html>`;
}
