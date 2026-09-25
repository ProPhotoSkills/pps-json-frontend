/**
 * Rendert aus dem Divi-Block-Markup eine lesbare HTML-Vorschau der Seite.
 * Es wird bewusst nicht Divi selbst nachgebaut, sondern der redaktionelle
 * Inhalt (Überschriften, Texte, Bilder, Buttons) in Lesereihenfolge gezeigt.
 */

import { extractFields, type EditableField } from "./divi";
import { renderPpsAssetHeadTags, renderPpsAssetScriptTags } from "./siteAssets";
import { renderManagedHead, type HeadValues } from "./headSettings";

export type RepoPageAssets = {
  css: { path: string; content: string }[];
  js: { path: string; content: string }[];
};

const EMPTY_REPO_ASSETS: RepoPageAssets = { css: [], js: [] };

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

function editableAttributes(field: EditableField, editable: boolean): string {
  if (!editable || (field.kind !== "heading" && field.kind !== "text")) return "";
  return ` contenteditable="true" spellcheck="true" data-json-field="${esc(field.id)}" title="Zum Bearbeiten anklicken"`;
}

function renderBlock(block: Block, values: Record<string, string>, editable = false): string {
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
      const attrs = editableAttributes(field, editable);
      parts.push(isHtml(value) ? `<div class="rich"${attrs}>${value}</div>` : `<h2${attrs}>${esc(value)}</h2>`);
    } else if (field.kind === "link") {
      parts.push(`<p class="link"><a href="${esc(value)}">${esc(value)}</a></p>`);
    } else if (key === "label" || key === "buttontext") {
      parts.push(`<p><span class="btn">${esc(value)}</span></p>`);
    } else {
      const attrs = editableAttributes(field, editable);
      parts.push(isHtml(value) ? `<div class="rich"${attrs}>${value}</div>` : `<p${attrs}>${esc(value)}</p>`);
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

function renderMarkup(markup: string, values: Record<string, string>, editable = false): string {
  return groupBlocks(extractFields(markup))
    .map((block) => renderBlock(block, values, editable))
    .join("\n");
}

function renderRepoPageAssets(assets: RepoPageAssets): { head: string; scripts: string } {
  const head = assets.css
    .map(({ path, content }) => `<style data-repo-file="${esc(path)}">\n${content.replace(/<\/style/gi, "<\\/style")}\n</style>`)
    .join("\n");
  const scripts = assets.js
    .map(({ path, content }) => `<script data-repo-file="${esc(path)}">\n${content.replace(/<\/script/gi, "<\\/script")}\n</script>`)
    .join("\n");
  return { head, scripts };
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

/**
 * Nutzt die fertig gerenderte Kapitel-HTML als Vorlage für eine JSON-Datei.
 * Dadurch sieht die JSON-Seite genauso aus wie ihr HTML-Pendant; die Werte aus
 * der JSON werden in der Vorlage gefunden und bleiben direkt bearbeitbar.
 */
export function renderJsonFilePreview(
  html: string,
  fields: EditableField[],
  values: Record<string, string>,
  footerMarkups: string[] = [],
  headValues?: HeadValues,
  repoAssets: RepoPageAssets = EMPTY_REPO_ASSETS,
): string {
  let preview = renderHtmlFilePreview(html, footerMarkups, headValues);
  const assets = renderRepoPageAssets(repoAssets);
  const editableFields = fields
    .filter((field) => field.kind === "heading" || field.kind === "text")
    .map((field) => ({
      id: field.id,
      original: field.value,
      value: values[field.id] ?? field.value,
    }));
  const fieldData = JSON.stringify(editableFields).replace(/<\/script/gi, "<\\/script");
  const bridge = `<script>
  (function () {
    var fields = ${fieldData};
    function plain(value) {
      var holder = document.createElement('div');
      holder.innerHTML = value || '';
      return (holder.textContent || '').replace(/\\s+/g, ' ').trim();
    }
    var candidates = Array.prototype.slice.call(document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,a,span,div'));
    fields.forEach(function (field) {
      var originalText = plain(field.original);
      if (!originalText) return;
      var matches = candidates.filter(function (element) {
        return !element.closest('[data-json-field]') && plain(element.innerHTML) === originalText;
      }).sort(function (a, b) {
        return a.children.length - b.children.length || a.innerHTML.length - b.innerHTML.length;
      });
      var element = matches[0];
      if (!element) return;
      element.innerHTML = field.value;
      element.setAttribute('contenteditable', 'true');
      element.setAttribute('spellcheck', 'true');
      element.setAttribute('data-json-field', field.id);
      element.setAttribute('title', 'Zum Bearbeiten anklicken');
      element.addEventListener('input', function () {
        window.parent.postMessage({ type: 'pps-json-field-change', id: field.id, value: element.innerHTML }, '*');
      });
    });
    document.querySelectorAll('[data-json-field]').forEach(function (element) {
      element.style.cursor = 'text';
      element.style.outlineOffset = '5px';
    });
  })();
  </script>`;

  const injectedHead = `${assets.head}<style>[data-json-field]:hover{outline:1px dashed #a08000}[data-json-field]:focus{outline:2px solid #a08000;background:#fffbea}</style>`;
  preview = /<\/head\s*>/i.test(preview)
    ? preview.replace(/<\/head\s*>/i, `${injectedHead}\n</head>`)
    : `${injectedHead}\n${preview}`;
  const injectedBody = `${assets.scripts}\n${bridge}`;
  return /<\/body\s*>/i.test(preview)
    ? preview.replace(/<\/body\s*>/i, `${injectedBody}\n</body>`)
    : `${preview}\n${injectedBody}`;
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
  repoAssets: RepoPageAssets = EMPTY_REPO_ASSETS,
): string {
  const header = headerMarkups.map((part) => renderMarkup(part, {})).join("\n");
  const body = renderMarkup(markup, values, true);
  const footer = footerMarkups.map((part) => renderMarkup(part, {})).join("\n");
  const repoPageAssets = renderRepoPageAssets(repoAssets);

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
${renderPpsAssetHeadTags()}
${repoPageAssets.head}
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
  [data-json-field] { cursor:text; border-radius:3px; outline:1px dashed transparent; outline-offset:5px; transition:outline-color .15s, background-color .15s; }
  [data-json-field]:hover { outline-color:#a08000; }
  [data-json-field]:focus { outline:2px solid #a08000; background:#fffbea; }
  .empty { color:#8b8175; }
  @media (max-width:640px) { .content-block { padding:24px 18px; } }
</style></head>
<body class="et-db"><div id="et-boc" class="et-boc"><div class="et-l page">
${header ? `<header class="pps-site-header">${header}</header>` : ""}
<main class="et_pb_section">${body || '<section class="content-block"><p class="empty">Keine darstellbaren Inhalte gefunden.</p></section>'}</main>
${footer ? `<footer class="pps-site-footer">${footer}</footer>` : ""}
<div id="google_translate_element" style="display:none;"></div>
${renderPpsAssetScriptTags()}
${repoPageAssets.scripts}
<script src="/html2canvas.min.js"></script>
<script>
  document.querySelectorAll('[data-json-field]').forEach(function (element) {
    element.addEventListener('input', function () {
      window.parent.postMessage({
        type: 'pps-json-field-change',
        id: element.getAttribute('data-json-field'),
        value: element.innerHTML
      }, '*');
    });
  });

  async function captureCompletePage() {
    window.parent.postMessage({ type: 'pps-page-capture-start' }, '*');
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      var images = Array.prototype.slice.call(document.images);
      await Promise.all(images.map(function (image) {
        if (image.complete) return Promise.resolve();
        return new Promise(function (resolve) {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        });
      }));
      await new Promise(function (resolve) { window.setTimeout(resolve, 700); });
      if (typeof window.html2canvas !== 'function') throw new Error('Aufnahmefunktion nicht geladen.');
      var page = document.documentElement;
      var pageHeight = Math.max(page.scrollHeight, document.body.scrollHeight);
      var scale = Math.min(1, 12000 / Math.max(pageHeight, 1));
      var canvas = await window.html2canvas(document.body, {
        backgroundColor: '#ffffff',
        height: pageHeight,
        imageTimeout: 5000,
        logging: false,
        scale: scale,
        useCORS: true,
        windowHeight: pageHeight,
        windowWidth: Math.max(page.scrollWidth, document.body.scrollWidth)
      });
      window.parent.postMessage({
        type: 'pps-page-capture-ready',
        image: canvas.toDataURL('image/jpeg', 0.86),
        width: canvas.width,
        height: canvas.height
      }, '*');
    } catch (error) {
      window.parent.postMessage({
        type: 'pps-page-capture-error',
        message: error instanceof Error ? error.message : 'Die Seitenaufnahme konnte nicht erstellt werden.'
      }, '*');
    }
  }

  window.addEventListener('load', captureCompletePage, { once: true });
  window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'pps-page-capture-request') captureCompletePage();
  });
</script>
</div></div></body></html>`;
}
