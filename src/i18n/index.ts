import type { Lang } from '../core/types';
import { FA } from './fa';

export type { Lang };

export const LANGUAGES: { id: Lang; name: string; dir: 'ltr' | 'rtl' }[] = [
  { id: 'en', name: 'English', dir: 'ltr' },
  { id: 'fa', name: 'فارسی', dir: 'rtl' },
];

const DICTIONARIES: Record<Lang, Record<string, string>> = { en: {}, fa: FA };
const DIGITS: Record<Lang, string | null> = { en: null, fa: '۰۱۲۳۴۵۶۷۸۹' };

let current: Lang = 'en';

export const getLang = () => current;
export const isRtl = () => LANGUAGES.find((l) => l.id === current)?.dir === 'rtl';

export function setLang(lang: Lang) {
  current = lang;
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.documentElement.dir = isRtl() ? 'rtl' : 'ltr';
}

/** Writes a number with the current language's digits. */
export function num(value: number | string): string {
  const digits = DIGITS[current];
  return digits ? String(value).replace(/\d/g, (d) => digits[Number(d)]) : String(value);
}

/**
 * Translates an English sentence. Unknown sentences stay in English, so nothing
 * ever shows up empty. `{name}` placeholders are filled from `vars`.
 */
export function t(text: string, vars?: Record<string, string | number>): string {
  const translated = DICTIONARIES[current][text] ?? text;
  if (!vars) return translated;
  return translated.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    if (value === undefined) return match;
    return typeof value === 'number' ? num(value) : value;
  });
}
