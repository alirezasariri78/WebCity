import { resolveImage, themeDef, type ThemeDef } from '../core/catalog';
import { backgroundCSS, customCss, directionOf, fontByName, fontsUsed, styleClasses, styleVars } from '../core/design';
import { activeFeatures } from '../core/rules';
import type { House, StyleProps, Town } from '../core/types';
import { siteCSS } from './css';
import { fileNames, orderedHouses } from './links';
import { EDIT_CSS, EDIT_SCRIPT, PREVIEW_SCRIPT, REVEAL_SCRIPT } from './scripts';
import { featureBodyHtml, featureCss, featureHead, featureNavButtons, featureScript } from './features';
import { renderSection } from './sections';
import { isRtlLanguage, siteDirection, siteText, type SiteText } from './strings';
import { esc } from './text';

/** export = real files · preview = Magic Window · edit = live editor with click-to-select */
export type Mode = 'export' | 'preview' | 'edit';

export interface PageParts {
  css: string;
  fonts: string;
  bodyClass: string;
  bodyStyle: string;
  body: string;
  title: string;
  description: string;
  usesMotion: boolean;
  /** Extra script for unlocked site features (back-to-top, dark mode…). */
  featureScript: string;
  lang: string;
  dir: 'ltr' | 'rtl';
  bodyDir?: 'ltr' | 'rtl';
  /** Extra tags in <head> for unlocked features. */
  head: string;
}

const VISIBLE_MENU_LINKS = 5;

function fontsHref(theme: ThemeDef, town: Town, house: House, persian: boolean): string {
  const names = new Set([...fontsUsed(town.style), ...fontsUsed(house.style), ...house.items.flatMap((f) => fontsUsed(f.style))]);
  if (persian) names.add('Vazirmatn');
  if (!names.size) return theme.site.fontUrl;
  const families = [...names].map((name) => `family=${fontByName(name)!.query}`).join('&');
  return `${theme.site.fontUrl.replace('&display=swap', '')}&${families}&display=swap`;
}

function menu(town: Town, house: House, files: Map<string, string>, text: SiteText): string {
  const link = (h: House) => `<a class="link${h.id === house.id ? ' active' : ''}" href="${files.get(h.id)}">${esc(h.name)}</a>`;
  const pages = orderedHouses(town);
  if (pages.length <= VISIBLE_MENU_LINKS + 1) return pages.map(link).join('');

  const shown = pages.slice(0, VISIBLE_MENU_LINKS);
  const hidden = pages.slice(VISIBLE_MENU_LINKS);
  const activeInside = hidden.some((h) => h.id === house.id) ? ' active' : '';
  return `${shown.map(link).join('')}<details class="more"><summary class="link${activeInside}">${esc(text.more)}</summary><div class="more-menu">${hidden.map(link).join('')}</div></details>`;
}

function navClasses(style: StyleProps): string {
  return ['nav', style.navStyle && style.navStyle !== 'light' ? `nav-${style.navStyle}` : '', style.sticky === '0' ? 'static' : '']
    .filter(Boolean)
    .join(' ');
}

const PAGE_ONLY_CLASSES = new Set(['reveal', 'hide-m']);

export function pageParts(town: Town, house: House, mode: Mode): PageParts {
  const theme = themeDef(town.theme);
  const files = fileNames(town);
  const combined: StyleProps = { ...town.style, ...house.style };
  const site = town.site ?? {};
  const text = siteText(site.lang);
  const dir = siteDirection(site.lang, site.dir);
  const persian = isRtlLanguage(site.lang) || dir === 'rtl';
  const features = activeFeatures(town);
  const navigates = mode === 'export';

  const brand = site.logoImage ? `<img src="${esc(resolveImage(site.logoImage))}" alt="">` : `<span>${town.logo}</span>`;
  const sections = house.items.map((item) => renderSection(item, { files, text })).join('\n');
  const empty = `<section class="wrap center"><p class="muted">${esc(text.empty)}</p></section>`;
  const footer = site.footer?.trim() ? esc(site.footer) : `© ${new Date().getFullYear()} ${esc(town.name)}`;
  const builtWith = site.hideBuiltWith ? '' : ` · ${text.builtWith}`;

  const usesMotion = [town.style, house.style, ...house.items.map((f) => f.style)].some((s) => s?.anim && s.anim !== 'none');
  const defaultTitle = house.kind === 'townhall' ? town.name : `${house.name} · ${town.name}`;

  return {
    css:
      siteCSS(theme, town, { persian, extra: featureCss(mode === 'edit' ? features.filter((f) => f !== 'pageFade') : features) }) +
      (mode === 'edit' ? EDIT_CSS : ''),
    fonts: fontsHref(theme, town, house, persian),
    featureScript: mode === 'edit' ? '' : featureScript(features, navigates, town),
    head: mode === 'export' ? featureHead(features, town, theme.site.primary) : '',
    lang: site.lang || 'en',
    dir,
    bodyDir: directionOf(house.style),
    bodyClass: styleClasses(combined)
      .filter((c) => !PAGE_ONLY_CLASSES.has(c) && !c.startsWith('rv-'))
      .join(' '),
    bodyStyle: [styleVars(house.style), backgroundCSS(house.style, resolveImage), customCss(house.style)].filter(Boolean).join(';'),
    title: house.seoTitle?.trim() || defaultTitle,
    description: house.seoDesc?.trim() || site.description?.trim() || town.name,
    usesMotion,
    body: `<nav class="${navClasses(combined)}"><div class="wrap"><a class="brand" href="index.html">${brand}${esc(town.name)}</a>${menu(town, house, files, text)}${featureNavButtons(features, text)}</div></nav>${featureBodyHtml(features, text, town)}
<main>
${sections || empty}
</main>
<footer><div class="wrap">${footer}${builtWith}</div></footer>`,
  };
}

function scriptFor(mode: Mode, p: PageParts): string {
  if (mode === 'edit') return EDIT_SCRIPT;
  if (mode === 'preview') return PREVIEW_SCRIPT;
  return p.usesMotion ? REVEAL_SCRIPT : '';
}

export function pageHTML(town: Town, house: House, mode: Mode): string {
  const p = pageParts(town, house, mode);
  const styles = mode === 'export' ? '<link rel="stylesheet" href="style.css">' : `<style id="tb-css">${p.css}</style>`;
  const script = scriptFor(mode, p);
  const tail = p.featureScript ? `\n<script>${p.featureScript}</script>` : '';
  return `<!doctype html>
<html lang="${esc(p.lang)}" dir="${p.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.description)}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${town.logo}</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link id="tb-fonts" rel="stylesheet" href="${esc(p.fonts)}">
${p.head}${styles}
${script ? `<script>${script}</script>` : ''}
</head>
<body class="${p.bodyClass}"${p.bodyDir ? ` dir="${p.bodyDir}"` : ''}${p.bodyStyle ? ` style="${esc(p.bodyStyle)}"` : ''}>
${p.body}${tail}
</body>
</html>`;
}
