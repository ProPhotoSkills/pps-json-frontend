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