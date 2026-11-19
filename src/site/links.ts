import type { House, Town } from '../core/types';
import { slugify } from './text';

export const HOME_FILE = 'index.html';

/** Website menu order: Town Hall first, then oldest to newest. */
export function orderedHouses(town: Town): House[] {
  const rank = (h: House) => (h.kind === 'townhall' ? -Infinity : h.builtAt);
  return [...town.houses].sort((a, b) => rank(a) - rank(b));
}

/** Gives every house a unique file name: index.html, about-me.html, about-me-2.html… */
export function fileNames(town: Town): Map<string, string> {
  const names = new Map<string, string>();
  const used = new Set(['index']);
  for (const house of orderedHouses(town)) {
    if (house.kind === 'townhall') {
      names.set(house.id, HOME_FILE);
      continue;
    }
    const base = slugify(house.name) === 'index' ? 'page' : slugify(house.name);
    let name = base;
    for (let n = 2; used.has(name); n++) name = `${base}-${n}`;
    used.add(name);
    names.set(house.id, `${name}.html`);
  }
  return names;
}

const EMAIL = /^[\w.+-]+@[\w-]+\.[\w.]+$/;
const PHONE = /^\+?[\d\s()-]{6,}$/;
const HAS_SCHEME = /^(https?:|mailto:|tel:)/i;
const UNSAFE_SCHEME = /^\s*(javascript|data|vbscript):/i;

/**
 * Turns what the player typed into a safe link:
 * "page:<id>" → that page, emails → mailto, phone numbers → tel, "#x" → anchor, bare domains → https.
 */
export function resolveHref(link: string | undefined, files: Map<string, string>): string {
  const value = link?.trim();
  if (!value || UNSAFE_SCHEME.test(value)) return '#';
  if (value.startsWith('page:')) return files.get(value.slice(5)) ?? '#';
  if (value.startsWith('#')) return value;
  if (EMAIL.test(value)) return `mailto:${value}`;
  if (PHONE.test(value)) return `tel:${value.replace(/[^\d+]/g, '')}`;
  return HAS_SCHEME.test(value) ? value : `https://${value}`;
}

export function youtubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return match ? match[1] : null;
}
