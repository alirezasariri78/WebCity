import { resolveImage, type ThemeDef } from '../core/catalog';
import { backgroundCSS, customCss, styleVars } from '../core/design';
import type { Town } from '../core/types';
import baseCss from './base.css?raw';

function themeVars(theme: ThemeDef): string {
  const s = theme.site;
  return [
    `--bg:${s.bg}`,
    `--surface:${s.surface}`,
    `--text:${s.text}`,
    `--muted:${s.muted}`,
    `--primary:${s.primary}`,
    `--primary-text:${s.primaryText}`,
    `--accent:${s.accent}`,
    `--hero-from:${s.heroFrom}`,
    `--hero-to:${s.heroTo}`,
    `--radius:${s.radius}`,
    `--font:${s.font}`,
    `--heading:${s.headingFont}`,
  ].join(';');
}

/** The full stylesheet: theme colours, site-wide design overrides, then the shared base styles. */
export function siteCSS(theme: ThemeDef, town?: Town): string {
  const site = town?.style;
  const rootVars = [themeVars(theme), styleVars(site)].filter(Boolean).join(';');
  const background = backgroundCSS({ bg: site?.bg, bg2: site?.bg2 }, resolveImage);
  const custom = customCss(site);
  return [`:root{${rootVars}}`, baseCss, background ? `body{${background}}` : '', custom ? `body{${custom}}` : '']
    .filter(Boolean)
    .join('\n');
}
