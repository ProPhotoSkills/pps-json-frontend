import diviCore from "@/assets/divi-core-2.js.asset.json";
import jquery from "@/assets/jquery.min-2.js.asset.json";
import moduleEot from "@/assets/modules-2.eot.asset.json";
import moduleSvg from "@/assets/modules-2.svg.asset.json";
import moduleTtf from "@/assets/modules-2.ttf.asset.json";
import moduleWoff from "@/assets/modules-2.woff.asset.json";
import siteCss from "@/assets/pps-site-2.css.asset.json";
import siteJs from "@/assets/pps-site-2.js.asset.json";

type AssetPointer = { url: string };

function absoluteAssetUrl(asset: AssetPointer): string {
  if (/^https?:\/\//.test(asset.url)) return asset.url;
  if (typeof window === "undefined" || !window.location.origin) return asset.url;
  return new URL(asset.url, window.location.origin).href;
}

export function getPpsAssetUrls() {
  return {
    css: absoluteAssetUrl(siteCss),
    js: absoluteAssetUrl(siteJs),
    jquery: absoluteAssetUrl(jquery),
    diviCore: absoluteAssetUrl(diviCore),
    moduleEot: absoluteAssetUrl(moduleEot),
    moduleSvg: absoluteAssetUrl(moduleSvg),
    moduleTtf: absoluteAssetUrl(moduleTtf),
    moduleWoff: absoluteAssetUrl(moduleWoff),
  };
}

export function renderPpsAssetHeadTags(): string {
  const assets = getPpsAssetUrls();
  return `<link rel="stylesheet" href="${assets.css}" />
<style>
  @font-face { font-family:"ETmodules"; font-style:normal; font-weight:400; font-display:swap;
    src:url("${assets.moduleEot}");
    src:url("${assets.moduleEot}?#iefix") format("embedded-opentype"), url("${assets.moduleWoff}") format("woff"), url("${assets.moduleTtf}") format("truetype"), url("${assets.moduleSvg}#ETmodules") format("svg"); }
</style>`;
}

export function renderPpsAssetScriptTags(): string {
  const assets = getPpsAssetUrls();
  return `<script src="${assets.jquery}"></script>
<script src="${assets.diviCore}"></script>
<script src="${assets.js}"></script>`;
}