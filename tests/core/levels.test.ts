import { describe, expect, it } from 'vitest';
import { levelFromXp, levelProgress, unlocksAt, xpForLevel } from '../../src/core/rules';

describe('levels', () => {
  it('needs more XP for every next level', () => {
    for (let level = 1; level < 30; level++) expect(xpForLevel(level + 1)).toBeGreaterThan(xpForLevel(level));
  });

  it('starts at level 1 with no XP', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(levelFromXp(0)).toBe(1);
  });

  it('is the exact inverse of xpForLevel at every boundary', () => {
    for (let level = 1; level <= 40; level++) {
      const xp = xpForLevel(level);
      expect(levelFromXp(xp)).toBe(level);
      if (xp > 0) expect(levelFromXp(xp - 1)).toBe(level - 1);
    }
  });

  it('never goes below level 1, even with broken data', () => {
    expect(levelFromXp(-100)).toBe(1);
  });

  it('reports progress inside the current level', () => {
    const p = levelProgress(xpForLevel(3) + 10);
    expect(p.level).toBe(3);
    expect(p.into).toBe(10);
    expect(p.need).toBe(xpForLevel(4) - xpForLevel(3));
    expect(p.pct).toBeGreaterThan(0);
    expect(p.pct).toBeLessThan(1);
  });

  it('unlocks something new at every level up to 15', () => {
    for (let level = 2; level <= 15; level++) expect(unlocksAt(level).length, `level ${level}`).toBeGreaterThan(0);
  });
});
