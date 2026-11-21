import { CITY, DECOR, FURNITURE, HOUSES, THEMES, UPGRADE_LEVEL, landSize } from '../catalog';
import { GROUPS } from '../design';

/** Total XP needed to reach a level: L2 = 60, L3 = 160, L4 = 300… */
export const xpForLevel = (level: number) => 20 * (level - 1) * (level + 1);

/** Inverse of `xpForLevel`. */
export const levelFromXp = (xp: number) => Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 20 + 1) + 1e-9));

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const from = xpForLevel(level);
  const need = xpForLevel(level + 1) - from;
  const into = xp - from;
  return { level, into, need, pct: into / need };
}

export interface Unlock {
  emoji: string;
  name: string;
  detail?: string;
}

/** Everything that becomes available at `level`. Names are in English; the UI translates them. */
export function unlocksAt(level: number): Unlock[] {
  const at = <T extends { level: number }>(list: T[]) => list.filter((item) => item.level === level);
  return [
    ...at(HOUSES).map((h) => ({ emoji: h.emoji, name: h.name, detail: h.web })),
    ...at(CITY).map((c) => ({ emoji: c.emoji, name: c.name })),
    ...at(FURNITURE).map((f) => ({ emoji: f.emoji, name: f.name, detail: f.web })),
    ...at(DECOR).map((d) => ({ emoji: d.emoji, name: d.name })),
    ...at(THEMES).map((t) => ({ emoji: t.emoji, name: t.name, detail: 'Town style' })),
    ...at(GROUPS).map((g) => ({ emoji: g.emoji, name: g.tool, detail: g.name })),
    ...(level === UPGRADE_LEVEL ? [{ emoji: '⬆️', name: 'Building upgrades' }] : []),
    ...(landSize(level) > landSize(level - 1) ? [{ emoji: '🗺️', name: 'More land to build on' }] : []),
  ];
}
