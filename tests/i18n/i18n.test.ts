import { afterEach, describe, expect, it } from 'vitest';
import { getLang, isRtl, num, setLang, t } from '../../src/i18n';
import { FA } from '../../src/i18n/fa';
import { allKeys, placeholders } from './keys';

afterEach(() => setLang('en'));

describe('translation helper', () => {
  it('returns English unchanged', () => {
    expect(t('Save ✓')).toBe('Save ✓');
  });

  it('fills placeholders and keeps unknown ones', () => {
    expect(t('Level {n}', { n: 3 })).toBe('Level 3');
    expect(t('Hello {who}')).toBe('Hello {who}');
  });

  it('switches to Persian, right to left, with Persian digits', () => {
    setLang('fa');
    expect(getLang()).toBe('fa');
    expect(isRtl()).toBe(true);
    expect(document.documentElement.dir).toBe('rtl');
    expect(num(2026)).toBe('۲۰۲۶');
    expect(t('Level {n}', { n: 12 })).toBe(FA['Level {n}'].replace('{n}', '۱۲'));
  });

  it('falls back to English for sentences without a translation', () => {
    setLang('fa');
    expect(t('This sentence is not in the dictionary')).toBe('This sentence is not in the dictionary');
  });
});

describe('Persian dictionary', () => {
  const keys = allKeys();

  it('finds the strings to check', () => {
    expect(keys.length).toBeGreaterThan(300);
  });

  it('translates every sentence the game shows', () => {
    const missing = keys.filter((key) => !(key in FA));
    expect(missing).toEqual([]);
  });

  it('keeps the same {placeholders} in every translation', () => {
    for (const [english, persian] of Object.entries(FA)) expect(placeholders(persian), english).toEqual(placeholders(english));
  });

  it('has no empty translations', () => {
    for (const [english, persian] of Object.entries(FA)) expect(persian.trim(), english).not.toBe('');
  });
});
