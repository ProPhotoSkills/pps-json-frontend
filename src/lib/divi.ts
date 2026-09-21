/**
 * Parsing und Patchen von Divi-/Gutenberg-Block-Markup.
 *
 * Das Kapitel-JSON hat die Form:
 *   { "context": "et_builder", "data": { "<post_id>": "<block markup>" } }
 * Der Wert ist roher WordPress-Block-Content mit JSON-Attributen in den
 * Block-Kommentaren. Wir scannen diese Attribute, ziehen editierbare
 * Text-/Bild-/Link-Werte heraus und schreiben sie wieder zurück.
 */

export type ChapterFile = {
  context: string;
  data: Record<string, string>;
};

export type FieldKind = "heading" | "text" | "image" | "link" | "media";

export type EditableField = {
  /** eindeutige ID: blockIndex + JSON-Pfad */
  id: string;
  blockIndex: number;
  path: (string | number)[];
  key: string;
  blockName: string;
  kind: FieldKind;
  label: string;
  value: string;
};

type BlockMatch = {
  name: string;
  attrs: unknown;
  /** Start-/Endindex des JSON-Attributteils im Gesamtstring */
  jsonStart: number;
  jsonEnd: number;
};

const TEXT_KEYS = new Set(["text", "content", "body", "caption", "html"]);
const HEADING_HINTS = ["heading", "title", "headline"];
const IMAGE_KEYS = new Set(["src", "alt", "title", "url"]);
const LINK_KEYS = new Set(["url", "href", "linkurl", "buttonurl", "label", "buttontext"]);

/** Findet alle Block-Kommentare mit JSON-Attributen (balancierte Klammern). */
function scanBlocks(markup: string): BlockMatch[] {
  const blocks: BlockMatch[] = [];
  const opener = /<!--\s*wp:([a-zA-Z0-9/_-]+)\s*/g;
  let m: RegExpExecArray | null;

  while ((m = opener.exec(markup))) {
    const name = m[1];
    let i = m.index + m[0].length;
    if (markup[i] !== "{") continue;

    const jsonStart = i;
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (; i < markup.length; i++) {
      const c = markup[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (c === "\\") escaped = true;
        else if (c === '"') inString = false;
        continue;
      }
      if (c === '"') inString = true;
      else if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }

    const raw = markup.slice(jsonStart, i);
    try {
      blocks.push({ name: name!, attrs: JSON.parse(raw), jsonStart, jsonEnd: i });
    } catch {
      // Kein valides JSON -> Block überspringen, Markup bleibt unangetastet.
    }
    opener.lastIndex = i;
  }

  return blocks;
}

function shortBlockName(name: string): string {
  const last = name.split("/").pop() ?? name;
  return last
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/** Felder, die nur technische Metadaten enthalten. */
const SKIP_KEYS = new Set(["id", "width", "height", "classname", "class", "sync", "adminlabel"]);

const MEDIA_RE = /\.(mp3|wav|m4a|ogg|mp4|webm)(\?|$)/i;
const IMAGE_RE = /\.(jpe?g|png|gif|webp|avif|svg)(\?|$)/i;

/**
 * Divi 5 legt redaktionelle Inhalte unter <gruppe>.innerContent.<breakpoint>.value ab –
 * entweder als HTML-String (Text/Überschrift) oder als Objekt (Bild mit src/alt).
 */
function classifyInner(
  groupName: string,
  key: string,
  value: string,
): FieldKind | null {
  const k = key.toLowerCase();
  if (SKIP_KEYS.has(k)) return null;
  const group = groupName.toLowerCase();

  if (k === "src") return IMAGE_RE.test(value) || value.startsWith("http") ? "image" : null;
  if (k === "alt" || k === "titletext") return "image";
  if (k === "url" || k === "href") return "link";

  if (k === "value" || k === "text" || k === "content") {
    if (MEDIA_RE.test(value)) return "media";
    if (IMAGE_RE.test(value) && /^https?:/.test(value)) return "image";
    if (/^https?:\/\/\S+$/.test(value)) return "link";
    if (/<h[1-3][\s>]/i.test(value)) return "heading";
    if (group === "title" || group === "heading") return "heading";
    return "text";
  }
  return null;
}

function classify(blockName: string, key: string, value: string): FieldKind | null {
  const k = key.toLowerCase();
  const isImageish = /\.(jpe?g|png|gif|webp|avif|svg)(\?|$)/i.test(value);

  if (k === "src" && (isImageish || value.startsWith("http"))) return "image";
  if (k === "alt") return "image";
  if (IMAGE_KEYS.has(k) && blockName.includes("image")) return "image";
  if (LINK_KEYS.has(k) && (blockName.includes("button") || /^https?:|^\//.test(value))) {
    return k === "label" || k === "buttontext" ? "text" : "link";
  }
  if (TEXT_KEYS.has(k)) {
    return HEADING_HINTS.some((h) => blockName.includes(h)) ? "heading" : "text";
  }
  if (k === "title" && HEADING_HINTS.some((h) => blockName.includes(h))) return "heading";
  return null;
}

function labelFor(blockName: string, key: string, kind: FieldKind): string {
  const block = shortBlockName(blockName);
  const keyLabels: Record<string, string> = {
    src: "Bild-URL",
    alt: "Bild-Alternativtext",
    title: "Titel",
    text: "Text",
    content: "Inhalt",
    url: "Link-Ziel",
    href: "Link-Ziel",
    label: "Button-Beschriftung",
  };
  const suffix = keyLabels[key.toLowerCase()] ?? key;
  const prefix =
    kind === "heading" ? "Überschrift" : kind === "image" ? "Bild" : kind === "link" ? "Link" : block;
  return `${prefix} – ${suffix}`;
}

function walk(
  node: unknown,
  path: (string | number)[],
  blockIndex: number,
  blockName: string,
  out: EditableField[],
) {
  if (Array.isArray(node)) {
    node.forEach((child, i) => walk(child, [...path, i], blockIndex, blockName, out));
    return;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) continue;
        const kind = classify(blockName.toLowerCase(), key, trimmed);
        if (!kind) continue;
        out.push({
          id: `${blockIndex}:${[...path, key].join(".")}`,
          blockIndex,
          path: [...path, key],
          key,
          blockName,
          kind,
          label: labelFor(blockName, key, kind),
          value,
        });
      } else {
        walk(value, [...path, key], blockIndex, blockName, out);
      }
    }
  }
}

export function extractFields(markup: string): EditableField[] {
  const blocks = scanBlocks(markup);
  const fields: EditableField[] = [];
  blocks.forEach((b, i) => walk(b.attrs, [], i, b.name, fields));
  return fields;
}

function setAtPath(root: unknown, path: (string | number)[], value: string) {
  let cur: Record<string | number, unknown> = root as Record<string | number, unknown>;
  for (let i = 0; i < path.length - 1; i++) {
    cur = cur[path[i]!] as Record<string | number, unknown>;
    if (!cur) return;
  }
  cur[path[path.length - 1]!] = value;
}

/** Schreibt geänderte Feldwerte zurück in den Block-String. */
export function applyFields(markup: string, changes: Record<string, string>): string {
  const blocks = scanBlocks(markup);
  if (!blocks.length) return markup;

  const byBlock = new Map<number, EditableField[]>();
  for (const field of extractFields(markup)) {
    if (!(field.id in changes)) continue;
    const list = byBlock.get(field.blockIndex) ?? [];
    list.push(field);
    byBlock.set(field.blockIndex, list);
  }
  if (!byBlock.size) return markup;

  let result = "";
  let cursor = 0;

  blocks.forEach((block, index) => {
    const fields = byBlock.get(index);
    if (!fields) return;
    for (const field of fields) setAtPath(block.attrs, field.path, changes[field.id]!);
    result += markup.slice(cursor, block.jsonStart) + JSON.stringify(block.attrs);
    cursor = block.jsonEnd;
  });

  return result + markup.slice(cursor);
}

/** Erste Datenspalte des Kapitel-JSON (post id + Markup). */
export function getChapterMarkup(file: ChapterFile): { postId: string; markup: string } | null {
  const entries = Object.entries(file.data ?? {});
  if (!entries.length) return null;
  const [postId, markup] = entries[0]!;
  return { postId, markup };
}

export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function chapterTitle(fields: EditableField[], fallback: string): string {
  const heading = fields.find((f) => f.kind === "heading" && stripHtml(f.value));
  if (heading) return stripHtml(heading.value);
  const text = fields.find((f) => f.kind === "text" && stripHtml(f.value));
  return text ? stripHtml(text.value).slice(0, 80) : fallback;
}

export function chapterThumbnail(fields: EditableField[]): string | null {
  const img = fields.find((f) => f.key.toLowerCase() === "src" && /^https?:/.test(f.value));
  return img ? img.value : null;
}

/** t12_l01_slug.json -> { modul: 12, kapitel: 1, slug } */
export function parseChapterName(fileName: string) {
  const base = fileName.replace(/\.json$/i, "");
  const m = base.match(/^t(\d+)_l(\d+)_(.+)$/i);
  if (!m) return { modul: null, kapitel: null, slug: base, base };
  return { modul: Number(m[1]), kapitel: Number(m[2]), slug: m[3]!, base };
}
