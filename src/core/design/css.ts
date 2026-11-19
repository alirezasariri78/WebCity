import type { StyleProps } from '../types';
import { fontByName } from './fonts';

const WIDTHS: Record<string, string> = { narrow: '680px', normal: '980px', wide: '1200px', full: '100%' };

const SHADOWS: Record<string, string> = {
  0: 'none',
  1: '0 1px 2px rgba(0,0,0,.05),0 4px 12px -6px rgba(0,0,0,.12)',
  2: '0 1px 2px rgba(0,0,0,.04),0 12px 32px -16px rgba(0,0,0,.18)',
  3: '0 2px 4px rgba(0,0,0,.08),0 24px 50px -18px rgba(0,0,0,.38)',
  4: '0 0 0 1px color-mix(in srgb,var(--primary) 30%,transparent),0 10px 40px -8px color-mix(in srgb,var(--primary) 55%,transparent)',
};

const hasValue = (v: string | undefined): v is string => v !== undefined && v !== '';

/** Removes characters that could break out of a CSS declaration or HTML attribute. */
export const sanitizeCss = (value: string) => value.replace(/[;{}<>"]/g, '');

/** Black or white, whichever is easier to read on top of `hex`. */
export function contrastText(hex: string): string {
  const digits = hex.replace('#', '');
  if (digits.length < 6) return '#ffffff';
  const n = parseInt(digits.slice(0, 6), 16);
  const luminance = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return luminance > 160 ? '#111111' : '#ffffff';
}

/** CSS custom properties for one style layer (everything except the background). */
export function styleVars(s: StyleProps | undefined): string {
  if (!s) return '';
  const vars: [string, string][] = [];
  const set = (name: string, value: string) => vars.push([name, value]);

  if (s.text) {
    set('--text', s.text);
    set('--muted', `color-mix(in srgb,${s.text} 68%,transparent)`);
  }
  if (s.accent) {
    set('--primary', s.accent);
    set('--primary-text', contrastText(s.accent));
  }
  if (s.surface) set('--surface', s.surface);
  if (hasValue(s.radius)) set('--radius', `${Number(s.radius)}px`);
  if (hasValue(s.btnRadius)) set('--btn-radius', Number(s.btnRadius) >= 40 ? '999px' : `${Number(s.btnRadius)}px`);
  if (s.shadow) set('--shadow', SHADOWS[s.shadow] ?? SHADOWS[2]);
  if (hasValue(s.border)) set('--border-w', `${Number(s.border)}px`);
  if (s.borderColor) set('--border-c', s.borderColor);
  if (hasValue(s.pad)) set('--gap', `${Number(s.pad)}px`);
  if (s.width) set('--wrap', WIDTHS[s.width] ?? WIDTHS.normal);
  const body = fontByName(s.font);
  if (body) set('--font', body.stack);
  const heading = fontByName(s.headingFont);
  if (heading) set('--heading', heading.stack);
  if (s.size) set('--hscale', String(Number(s.size) / 100));
  if (s.weight) set('--hweight', s.weight);
  if (s.spacing) set('--hspacing', `${Number(s.spacing)}px`);

  return vars.map(([name, value]) => `${name}:${sanitizeCss(value)}`).join(';');
}

/** Background declaration: picture (with darkening), gradient, or plain colour. */
export function backgroundCSS(s: StyleProps | undefined, resolveImage: (src: string) => string): string {
  if (!s) return '';
  const layers: string[] = [];
  if (s.bgImage) {
    const darkness = (hasValue(s.overlay) ? Number(s.overlay) : 40) / 100;
    const url = resolveImage(s.bgImage).replace(/"/g, '%22');
    layers.push(`linear-gradient(rgba(0,0,0,${darkness}),rgba(0,0,0,${darkness})),url("${url}") center/cover`);
  }
  if (s.bg && s.bg2) layers.push(`linear-gradient(135deg,${sanitizeCss(s.bg)},${sanitizeCss(s.bg2)})`);
  else if (s.bg) layers.push(sanitizeCss(s.bg));
  return layers.length ? `background:${layers.join(',')}` : '';
}

export function styleClasses(s: StyleProps | undefined): string[] {
  if (!s) return [];
  const classes: string[] = [];
  if (s.align) classes.push(`al-${s.align}`);
  if (s.pattern && s.pattern !== 'none') classes.push(`pat-${s.pattern}`);
  if (s.inputs) classes.push(`in-${s.inputs}`);
  if (s.anim && s.anim !== 'none') classes.push('reveal', `rv-${s.anim}`);
  if (s.hideMobile === '1') classes.push('hide-m');
  if (s.bgImage) classes.push('on-image');
  return classes;
}

export function fontsUsed(s: StyleProps | undefined): string[] {
  if (!s) return [];
  return [s.font, s.headingFont].filter((name): name is string => !!fontByName(name));
}

export const isStyled = (s: StyleProps | undefined) => !!s && Object.values(s).some(hasValue);

export const customCss = (s: StyleProps | undefined) => (s?.css ? s.css.replace(/[<>{}"]/g, '') : '');
