export const HEAD_SETTINGS_PATH = "HEAD/head-settings.json";

export type HeadValues = {
  googleAnalyticsId: string;
  pinterestVerification: string;
  additionalHeadHtml: string;
};

export type HeadSettings = {
  global: HeadValues;
  pages: Record<string, Partial<HeadValues>>;
};

export type HeadScanSummary = {
  scannedPages: number;
  pagesWithValues: number;
};

export const EMPTY_HEAD_VALUES: HeadValues = {
  googleAnalyticsId: "",
  pinterestVerification: "",
  additionalHeadHtml: "",
};

export const EMPTY_HEAD_SETTINGS: HeadSettings = {
  global: EMPTY_HEAD_VALUES,
  pages: {},
};

export function parseHeadSettings(text: string): HeadSettings {
  const parsed = JSON.parse(text) as Partial<HeadSettings>;
  return {
    global: { ...EMPTY_HEAD_VALUES, ...(parsed.global ?? {}) },
    pages: parsed.pages ?? {},
  };
}

export function effectiveHeadValues(settings: HeadSettings, path?: string | null): HeadValues {
  const page = path ? settings.pages[path] : undefined;
  return {
    googleAnalyticsId: page?.googleAnalyticsId?.trim() || settings.global.googleAnalyticsId,
    pinterestVerification:
      page?.pinterestVerification?.trim() || settings.global.pinterestVerification,
    additionalHeadHtml: page?.additionalHeadHtml?.trim() || settings.global.additionalHeadHtml,
  };
}

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function metaContent(tag: string, name: string): string {
  const nameMatch = tag.match(/\bname\s*=\s*["']([^"']+)["']/i);
  if (nameMatch?.[1]?.toLowerCase() !== name.toLowerCase()) return "";
  return decodeHtml(tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1]?.trim() ?? "");
}

export function extractHeadValuesFromHtml(html: string): HeadValues {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? html;
  const analyticsId =
    head.match(/gtag\s*\(\s*["']config["']\s*,\s*["']([^"']+)["']/i)?.[1] ??
    head.match(/googletagmanager\.com\/gtag\/js\?[^"']*\bid=([^&"']+)/i)?.[1] ??
    head.match(/ga\s*\(\s*["']create["']\s*,\s*["']([^"']+)["']/i)?.[1] ??
    "";

  let pinterestVerification = "";
  const additionalTags: string[] = [];
  const verificationNames = new Set([
    "google-site-verification",
    "msvalidate.01",
    "facebook-domain-verification",
    "yandex-verification",
  ]);
  for (const match of head.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const name = tag.match(/\bname\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
    if (name === "p:domain_verify") {
      pinterestVerification = metaContent(tag, name);
    } else if (verificationNames.has(name)) {
      additionalTags.push(tag.trim());
    }
  }

  return {
    googleAnalyticsId: decodeHtml(analyticsId.trim()),
    pinterestVerification,
    additionalHeadHtml: additionalTags.join("\n"),
  };
}

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

export function mergeExtractedHeadSettings(
  stored: HeadSettings,
  extracted: Record<string, HeadValues>,
): HeadSettings {
  const discovered = Object.values(extracted);
  const inferredGlobal: HeadValues = {
    googleAnalyticsId: mostCommon(discovered.map((item) => item.googleAnalyticsId)),
    pinterestVerification: mostCommon(discovered.map((item) => item.pinterestVerification)),
    additionalHeadHtml: mostCommon(discovered.map((item) => item.additionalHeadHtml)),
  };
  const global: HeadValues = {
    googleAnalyticsId: stored.global.googleAnalyticsId.trim() || inferredGlobal.googleAnalyticsId,
    pinterestVerification:
      stored.global.pinterestVerification.trim() || inferredGlobal.pinterestVerification,
    additionalHeadHtml: stored.global.additionalHeadHtml.trim() || inferredGlobal.additionalHeadHtml,
  };
  const pages = { ...stored.pages };

  Object.entries(extracted).forEach(([path, found]) => {
    const saved = pages[path] ?? {};
    const next: Partial<HeadValues> = { ...saved };
    (Object.keys(EMPTY_HEAD_VALUES) as (keyof HeadValues)[]).forEach((key) => {
      if (!saved[key]?.trim() && found[key].trim() && found[key].trim() !== global[key].trim()) {
        next[key] = found[key];
      }
    });
    if (Object.values(next).some((value) => value?.trim())) pages[path] = next;
  });

  return { global, pages };
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderManagedHead(values: HeadValues): string {
  const tags: string[] = [];
  const analyticsId = values.googleAnalyticsId.trim();
  const pinterest = values.pinterestVerification.trim();

  if (analyticsId) {
    const id = escapeAttribute(analyticsId);
    tags.push(`<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${id}');</script>`);
  }
  if (pinterest) {
    tags.push(`<meta name="p:domain_verify" content="${escapeAttribute(pinterest)}" />`);
  }
  if (values.additionalHeadHtml.trim()) {
    tags.push(
      values.additionalHeadHtml
        .replace(/<!doctype[^>]*>/gi, "")
        .replace(/<\/?(?:html|head|body)[^>]*>/gi, "")
        .trim(),
    );
  }
  return tags.join("\n");
}